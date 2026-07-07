---
title: Headless preview throttles IntersectionObserver and smooth scroll — verify scroll-triggered events another way
date: 2026-06-08
last_updated: 2026-07-07
category: developer-experience
module: preview-verification / analytics
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - Verifying scroll- or visibility-triggered behavior (IntersectionObserver, lazy reveal, in-view analytics events) on the preview_* tools
  - An event or callback that should fire on scroll never fires during preview verification
  - A plain `window.addEventListener("scroll", ...)` handler (e.g. a fixed navbar's scrolled-state toggle) never fires after preview_eval scrolls the page
  - window.scrollTo appears to do nothing (scrollY stuck) inside preview_eval
  - Probing whether posthog-js initialized via window.posthog in the preview
  - preview_screenshot returns a flat, content-free frame at a scrolled desktop-width (≥1024px) viewport, even with an already-instant scroll and correct DOM geometry
tags: [preview, intersection-observer, requestanimationframe, smooth-scroll, scroll-event, verification, posthog, screenshot]
---

# Headless preview throttles IntersectionObserver and smooth scroll — verify scroll-triggered events another way

## Context

While verifying the funnel-analytics work (PR #35) on the local preview (`preview_start("letsdog-website")` → `next dev`, driven by a headless browser), a new `view_item_list` event — fired by an `IntersectionObserver` in `components/sections/pricing-view-tracker.tsx` when the `#prijzen` pricing section scrolls into view — never appeared in the GA4/PostHog network, even after scrolling the section fully into the viewport. Click-fired events (`cta_clicked`, `begin_checkout`) verified fine; only the scroll/visibility-triggered one was invisible. The cause was the preview environment, not the tracker.

## Guidance

The headless preview browser doesn't run the rendering/compositing steps that deliver `IntersectionObserver` callbacks, and it throttles/pauses `requestAnimationFrame`. Two consequences:

1. **Smooth scroll doesn't move.** `window.scrollTo(0, y)` leaves `scrollY` unchanged because the site sets `scroll-behavior: smooth` (here via the `scroll-padding-top` rule in `app/globals.css`), and smooth scrolling is rAF-driven. Force instant scroll in `preview_eval`:
   ```js
   document.documentElement.style.scrollBehavior = "auto";
   window.scrollTo({ top: y, left: 0, behavior: "auto" });
   ```
2. **`IntersectionObserver` callbacks never fire** — even with the target genuinely in the viewport. This is the environment, not your code.
3. **Plain `scroll` event listeners are equally silent, for the same root cause.** A component that toggles state from a bare `window.addEventListener("scroll", ...)` (no IntersectionObserver — e.g. a fixed navbar's `scrollY > N` check) will never see its handler fire after a `preview_eval` call to `window.scrollTo(...)`, because point 1 already established that `scrollY` never actually changes — no scroll happened, so no `scroll` event was ever dispatched. It isn't a *third*, separate throttling mechanism; it's the direct consequence of point 1. Apply the same fix (force instant scroll first), then, if you still need to prove the listener itself is wired correctly without waiting on a real scroll, dispatch a synthetic event directly: `window.dispatchEvent(new Event('scroll'))` after the `scrollTo` — this bypasses the question of whether a "real" scroll occurred and just exercises the handler.

**Confirm it's the environment (not a bug) with a control test.** Spawn a throwaway plain observer in `preview_eval`; if *it* doesn't fire while the element is in view, IO delivery is throttled here:
   ```js
   const sec = document.querySelector("#prijzen");
   let fired = false;
   new IntersectionObserver(() => { fired = true; }, { threshold: 0 }).observe(sec);
   await new Promise((r) => setTimeout(r, 1500));
   return fired; // false in the headless preview even when sec is in the viewport
   ```

**Verify each event type the way the environment allows:**

- **Click-triggered** (`cta_clicked`, `begin_checkout`): spy + synthetic click in `preview_eval` — reliable.
  ```js
  const calls = [];
  const og = window.gtag;
  window.gtag = (...a) => { if (a[0] === "event") calls.push([a[1], a[2]]); return og?.(...a); };
  document.addEventListener("click", (e) => e.preventDefault(), { capture: true }); // don't navigate away
  document.querySelector("a[href*='prijzen']").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  return calls;
  ```
- **Did it actually send?** Read the network instead of trusting a spy: the GA4 beacon `…/g/collect?…&en=<event_name>` and the PostHog ingest (`eu.i.posthog.com/e/`, `/i/v0/e/`). `performance.getEntriesByType("resource")` works, as does `preview_network`.
- **Scroll/visibility-triggered** (`view_item_list`): verify on a **real browser / the Cloudflare preview**, not `next dev`.

**Bonus gotcha — `window.posthog` is a false negative.** posthog-js (ES-module import, v1.382) does not synchronously mirror its singleton onto `window.posthog`, so `window.posthog?.__loaded` reads as `undefined`/false in `preview_eval` even when PostHog initialized fine. Confirm init via the network: `eu-assets.i.posthog.com/array/<phc_key>/config.js` → `flags/` → `/e/` batches.

**Bonus — below-the-fold screenshots.** For visual checks of below-the-fold sections, the same instant-scroll fix applies before `preview_screenshot`; or skip the screenshot and assert content via `preview_eval` / `preview_inspect`, which see the DOM regardless of paint/compositing state. For an image-only check, navigate straight to the asset (`window.location.href = "/images/x.png"`) — no scroll needed.

**Update 2026-07-07 — blank frames still happen, Framer removal did not fix it.** The line below originally claimed Framer-Motion's removal (2026-06-25) closed out the blank-frame issue. It didn't: reproduced again on a plain CSS Grid `order`-class reorder in `components/sections/hope.tsx` — no JS animation involved at all. Scroll was already instant (`scrollIntoView({behavior: 'instant'})`), and `getBoundingClientRect()` confirmed the target elements sat at the correct on-screen position — yet `preview_screenshot` still returned a flat, single-color frame with zero visible content. Pattern observed across repeated resizes/reloads: reproduced at scrollY beyond roughly 900px combined with a viewport width ≥1024px (tried 1024, 1100, 1280 — all blank); NOT reproduced at the same scrollY on a 768px tablet width, and NOT reproduced at shallow scroll (≤300px) on the same ≥1024px widths. A hard reload (`window.location.reload()`) did not clear it. Root cause is still unconfirmed (likely a separate paint/composite race in the screenshot capture path, unrelated to the rAF/IntersectionObserver throttling above) — no fix is known, only the workaround: **don't trust a blank `preview_screenshot` at a scrolled desktop viewport as ground truth.** Cross-check with `getBoundingClientRect` (exact `top`/`left`/`width`/`height` of the elements in question) or `preview_inspect` before concluding content is missing or broken — both read the DOM/layout directly and are unaffected by whatever is causing the capture to blank out. (Historically blank frames were also seen on Framer-Motion scroll-reveal sections pre-2026-06-25; that specific trigger is gone, but it was evidently not the only one.)

## Why This Matters

Without the control test, a scroll-triggered feature that "doesn't fire in the preview" reads as a bug — you burn time tweaking correct code (we briefly changed an `IntersectionObserver` threshold chasing a non-bug). Knowing the preview throttles IO + rAF turns a dead-end into a one-line confirmation and routes the real verification to a real browser. It also stops the `window.posthog` false-negative from masking a working integration.

## When to Apply

- Any preview verification of in-view / lazy / scroll-reveal behavior or analytics events.
- When `scrollY` won't budge inside `preview_eval` (smooth-scroll + throttled rAF).
- When probing whether a client SDK initialized in the preview.

## Related
- [`ga4-filter-staging-traffic-by-hostname.md`](ga4-filter-staging-traffic-by-hostname.md) — GA4 preview traffic is tagged `traffic_type=internal`; the Internal Traffic filter (when Active) also hides events from DebugView, so use the Network tab to confirm GA4 fires on the preview.
- Origin: funnel-analytics work (PR #35 — PostHog + dual-fire GA4/PostHog).
- 2026-07-07 correction origin: mobile Hope-section image reorder (PR #62) — desktop verification hit the blank-`preview_screenshot`-at-scroll issue on a page with no JS animations, disproving the "Framer removal fixed it" close-out note.
