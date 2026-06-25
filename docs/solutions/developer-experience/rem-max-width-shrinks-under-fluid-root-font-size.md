---
title: rem-based max-widths shrink under the fluid root font-size and misalign with fixed-px containers
date: 2026-06-04
category: developer-experience
module: Marketing site — responsive layout / widths (components/sections, components/ui/layout.tsx, app/globals.css)
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - Adding a discrete card/banner/box that should visually align with the footer or other fixed-width chrome
  - A user reports an element looks off-center or slim/indented but it measures perfectly centered
  - Choosing between a Tailwind max-w-* utility and the shared Container / .ld-container for a homepage element
  - Debugging any layout that looks correct at >=1440px but wrong on narrower screens
tags: [tailwind-v4, rem-units, fluid-font-size, responsive-layout, max-width, ld-container, centering, 1440-breakpoint]
---

# rem-based max-widths shrink under the fluid root font-size and misalign with fixed-px containers

## Context

The rassenkeuze cross-sell banner (`components/sections/rassenkeuze-strip.tsx`) looked off-center and "slim/indented" to the user, but every measurement (dev server, local production build, isolated screenshots) said it was perfectly centered — equal left/right margins, no horizontal overflow. The disagreement survived a private window (so not cache).

The cause is an interaction between two things that are individually fine:

- **The site has a fluid root font-size** — `app/globals.css`: `html { font-size: 85% }` below 1440px, and `100%` at `@media (min-width: 1440px)`.
- **Tailwind `max-w-*` utilities are rem-based**, so they scale with the root font-size. `max-w-7xl` (80rem) is **1280px at ≥1440px but only ~1088px below 1440px**.
- **The shared design-system container is fixed-px** — `.ld-container` (used by `<Container>` and the footer) is `--ld-container: 1200px` (`app/ld-tokens.css`), which does **not** scale.

So below 1440px the discrete banner (`max-w-7xl`, ~1088px) became ~112px narrower and more indented than the fixed-width footer right below it (1200px). It was mathematically centered, but visibly misaligned with its neighbor — which reads as "not centered."

## Guidance

- For a **discrete element that must align with the footer or other fixed-px chrome**, use the shared `<Container>` (fixed 1200px) — not a rem-based `max-w-*`. Then it lines up at every viewport and doesn't shrink with the root font-size.
- For **full-bleed sections** (colored background spans the viewport, only the inner content centers), `max-w-7xl` is fine — the shrink is invisible because there are no discrete edges to compare against. This is why the homepage's full-bleed sections looked fine while only the bordered blue card stood out.
- Remember that **every** rem-based length (`max-w-*`, `p-*`, `text-*`, `gap-*`) changes absolute size across the 1440px breakpoint. Don't assume a `px`-looking Tailwind class is actually fixed px.

## Why This Matters

- A centered-but-narrower element reads as off-center next to a wider neighbor. This produces "it's not centered" bug reports that measure as centered — frustrating and slow to diagnose if you don't know about the breakpoint.
- It's easy to "fix" the wrong thing: the instinct is to touch `mx-auto`/centering, but the real lever is the **width system** (rem vs fixed-px), not the centering.

## When to Apply

- Placing a card/banner that should sit flush with the footer or other fixed-width chrome.
- A "looks off-center but measures fine" report.
- Any responsive bug that behaves differently above vs below 1440px.

## Examples

Before — shrinks below 1440px, narrower than the footer:

```tsx
<section className="bg-white px-6 lg:px-8 py-16 lg:py-20">
  <div className="max-w-7xl mx-auto">{/* ~1088px below 1440px, 1280px above */}
    <div className="...card...">…</div>
  </div>
</section>
```

After — fixed 1200px, aligns with the footer at every viewport:

```tsx
<section className="bg-white py-16 lg:py-20">
  <Container>{/* .ld-container — fixed 1200px, doesn't scale with root font-size */}
    <div className="...card...">…</div>
  </Container>
</section>
```

Debugging tip — **reproduce at the user's actual viewport, not a convenient one.** Browser chrome (Vivaldi/Arc vertical sidebars) shrinks the *web viewport* below the window width, pushing users under the 1440px breakpoint you'd assume they're above. Always test both sides of the breakpoint — e.g. `preview_resize` to 1366 (root 85%) and 1920 (root 100%) — and compare the element's computed width/margins against a fixed-px neighbor (the footer's `.ld-container`), not just its own left/right gaps.

## Related

- [tailwind-utilities-vs-unlayered-ds-classes.md](../developer-experience/tailwind-utilities-vs-unlayered-ds-classes.md) — sibling Tailwind-vs-design-system cascade gotcha
- [preview-throttles-intersection-observer-and-smooth-scroll.md](../developer-experience/preview-throttles-intersection-observer-and-smooth-scroll.md) — why to verify layout/visibility via computed styles & DOM, not raw screenshots, in the headless preview
- Source: `components/sections/rassenkeuze-strip.tsx` (the fix), `app/globals.css` (the 85%/100% root font-size), `components/ui/layout.tsx` + `app/ld-tokens.css` (`.ld-container` fixed 1200px). Origin: PR #32.
- **Cross-project candidate:** if other Let's Dog apps use a fluid root font-size, the same rem-vs-fixed-px alignment drift applies — worth promoting to the cross-knowledge hub.
