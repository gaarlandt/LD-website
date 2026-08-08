---
title: A CMP's auto-blocker cannot block a tag that injects its own script
date: 2026-08-08
category: integration-issues
module: Marketing site — consent (components/analytics/meta-pixel.tsx, lib/consent.ts, Cookiebot)
problem_type: integration_issue
component: analytics
symptoms:
  - "With an explicit refusal recorded on letsdog.nl, Cookiebot deleted `_ga`, `_ga_0FCGXJHMMY` and PostHog's cookie but left `_fbp` standing, with `fbevents.js` still loaded and `window.fbq` still a function"
  - "The Meta Pixel did not appear in Cookiebot's own tag list at all — it knew only `uc.js`, `gtag` and a Next.js chunk"
  - "Nothing errored, nothing looked broken: the banner worked, the other trackers obeyed it, and only the pixel silently did not"
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags: [consent, cookiebot, cmp, meta-pixel, fbevents, gdpr, eprivacy, auto-blocking, google-consent-mode]
---

# A CMP's auto-blocker cannot block a tag that injects its own script

## Problem

The Meta Pixel was installed as a server-rendered inline `<script>` that, at runtime, builds
the `fbq` stub and then `createElement`s a second `<script src="…fbevents.js">`. Cookiebot was
present, in `data-blockingmode="auto"`, and was correctly gating everything else. The pixel
escaped it completely, and the code carried a comment confidently describing the fix as "add
`type="text/plain" data-cookieconsent="marketing"` to the script tag below" — which would not
have worked either.

## Symptoms

Measured in the browser on production, 2026-08-08, with a refusal recorded
(`Cookiebot.hasResponse` true, every category false, `method: "explicit"`):

| Cookie | After an explicit refusal |
|---|---|
| `_ga`, `_ga_0FCGXJHMMY` | deleted by Cookiebot |
| PostHog's `ph_…` | deleted by Cookiebot |
| `_fbp` | **still there**, and `fbevents.js` still loaded |

## What Didn't Work

**Assuming the auto-blocker covers every tag on the page.** It does not, and the reason is
mechanical rather than a misconfiguration: auto-blocking works by rewriting `<script>` elements
the CMP recognises in the markup it can see. A snippet that runs and *then* creates its own
script element hands the CMP nothing to rewrite. This is also why the pixel was missing from
Cookiebot's tag list: the CMP never saw a tag, so it never had one to classify. No amount of
dashboard configuration reaches it.

**Tagging the wrapper with `type="text/plain" data-cookieconsent="marketing"`** (the revert path
the old code comment recommended) is the same bet on the mechanism that had already failed here.
It would hold the *outer* snippet inert, but it re-couples correctness to the blocker recognising
and transforming our tag, and it gives no way at all to *stop* on withdrawal — the case the
regulation actually cares about most.

## Solution

Stop delegating the consent decision and own the lifecycle explicitly, reading the CMP's public
consent state instead of relying on its blocker. The tracker becomes a client component that
subscribes to consent and injects nothing until it is granted:

```tsx
// components/analytics/meta-pixel.tsx
return onCookiebotConsent((consent) => {
  if (consent?.m) loadMetaPixel(id);        // first request to connect.facebook.net happens HERE
  else revokeMetaPixel(window.location.hostname);
});
```

`loadMetaPixel` builds the `fbq` stub, appends the `fbevents.js` element, and calls
`fbq('consent','grant')` before `init`. `revokeMetaPixel` calls `fbq('consent','revoke')` — a
loaded `fbevents.js` cannot be unloaded, so Meta's own stop signal is the mechanism — and then
deletes the cookies the CMP would have deleted had it known about the tag:

```tsx
const domain = consentCookieDomain(hostname);   // ".letsdog.nl" on production, null elsewhere
for (const name of ["_fbp", "_fbc"]) {
  document.cookie = `${name}=; Max-Age=0; Path=/`;
  if (domain) document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}`;
}
```

The deletion needs the same `Domain` the cookie was written with, hence both attempts.

## Why This Works

The gate moves from "the CMP intercepts a tag" to "our code decides whether to make the request
at all". Before consent, `connect.facebook.net` is never contacted, so there is no third-party
request, no `_fbp`, and no data to retract. That is strictly stronger than tagging, which lets
the CMP decide at a layer that had already proven unable to see this tag.

It also survives the thing tagging cannot express. Guards elsewhere in the codebase read
`typeof window.fbq === "function"` to mean "we may send to Meta", and after a revoke that is
still true — `fbq` remains callable and Meta merely holds the events, which a later re-grant in
the same page would flush. Asking the CMP directly at the send site closes that:

```ts
// lib/analytics.ts
function metaConsentGranted(): boolean {
  return readCookiebotConsent()?.m === true;
}
```

## Prevention

**Never conclude a tracker is gated because a CMP is installed. Measure it.** Record a refusal,
then read `document.cookie` and the loaded scripts. The failure mode here is silent in both
directions: nothing errors, and a working banner next to three obedient trackers reads as proof.

**Check the CMP's own tag list.** A tracker missing from it is not gated, whatever the dashboard
implies — absence there is the cheapest available signal that auto-blocking cannot reach it.

**A withdrawal may not look like a refusal.** Cookiebot's `withdraw()` sets `hasResponse` back to
**false** rather than reporting an all-false choice, so "withdrew" and "never answered" are the
same observable state. Code keyed on `hasResponse` therefore skips the withdrawal path entirely
and silently — exactly the bug review caught on this branch, where the handover cookie would have
kept saying *granted* after the visitor took it back. Treat "no recorded choice" as a state a
subscriber must be told about, and separate it from "the CMP has not loaded yet", which is a
different thing and must not be acted on:

```ts
const deliver = (fromEvent: boolean) => {
  if (!window.Cookiebot) return;              // not loaded: know nothing, say nothing
  const consent = readCookiebotConsent();     // null = loaded, no recorded choice
  if (consent === null && !fromEvent) return; // only a real event may mean "withdrawn"
  handler(consent);
};
```

**Verify the granted path somewhere it can actually run.** Cookiebot's banner does not render on
hosts outside its domain group, so on `*.pages.dev` previews `hasResponse` stays false forever
and consent can never be granted through the UI. Drive `Cookiebot.submitCustomConsent(p, s, m)`
— the same public API the banner calls — or stub `window.Cookiebot` and dispatch
`CookiebotOnConsentReady` / `OnAccept` / `OnDecline` to exercise the subscriber.

For proving the pixel then fires with the right payload, use the stub-`fbq` method rather than
reading the network: see
[verifying-a-tracking-pixel-fires-stub-fbq-not-network-reads.md](../developer-experience/verifying-a-tracking-pixel-fires-stub-fbq-not-network-reads.md).
The two documents are halves of the same problem — this one is about whether the pixel is
*allowed* to fire, that one about whether it *did*.
