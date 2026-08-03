---
title: "A hostname-keyed click tracker silently ignores mailto: and tel: links"
date: 2026-08-03
category: logic-errors
module: Marketing site — CTA analytics (components/analytics/cta-tracker.tsx, lib/cta-destination.ts)
problem_type: logic_error
component: tooling
symptoms:
  - "No `cta_clicked` events for any mail CTA in GA4 or PostHog, with no console error and no failed request — the tracker simply never fired"
  - "`mailto:` links were unattributed sitewide, including the long-standing one on /contact, so the gap looked like normal low volume rather than a bug"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags: [analytics, cta-tracking, url-parsing, mailto, whatwg-url, ga4, posthog]
---

# A hostname-keyed click tracker silently ignores mailto: and tel: links

## Problem

`components/analytics/cta-tracker.tsx` is a delegated document click listener that attributes outbound CTA clicks. It resolved each anchor and classified it by host:

```ts
const url = new URL(anchor.href, window.location.origin);
let destination: string | undefined = TRACKED_HOSTS[url.hostname];
// …checkout / pricing refinements…
if (!destination) return;
```

Under the WHATWG URL parser, `mailto:` and `tel:` are **non-special schemes**: they parse fine, but `url.hostname` is the empty string. `TRACKED_HOSTS[""]` is `undefined`, so every mail and phone CTA hit `if (!destination) return;` and emitted nothing.

It failed **open and silent** — no exception, no warning, no failed request. The only observable was an absence of data, which is indistinguishable from "nobody clicked".

## Why it stayed hidden

The site's one pre-existing mail CTA (`mailto:mail@letsdog.nl` on `/contact`) had never been tracked, so there was no before/after to notice. The blind spot only surfaced when a new page — `/partners`, whose entire conversion funnel is a single `mailto:creators@letsdog.nl` — made "zero mail clicks, ever" an obviously wrong number.

## Solution

Two changes. First, the branch has to run **before** the host lookup, because the host lookup can never match a URL whose hostname is empty:

```ts
export function resolveCtaDestination(url: URL, currentHostname: string): string | undefined {
  if (url.protocol === "mailto:") return "email";   // ← must precede the lookup
  let destination: string | undefined = TRACKED_HOSTS[url.hostname];
  // …unchanged checkout / pricing refinements…
  return destination;
}
```

Second, the rules moved out of the client component into a pure helper (`lib/cta-destination.ts`, mirroring the `lib/prod-hosts.ts` precedent) so they are unit-testable off the DOM. The tests were written **before** the logic moved, pinning all four pre-existing destinations (`app`, `checkout`, `keuzehulp`, `pricing`), which is what made the extraction provably behaviour-preserving rather than hopefully so.

One test encodes the *reason* for the ordering, so a future refactor that reorders the branches fails loudly instead of silently regressing:

```ts
it("mailto resolves even though its hostname is empty", () => {
  const url = new URL("mailto:creators@letsdog.nl");
  expect(url.hostname).toBe("");
  expect(resolveCtaDestination(url, "letsdog.nl")).toBe("email");
});
```

## The generalisable rule

**Any link-attribution rule keyed on `url.hostname` has this blind spot for every non-special scheme** — `mailto:`, `tel:`, `sms:`, `data:`, `blob:`. The bug class is "a URL-shaped input that parses successfully but whose hostname is empty", and because the classifier's fall-through is `return`, it fails open: you get silence, not an error.

When you see a click tracker, redirect guard, or allowlist that switches on `.hostname`, ask which schemes reach it. Branch on `url.protocol` first for the ones that carry their target in the path rather than the host.

## Prevention

Assert the empty-hostname fact in the test suite rather than only in a comment (see the snippet above). A comment explaining "this must come first" is advisory; a test that constructs the URL, asserts `hostname === ""`, and then asserts the classification is what actually stops the regression.

## Side effect worth knowing

The fix is **sitewide, not page-local**: `/contact`'s long-standing mailto now emits `cta_clicked` too. `link_destination` gained the value `"email"` — that field is a registered GA4 custom dimension, where adding a new *value* is fine but renaming the dimension is not. Recorded in [`docs/analytics-events.md`](../../analytics-events.md), which is the reference to update whenever an event or dimension value changes.
