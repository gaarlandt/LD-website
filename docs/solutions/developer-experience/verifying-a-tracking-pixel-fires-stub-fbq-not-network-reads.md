---
title: "Verify a tracking pixel by stubbing fbq, not by reading the network"
date: 2026-08-07
problem_type: developer_experience
category: developer-experience
module: analytics
component: development_workflow
severity: medium
tags:
  - "meta-pixel"
  - "fbevents"
  - "analytics"
  - "verification"
  - "resource-timing"
  - "false-negative"
applies_when: "You need to prove a third-party tracking pixel (Meta/fbevents, and likely any vendor tag that batches or dedupes) fires the right events, and you are checking on localhost or a preview host rather than in the vendor's own tooling"
---

## Context

While installing the Meta Pixel (`components/analytics/meta-pixel.tsx` + `lib/meta-events.ts`), the obvious way to prove a conversion event fires was to click the real CTA and look for the outgoing request to `facebook.com/tr`. That check reported **nothing fired** — repeatedly, on a page where the code was in fact correct.

Chasing it produced a string of wrong theories: Cookiebot's auto-blocker was holding the pixel, the CSP was blocking the endpoint, the code never called `fbq`. All three were false. What was actually happening is that `fbevents.js` stops emitting on repeat sends within a page/browser session, so **every network-shaped check returns a false negative** once you have loaded the page a few times.

This is the same family as [preview-throttles-intersection-observer-and-smooth-scroll.md](preview-throttles-intersection-observer-and-smooth-scroll.md): the verification environment misreports, and a check that *looks* rigorous is worse than no check because it reads as evidence.

## Guidance

**Split the claim in two, and use a different tool for each half.**

1. **"Does our code call the pixel with the right payload?"** — stub `window.fbq`, trigger the real interaction, assert on the recorded arguments. This is fully under your control and cannot be suppressed by the vendor:

   ```js
   const real = window.fbq;
   const calls = [];
   window.fbq = function (...args) { calls.push(args); return real.apply(this, args); };
   Object.assign(window.fbq, real);   // fbevents hangs state off the function object

   // Trigger the real thing. preventDefault on capture keeps the page put
   // without stopping React's onClick from running.
   const block = (e) => e.preventDefault();
   document.addEventListener('click', block, true);
   document.querySelector('a[href*="add-to-cart=2233"]').click();
   // ...then inspect `calls`, restore window.fbq, remove the listener.
   ```

   This returned the exact mapped payload — `["track","InitiateCheckout",{currency:"EUR",value:59,content_ids:["2233"],…}]` — on the same page load where the network check saw nothing.

2. **"Did the event reach the vendor?"** — that is the vendor's tooling, not yours. Use the **Meta Pixel Helper** extension or **Events Manager → Test Events**, on the Cloudflare preview URL. Do not try to infer delivery from the browser.

**Before trusting a negative network result, prove the measurement works.** Fire a known-good request through the same path and confirm your instrument sees it:

```js
new Image().src = 'https://www.facebook.com/tr/?id=SPYTEST&ev=SpyCheck';
```

If that shows up in `performance.getEntriesByType('resource')` and the pixel's own call does not, the endpoint is reachable, the instrument works, and the silence is the vendor's — not a bug in your code. Also check the buffer is not simply full (`performance.getEntriesByType('resource').length` against the 250-entry default cap) before reading anything into an absence.

## Why This Matters

Analytics is a silent-failure surface: nothing crashes, events are just missing, and nobody notices until ad spend has been optimised against bad data. That makes the *verification method* load-bearing in a way it normally isn't — and here the intuitive method is actively misleading in both directions:

- **False negative** (what happened): correct code reported as broken, sending you off to "fix" Cookiebot, the CSP, and the component wiring in turn.
- **False positive** (the mirror risk): one lucky first load shows a `PageView` beacon and you declare the whole integration verified, including conversion events you never actually observed.

The stub-based check has neither failure mode, because it measures the boundary you own.

## When to Apply

- Verifying any Meta Pixel / `fbevents.js` integration outside Meta's own tooling.
- Likely any vendor tag that batches, dedupes, or rate-limits sends (this was confirmed for `fbevents.js` only — the mechanism behind Meta's suppression was never established, just its effect).
- Any time an analytics network check reports an absence: prove the instrument first, then believe the result.

## Examples

Observed on the dev server while building this feature, all in one sitting:

| Check | Result | Truth |
|---|---|---|
| First load of `/`, read resource timing | `PageView` beacon present | correct |
| Soft nav `/` → `/prijzen/` | second `PageView` with the new URL | correct |
| Reloads of `/prijzen/`, read resource timing | no beacons at all | **false negative** |
| `fbq('track','InitiateCheckout',…)` called by hand, spies on `sendBeacon`/`fetch`/XHR/`Image.src` | nothing captured | **false negative** |
| Manual `new Image().src` to the same endpoint | captured | instrument works |
| Cookiebot marketing consent granted, retry | still nothing | Cookiebot was not the cause |
| **Stub `window.fbq`, click the real CTA** | **full mapped payload recorded** | **correct, and repeatable** |

The last row is the only check that was both correct and repeatable, which is what makes it the one worth writing down.
