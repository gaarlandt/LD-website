---
title: "A shared record with two writers needs a merge rule, and absence is not an event"
date: 2026-08-08
category: logic-errors
module: Marketing site — consent handover (lib/consent.ts, components/analytics/consent-cookie.tsx, Cookiebot)
problem_type: logic_error
component: analytics
symptoms:
  - "The read-back of `ld_consent` never fired: `Cookiebot.submitCustomConsent` was called zero times even with a strictly newer refusal sitting in the cookie"
  - "A consent granted on mijn.letsdog.nl was rewritten to an explicit all-false refusal on the next visit to letsdog.nl, on Cookiebot's `OnLoad` event, without anyone withdrawing anything"
  - "Nothing errored in either case — the banner worked, the cookie was well-formed, and the platform read a choice that looked entirely plausible"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [consent, cookiebot, cmp, cross-host, shared-state, last-write-wins, gdpr, ld-consent]
---

# A shared record with two writers needs a merge rule, and absence is not an event

> **↑ promoted to contract.** The portable rules from this write-up now govern both halves of the
> consent chain and are stated canonically in the cross-knowledge hub:
> `/Users/jurriaan/Documents/Coding/ldcoding/LD - project cross knowledge/contracts/cross-host-consent-handover.md`
> (owner: **PF**, the Let's Dog platform on `mijn.letsdog.nl`). Read the contract before changing
> either side's consent writing; this doc stays as the war story and the measurements.

## Problem

`ld_consent` is a first-party cookie on `.letsdog.nl` carrying the visitor's consent choice
between this marketing site and the platform on `mijn.letsdog.nl`. It was built as a one-way
handover (loop item T-23): this site answers Cookiebot's banner and writes the cookie, the
platform reads it.

Then the platform's *Cookie preferences* screen started writing the same cookie, and this site
gained a read-back so a choice changed on the platform would take effect here too (loop item
T-26). Two independent writers, one record — and two inferences that were correct while there
was only one writer became silently wrong.

## Symptoms

Both failures are invisible from the outside. The cookie stays well-formed, the banner behaves,
and the platform reads a choice that looks like a real one.

1. **The read-back never fired.** With a refusal recorded on the platform at 08:00 and
   Cookiebot on this host still holding a grant from 06:00, `submitCustomConsent` was called
   zero times.
2. **A grant was turned into a refusal by nobody.** A visitor who granted consent on
   `mijn.letsdog.nl` and then opened `letsdog.nl`, where they had never answered the banner,
   had that grant rewritten to `{p:false, s:false, m:false}` stamped at the moment of the visit.

## What Didn't Work

The first implementation of the read-back was correct in isolation and did nothing in place. It
read the cookie, compared it with Cookiebot's state, and submitted when the cookie was newer —
but `ConsentCookie` and `ConsentSync` both subscribe to the same Cookiebot events, and React
runs effects in tree order. `ConsentCookie` ran first, saw a cookie that disagreed with
Cookiebot, and "corrected" the cookie. By the time `ConsentSync` looked, the disagreement it
exists to resolve had been erased half a millisecond earlier.

Reasoning about the two components in isolation could not surface this. What surfaced it was
driving the really-mounted tree in a browser and printing the cookie after each event.

## Solution

Two rules, both in `lib/consent.ts`.

**1. A writer never overwrites a strictly newer choice** (`writeConsentCookie`, lib/consent.ts:318).
The cookie is not this site's record of what Cookiebot thinks; it is the latest choice known on
*either* host.

```ts
const existing = readConsentCookie();
if (existing && isSameChoice(existing, payload)) return;
if (existing && isStrictlyNewer(existing, payload)) return;
document.cookie = buildConsentCookie(payload, hostname);
```

`isSameChoice` compares the version and the three categories and deliberately ignores the
timestamp (lib/consent.ts:263); `isStrictlyNewer` compares only the timestamp, answering `false`
on an unparseable one at either end (lib/consent.ts:275).

**2. A withdrawal is only a withdrawal if we saw the consent it took back**
(`createConsentRecorder`, lib/consent.ts:391). Cookiebot's `withdraw()` clears `hasResponse`, so
a withdrawal arrives as an *absence* — and "never answered on this host" is the same absence.
The distinguishing signal is a transition within one subscription:

```ts
export function createConsentRecorder(hostname: string) {
  let sawConsent = false;
  return (consent: ConsentPayload | null) => {
    if (consent) {
      sawConsent = true;
      writeConsentCookie(consent, hostname);
    } else if (sawConsent) {
      recordConsentWithdrawal(hostname);
    }
  };
}
```

## Why This Works

Rule 1 replaces "my view of the state is authoritative" with an explicit merge rule that every
writer applies — the same rule the platform already used for its own consent rows (only a
strictly newer choice is recorded). Because both writers now agree on it, the outcome no longer
depends on which one runs first, which is what makes the ordering bug unrepeatable rather than
merely fixed.

Rule 2 restores an inference that had quietly lost its basis. "A granting cookie plus no CMP
answer means a withdrawal" was sound while this site was the only writer: the cookie could only
have come from a Cookiebot answer here, so its disappearance meant a withdrawal. Once a second
host could write it, that premise was gone — the choice may have been made somewhere Cookiebot
was never involved. A withdrawal is a *transition* between two states, and no snapshot of one
state can prove a transition happened.

The two rules also compose into the property that keeps the read-back honest: a cookie written
here always carries Cookiebot's own timestamp (equal, so it loses rule 1), and a withdrawal
leaves Cookiebot with no response at all. So anything that gets past `consentCookieSupersedes`
(lib/consent.ts:446) must have been written by the other host — the site can never sync with
itself.

## Prevention

- **When a second writer appears on a shared record, re-read every inference the first writer
  made about it.** The dangerous ones are not the reads and writes; they are the sentences of the
  form "if the record says X then event Y must have happened". Those are claims about history, and
  a second writer invalidates them without touching a line of the first writer's code.
- **Give a shared record an explicit merge rule at every writer, not at one.** "Newest wins,
  compared on the field that records when the choice was made" is one line per writer and removes
  a whole class of ordering bugs. The alternative — being careful about mount order — is a rule
  nobody can see from inside either component.
- **Separate "what the record says" from "what happened".** In this codebase the split is
  `isSameChoice` / `isStrictlyNewer` (content versus recency) and `createConsentRecorder` (a
  sequence, not a snapshot). Keeping the sequence rule in a closure is what let a test pin it:

```ts
it("leaves a choice made elsewhere alone when nobody answered here", () => {
  const { writes } = stubCookieJar();
  writeConsentCookie(granted, "letsdog.nl");
  const record = createConsentRecorder("letsdog.nl");
  record(null);
  record(null);
  expect(writes).toHaveLength(1);
});
```

- **Verify this chain by driving the real component tree, not by reasoning about it.** Cookiebot's
  banner does not render on `*.pages.dev` (that host is not in the domain group) and localhost
  carries a placeholder CBID, so consent cannot be given in either place. Both bugs were found by
  replacing `window.Cookiebot` with a stub carrying its public surface
  (`hasResponse`, `consent`, `consentUTC`, `submitCustomConsent`), dispatching its own events
  (`CookiebotOnConsentReady`, `OnAccept`, `OnDecline`, `OnLoad`) on `window`, and reading
  `document.cookie` after each one. The interleaving of two subscribers is exactly what a unit
  test of either one cannot show.
- **Related:** [A CMP's auto-blocker cannot block a tag that injects its own script](../integration-issues/cmp-autoblocker-cannot-block-a-runtime-injected-tag.md)
  — the other half of the same consent chain, from T-23.
