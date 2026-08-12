---
title: "posthog.reset() clears the opt-out you just set — stopping on a refusal is order-dependent"
date: 2026-08-12
category: integration-issues
module: Marketing site — consent (components/analytics/posthog-provider.tsx, posthog-js)
problem_type: integration_issue
symptoms:
  - "After an explicit refusal of statistics, opt_out_capturing() ran and yet no opt-out key existed in localStorage or cookies"
  - "The visitor was opted back IN for the rest of the page, silently, with no error and no warning"
  - "Everything looked right in the code: the subscriber fired, the branch was taken, both SDK calls returned"
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags: [posthog, consent, gdpr, opt-out, legitimate-interest, sdk-ordering, silent-failure]
---

# posthog.reset() clears the opt-out you just set

## Problem

Building the "stop on an explicit refusal" half of PostHog's legitimate-interest
posture (T-24), the stop path did the obvious two things in the obvious order:

```ts
// WRONG — the second call undoes the first
if (!posthog.has_opted_out_capturing()) posthog.opt_out_capturing();
posthog.reset();
```

Read aloud this is unimpeachable: *stop capturing first so nothing can be flushed
while we clear, then drop the identifiers.* It is also backwards.

## Symptoms

Measured in the browser on 2026-08-12 with a stubbed Cookiebot recording an
explicit refusal (`statistics: false`, `method: "explicit"`):

| Observation | Value |
|---|---|
| `$last_posthog_reset` in the persistence blob | present — so `reset()` definitely ran |
| Any key matching `/opt/i` in `localStorage` | **none** |
| Any opt-out cookie | **none** |
| Net effect for the visitor | opted back **in** |

Nothing errored. Both SDK calls returned normally. The subscriber fired exactly
once, on the right event, with the right consent payload.

## Root cause

`reset()` does more than drop identifiers. From `posthog-js` 1.382.0's own bundle:

```js
reset(t){ … if(this.consent.reset(), null==(e=this.persistence)||e.clear(), …
```

`this.consent.reset()` is the same call that backs the public
`clear_opt_in_out_capturing()`. So `reset()` **is** an opt-out clear, among other
things. Meanwhile `opt_out_capturing()` only sets the flag:

```js
opt_out_capturing(){ … this.consent.optInOut(!1), …
```

Two calls, one of which quietly reverts the other. Order decides which wins.

## Solution

Reset first, opt out last:

```ts
// components/analytics/posthog-provider.tsx
if (!posthog.__loaded) return;   // never started: not starting IS the stop
posthog.reset();                 // drop identifiers (this also clears consent state)
posthog.opt_out_capturing();     // …so the opt-out has to come after it
```

The companion half is just as easy to miss in the other direction: an opt-out
**persists across page loads**, so the start path has to lift it, or re-allowing
statistics leaves PostHog permanently silent.

```ts
if (posthog.has_opted_out_capturing()) {
  posthog.opt_in_capturing({ captureEventName: false });
}
```

Verified by driving all four states and reading the SDK, not storage:

| Case | Expected | Measured |
|---|---|---|
| No recorded choice | runs (legitimate interest) | `__loaded: true`, `optedOut: false` |
| Statistics refused | stops | `optedOut: true` |
| Statistics re-allowed | resumes | `optedOut: false` |
| Refusal already in `ld_consent` at load | never initialises | `config.token: ""` |

## Why this was invisible

**Both failure directions look like success.** A cleared opt-out looks like a
working analytics install. A stuck opt-out looks like a working consent gate.
Neither logs anything, and the code reads correctly in both cases — which is why
this was found by reading the SDK's bundle after storage failed to show the key,
and not by reviewing the diff.

**Storage introspection is a weak instrument here.** The absence of an opt-out
key is ambiguous between "not written", "written elsewhere", and "written then
cleared". Exposing the client temporarily (`window.__ph = posthog`, removed
before commit) and asserting on `has_opted_out_capturing()` answered in one call
what several rounds of `Object.keys(localStorage)` could not.

## Prevention

**When two SDK calls both touch the same state, check whether one is a superset
of the other before choosing an order.** "Stop, then clean up" is the intuitive
sequence and it is wrong whenever the cleanup owns the stop flag. Grep the
bundle: it took one `grep -o "reset(t){…"` to settle it.

**A consent stop needs a resume test in the same sitting.** Testing only the
refusal proves the gate closes, never that it reopens — and a gate that cannot
reopen is indistinguishable from a working one until someone changes their mind
weeks later.

## Related

- The grounds this implements, and why it is a *stop* and not an opt-in gate:
  [`../../CLAUDE.md`](../../CLAUDE.md) → Analytics & Consent (legitimate interest, D-93 part C).
- The same "measure it, a CMP being installed proves nothing" rule that produced
  this fix: [cmp-autoblocker-cannot-block-a-runtime-injected-tag.md](./cmp-autoblocker-cannot-block-a-runtime-injected-tag.md).
- Why the refusal is read from the merged state of Cookiebot *and* `ld_consent`
  rather than from Cookiebot alone (an irreversible action must not read a source
  another subscriber is still correcting):
  [../logic-errors/two-writers-on-one-record-need-a-newest-wins-rule.md](../logic-errors/two-writers-on-one-record-need-a-newest-wins-rule.md).
