---
title: Headless preview freezes CSS transitions mid-flight — getComputedStyle reports the pre-transition value
date: 2026-06-09
category: developer-experience
module: preview-verification / design-system
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - Verifying a UI state change that triggers a CSS transition (button variant swap, toggle, active/selected, dark mode) via the preview_* tools
  - getComputedStyle on a color/transform/opacity/box-shadow property reports the OLD value right after a state change, making a correct change look broken
  - Inspecting computed styles of a DS element whose class just changed under a `transition:` rule
tags: [preview, getcomputedstyle, css-transition, requestanimationframe, design-system, verification, gotcha]
---

# Headless preview freezes CSS transitions mid-flight — getComputedStyle reports the pre-transition value

## Context

While verifying the pricing-toggle redesign (PR #37) on the local preview (`preview_start("letsdog-website")` → `next dev`, driven by a headless browser), clicking the Maandelijks/Jaarlijks toggle swapped the CTA button from the peach (highlighted/yearly) variant to the secondary (monthly) variant. The DOM updated correctly — `className` became `ld-btn--secondary` and the source custom property `--_bg` resolved to `#efe8e4` (beige) — yet `getComputedStyle(cta).backgroundColor` still reported `rgb(255, 165, 128)` (peach). A correct change looked broken.

Root cause: `.ld-btn` carries `transition: … background 0.2s …` (`app/ld-components.css`), and the headless preview throttles/pauses `requestAnimationFrame` — the same root cause as the IntersectionObserver/smooth-scroll throttle (see Related). The in-flight background transition was frozen near its start value, so the computed longhand read the old color.

## Guidance

In the headless preview, **`getComputedStyle` on any property under a `transition:` rule is unreliable in the window right after a state change** — the rAF-driven interpolation is frozen mid-flight, so the value you read can sit anywhere between start and end (often the start). This affects `background` / `color` / `transform` / `opacity` / `box-shadow` — any animated property.

Two reliable workarounds:

1. **Read the source of truth, not the animated longhand.** The token-driven `.ld-*` button variants set a custom property (`--_bg`) that the longhand consumes; the custom property is *not* transitioned, so it flips instantly. Assert on it (or on `className`):
   ```js
   const cs = getComputedStyle(el);
   cs.getPropertyValue("--_bg").trim(); // "#efe8e4" — instant, correct
   el.className;                         // "ld-btn ld-btn--secondary ld-btn--pill"
   ```
2. **Force-settle the transition before reading the longhand.** Disable the transition, force a reflow, then read:
   ```js
   const before = getComputedStyle(el).backgroundColor; // rgb(255,165,128) — stale, mid-transition
   el.style.transition = "none";
   void el.offsetWidth;                                  // reflow so the (now-untransitioned) target paints
   const settled = getComputedStyle(el).backgroundColor; // rgb(239,232,228) = #efe8e4 — correct
   el.style.transition = "";
   ```

**Don't conclude "my change didn't apply" from a stale computed value on an animated property.** Confirm via the custom property / `className` first; force-settle only when you specifically need the resolved longhand.

## Why This Matters

A correct variant / toggle / theme change reads as a styling bug when the computed color lags. Without knowing the preview freezes transitions, you burn time re-checking correct cascade/variant logic (here the `ld-btn--secondary` class and `--_bg` were already right). The custom-property read turns it into a one-line confirmation. It's the design-system payoff working against you in the preview: the `.ld-*` variants deliberately drive color through `--_bg` consumed by longhands *so transitions animate smoothly* — which is exactly what makes the longhand read unreliable in a throttled environment.

## When to Apply

- Verifying any state-driven style change (button variant, toggle, active/selected state, dark mode) on the preview_* tools.
- When `getComputedStyle` on color/transform/opacity disagrees with the element's `className` or a token custom property right after an interaction.
- Inspecting DS (`.ld-*`) component styling — prefer the `--_*` custom property or the variant class as the assertion target.

## Related

- [`preview-throttles-intersection-observer-and-smooth-scroll.md`](preview-throttles-intersection-observer-and-smooth-scroll.md) — same throttled-rAF root cause; sibling manifestation (scroll/visibility events + smooth scroll don't fire/move).
- [`preview-screenshots-blank-on-scroll-reveal.md`](preview-screenshots-blank-on-scroll-reveal.md) — same environment; scroll-reveal content missing from screenshots; verify via DOM.
- [`tailwind-utilities-vs-unlayered-ds-classes.md`](tailwind-utilities-vs-unlayered-ds-classes.md) — the `.ld-*` variant cascade these buttons use (why the variant prop, not a utility, drives `--_bg`).
- Origin: pricing-toggle redesign (PR #37 — interactive Maandelijks/Jaarlijks card + €19,99 monthly).
