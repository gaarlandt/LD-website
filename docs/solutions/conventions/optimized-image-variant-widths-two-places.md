---
title: "Responsive image widths live in TWO files — keep OptimizedImage and the generator in sync"
date: 2026-05-31
category: conventions
module: images
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Adding, removing, or changing a responsive width for site photography
  - Any change to the AVIF/WebP variant set served by OptimizedImage
  - A Lighthouse image over-delivery fix that adds a new variant width
tags: [images, performance, optimizedimage, srcset, sharp, gotcha, nextjs]
---

# Responsive image widths live in TWO files — keep OptimizedImage and the generator in sync

The responsive-image width list is duplicated across two files, and **both must
be edited together**. Changing only one silently breaks the change:

1. `scripts/optimize-images.mjs` — `WIDTHS` controls which AVIF/WebP variant
   files are **generated** into `public/images/optimized/`.
2. `components/shared/optimized-image.tsx` — `VARIANT_WIDTHS` controls which
   widths are **referenced in the `<picture>` srcset** that ships to the browser.

## Context

While adding a 512px responsive variant (a Lighthouse mobile over-delivery fix),
`512` was added to `WIDTHS` in `scripts/optimize-images.mjs`, the script was run,
and the new `*-512.avif` / `*-512.webp` files were committed. The change looked
complete — but in-browser the `<picture>` srcsets contained **zero** entries for
`-512`, and no `-512` file was ever requested by the browser. The generated
files were committed-but-dead.

Root cause: `OptimizedImage` carries its **own** hardcoded `VARIANT_WIDTHS`
array, independent of the generator script. The srcset is built from that array,
not from whatever files happen to exist on disk.

## Guidance

When changing the responsive width set, edit **both** files in the same commit:

```js
// scripts/optimize-images.mjs
const WIDTHS = [384, 512, 768, 1280];   // generates the variant files
```

```tsx
// components/shared/optimized-image.tsx
const VARIANT_WIDTHS = [384, 512, 768, 1280];   // builds the <picture> srcset
```

Then `npm run optimize:images`, commit the new `public/images/optimized/*`
variants, and **verify in-browser** that the srcset actually contains the new
width (e.g. check `picture source[srcset]` includes `-512`).

## Why This Matters

The two lists are a hidden coupling with no compile-time link between them — the
build passes whether or not they agree, and the only symptom is silently
oversized images served to users (the browser falls back to the next width up).
A perf fix that touches only the generator looks done, ships, and quietly does
nothing.

## When to Apply

- Any time you add, remove, or change a responsive width for site photography.
- This is the canonical "responsive image variant" change for this repo —
  treat "edit both files + regenerate + verify srcset" as the unit of work.

## Examples

Verification that the new width is actually served (run against the dev/preview
page, not just the file system):

```js
const srcs = [...document.querySelectorAll('picture source')].map(s => s.getAttribute('srcset') || '');
srcs.filter(s => s.includes('-512.')).length;   // must be > 0, not just "files exist on disk"
```
