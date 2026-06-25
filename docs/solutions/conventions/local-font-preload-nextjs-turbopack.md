---
title: "Preload a local font in Next App Router: stable /public URL + React preload()"
date: 2026-06-25
category: conventions
module: Marketing site — root layout + global CSS (app/layout.tsx, app/globals.css)
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Preloading a self-hosted font declared via a hand-written @font-face (not next/font)
  - "Next.js App Router with Turbopack, output: export"
  - "You see a flash-of-unstyled-text on headings despite font-display: swap"
tags: [nextjs, turbopack, fonts, preload, font-face, fout, react-19, static-export]
---

# Preload a local font in Next App Router (stable URL + React 19 preload())

## Context
A self-hosted heading font (National2 OTF) declared with a hand-written
`@font-face` was FOUTing on the hero H1. The obvious fix — a
`<link rel="preload" href="/fonts/National2-Bold.otf">` — silently doesn't work,
for two separate reasons that only show up in the built output.

## Guidance
Two things must both be true for the preload to actually hint the font:

1. **The `@font-face` must reference a STABLE URL.** A relative
   `url("../public/fonts/X.otf")` is **content-hashed by Turbopack** to
   `/_next/static/media/X.<hash>.otf`, so a preload pointing at `/fonts/X.otf`
   never matches — the browser double-downloads and the FOUT stays. Point the
   `@font-face` at the absolute public path (public assets are served verbatim,
   unhashed):
   ```css
   /* app/globals.css */
   @font-face {
     font-family: "National2";
     src: url("/fonts/National2-Bold.otf") format("opentype"); /* NOT ../public/... */
     font-weight: 700; font-display: swap;
   }
   ```
2. **Emit the preload with React 19 `preload()`, not a raw `<link>`.** A raw
   `<link rel="preload">` in the App Router `<head>` gets **double-emitted** (the
   framework hoists a normalized copy beside yours). `preload()` injects one
   deduped tag:
   ```tsx
   // app/layout.tsx (Server Component)
   import { preload } from "react-dom";
   export default function RootLayout({ children }) {
     preload("/fonts/National2-Bold.otf", { as: "font", type: "font/otf", crossOrigin: "anonymous" });
     return (/* ... */);
   }
   ```

Preload only the weight that actually renders. Headings here are all 700, so
preload Bold only — the declared Medium (500) face had zero rendered usages, and
preloading it would just contend with the hero-image LCP.

## Why This Matters
- A preload whose URL doesn't match the `@font-face`'s real request is worse than
  nothing: the font downloads twice and still FOUTs.
- `crossOrigin: "anonymous"` is required — fonts are always fetched in CORS mode,
  so the preload must match (it renders as `crossorigin=""`, the anonymous state)
  or it won't be reused.
- Verify in the BUILD, not just source: grep the built HTML for the preload
  (expect exactly one) and the network panel for one font request and no
  `/_next/static/media/<font>` copy.

## When to Apply
Any self-hosted `@font-face` font (not managed by `next/font`) you want to
preload under Next App Router + Turbopack.

## Examples
Before: relative `@font-face` url + a raw `<link>` → two preloads in the HTML and
a hashed `_next/static/media` font fetch *plus* a `/fonts/` fetch. After: stable
`/fonts/` url + `preload()` → one preload, one fetch, headings paint in National2
with no flash.

## Related
- [vitest-bootstrap-next-static-export-cloudflare-pages](../developer-experience/vitest-bootstrap-next-static-export-cloudflare-pages.md) — same static-export / Turbopack build environment.
- [design-system-into-nextjs-static-export](../integration-issues/design-system-into-nextjs-static-export.md) — the National2 `@font-face` wiring.
