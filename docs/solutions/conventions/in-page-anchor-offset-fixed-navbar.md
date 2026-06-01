---
title: "In-page #anchor jump-links under a fixed navbar — use one global scroll-padding-top, not per-target scroll-margin-top"
date: 2026-06-01
category: conventions
module: app/globals.css
problem_type: convention
component: tooling
severity: medium
applies_when:
  - "Adding an in-page #anchor jump-link (jump-nav card, table-of-contents, or skip-to-content link)"
  - "A section heading lands hidden behind the fixed navbar when reached via a # link"
  - "Supporting cold-load deep-links to a #fragment (a shared or bookmarked /page#section URL)"
tags: [scroll-padding-top, anchor, smooth-scroll, fixed-navbar, deep-link, accessibility, css]
---

# In-page #anchor jump-links under a fixed navbar — use one global scroll-padding-top

## Context

The site has a **`fixed` navbar** (`h-16 lg:h-20` → 64px mobile / 80px desktop) and a global `html { scroll-behavior: smooth }` in `app/globals.css`. Before the over-ons + FAQ redesign there was **no scroll offset anywhere** — the lone `#quiz` anchor on `/rassenkeuze` and the `#main-content` skip-link both had none — so any in-page jump-link scrolled the target flush to the viewport top, leaving its heading hidden behind the navbar. The FAQ redesign added a category-overview card whose rows jump to each section, which made the offset mandatory.

## Guidance

Add **one** global rule to `app/globals.css`, alongside the existing `scroll-behavior`:

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 6rem; /* 80px fixed navbar + breathing room */
}
```

This offsets **every** in-page anchor at once — FAQ jump-nav, the over-ons `#verhaal` ("Lees haar verhaal") CTA, the `#quiz` anchor, the `#main-content` skip-link, and any future one — on both click **and** cold-load deep-link. Do **not** sprinkle per-target `scroll-mt-*` / `scroll-margin-top` on each anchor element.

## Why This Matters

- **Cold-load deep-links are the failure mode click-testing misses.** Browsers commonly jump *instantly* on first load to a `/page#section` URL, and smooth-scroll does not reliably apply to load-time hash navigation. So the **offset**, not the smoothness, is what guarantees the heading clears the navbar. `scroll-padding-top` on the scroll container handles the cold-load case more reliably than per-target `scroll-margin-top`.
- **One line, DRY, future-proof.** Fixes all current and future anchors in a single place instead of requiring every author to remember a `scroll-mt-*` on each new target.
- **Reduced-motion needs no change.** The `prefers-reduced-motion` block (which flips `scroll-behavior` to `auto`) is untouched — the padding offset applies regardless of motion preference, so reduced-motion users still land correctly.

## When to Apply

- Any new in-page `#anchor` target (jump-nav, TOC, "skip to content").
- Any report of a heading clipping under the navbar after a jump-link.
- When a section must be shareable/bookmarkable via `/page#section`.

## Examples

```css
/* Before — heading hides under the 80px fixed navbar on jump + cold-load */
html { scroll-behavior: smooth; }

/* After — every in-page anchor clears the navbar, click and cold-load alike */
html { scroll-behavior: smooth; scroll-padding-top: 6rem; }
```

**Caveat — know your scroll container.** This works because the document root (`html`) is the scroll container here. If a future layout puts the page inside an ancestor with its own `overflow: auto/scroll`, the offset must move to *that* element (`scroll-padding-top` on the scrolling container, not `html`).

## Related

- `components/layout/navbar.tsx` — the `fixed h-16 lg:h-20` navbar whose height (80px desktop) sets the 6rem value.
- Hero pages use `pt-32` to clear the same fixed navbar — the static-layout analogue of this scroll offset.
