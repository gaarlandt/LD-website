---
title: Reading URL query params client-side under Next.js static export
date: 2026-06-17
category: design-patterns
module: Marketing site — static-export client islands (app/rassenkeuze)
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - Reading URL query/search params in a Next.js static-export app (output "export")
  - Building a client island that needs browser-only state on a prerendered page
  - Choosing between useSearchParams() and window.location for query reading
tags: [nextjs-static-export, use-client, window-location-search, usesearchparams, hydration, suspense, client-island]
---

# Reading URL query params client-side under Next.js static export

## Context

This site is a Next.js static export (`output: "export"`): every page is prerendered to HTML at build time, with no server request at runtime — so server-side `searchParams` are never available. When a client island needs the page's own URL query string (the trigger here: forwarding BreedSelector quiz-result params from `/rassenkeuze/?q1=…` into the embedded `keuzehulp.letsdog.nl` iframe `src`), it has to read the query in the browser.

The obvious tool — `useSearchParams()` — has two traps under static export, and before this work the repo had **no** client-side query reading anywhere (no `window.location.search`, `useSearchParams`, or `Suspense` usage in `app/`, `components/`, or `lib/`), so there was no precedent to copy. This documents the pattern so the next person doesn't re-derive it.

## Guidance

Read `window.location.search` inside a `useEffect` — **not** `useSearchParams()`. Keep the page a Server Component (so it can still `export const metadata`) and extract only the browser-dependent part into a `"use client"` child, mirroring the existing `app/contact/` + `app/veelgestelde-vragen/` server-page + client-child split.

Use this hydration-safe shape:

1. Initialize the derived state to `null`.
2. Compute it from `window.location.search` inside a `useEffect` (runs only after mount, client-only).
3. Render a **same-dimension placeholder** until the value is set, then render the real content.

```tsx
"use client";
import { useEffect, useState } from "react";

export function Embed() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search); // strips leading "?" itself
    params.set("source", "website");
    setSrc(`https://keuzehulp.letsdog.nl/?${params.toString()}`);
  }, []);

  return src
    ? <iframe src={src} className="w-full min-h-[700px] border-0" loading="lazy" />
    : <div className="w-full min-h-[700px]" aria-hidden="true" />; // same-height placeholder
}
```

## Why This Matters

- **`useSearchParams()` forces a Suspense boundary under `output: "export"`** — a build-time requirement; miss the `<Suspense>` wrapper and `next build` fails. `window.location.search` needs no boundary.
- **Reading `window.*` during render breaks prerender** (`window` is undefined at build time) and risks a hydration mismatch. Reading it in `useEffect` (post-mount) means the server HTML and the first client render are computed identically (both see the `null`/placeholder branch), so they agree.
- **The `null → placeholder → value` sequence** is what keeps server and first-client render identical (no "text content did not match" hydration error) and, for swapped-in content like an iframe, avoids a double-load / layout shift (no fresh-content flash before the real `src` arrives).

## When to Apply

- Any client island on a static-export page that needs the URL query, hash, or other browser-only globals.
- When you'd reach for `useSearchParams()` but the page is statically exported — prefer this instead unless you're willing to add and maintain a `<Suspense>` boundary.
- Not needed for server-readable data: under static export there's no server request, so this is the only way to get per-visit URL state.

## Examples

**Before (the trap):**
```tsx
"use client";
import { useSearchParams } from "next/navigation";
// Requires a <Suspense> wrapper at the call site or `next build` errors,
// and returns empty during prerender then populates on hydration.
const params = useSearchParams();
```

**After (this pattern):** see `app/rassenkeuze/rassenkeuze-embed.tsx` — reads `window.location.search` in `useEffect`, gates the iframe render on a computed `src`, falls back to a same-height placeholder pre-mount. Verified: no hydration warnings, no double-load, `next build` clean. (PR #44, commit `445487b`.)

## Related

- [`docs/solutions/integration-issues/design-system-into-nextjs-static-export.md`](../integration-issues/design-system-into-nextjs-static-export.md) — `"use client"` boundary mechanics under static export, and the rule that `next build` is the source of truth over the Turbopack dev overlay.
- Server-page + client-child split precedent: `app/contact/page.tsx` → `contact-content.tsx`, `app/veelgestelde-vragen/page.tsx` → `faq-content.tsx`.
