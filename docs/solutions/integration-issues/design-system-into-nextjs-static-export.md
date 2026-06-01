---
title: Wiring a shadcn/Radix design system into a Next.js static-export app
date: 2026-06-01
category: integration-issues
module: Marketing site — design system integration (components/ui, app/ld-tokens.css, app/ld-components.css)
problem_type: integration_issue
component: tooling
symptoms:
  - "`React.Children.only expected to receive a single React element child` — /prijzen returned HTTP 500 after a `<Button asChild>` wrapped a link"
  - "DS components fell back to a system font because `--ld-font-body: 'DM Sans'` never resolved (next/font registers a hashed family, not the literal `DM Sans`)"
  - "Turbopack dev kept serving the crashed module after the fix (HMR didn't invalidate) while `next build` was already clean"
root_cause: incomplete_setup
resolution_type: code_fix
severity: medium
tags: [design-system, shadcn, radix-slot, nextjs-static-export, phosphor, next-font, tailwind-v4]
---

# Wiring a shadcn/Radix design system into a Next.js static-export app

## Problem
Dropping a delivered shadcn-style (CVA + Radix) component library + `.ld-*` token CSS into the Next.js 16 (`output: "export"`) marketing site surfaced five integration issues — one of which 500'd the page — none caught by the delivered library (which shipped un-typechecked).

## Symptoms
- `React.Children.only expected to receive a single React element child` → `/prijzen` 500 once a CTA used `<Button asChild><a>…</a></Button>`.
- DS components rendered in the system font (DM Sans never applied).
- After fixing the Button, the Turbopack dev server kept rendering the error (same digest); `next build` was already green.

## What Didn't Work
- Reloading the dev page after the Button fix — Turbopack had cached the poisoned module, so the error persisted unchanged. Restarting the dev server cleared it.
- Trusting the dev overlay's stack — it was "ignore-listed frames" with no location. The `next build` result + reasoning about the only `asChild` usage pinpointed it.

## Solution
1. **Radix `Slot` requires exactly one child.** The delivered `Button` injected a loading-spinner sibling even when `asChild`, so `Slot` got `[spinner, child]`. Branch on `asChild`:
   ```tsx
   if (asChild)
     return <Slot className={classes} {...props}>{children}</Slot>; // single child; no spinner, no `disabled`
   return (
     <button className={classes} disabled={disabled || loading} {...props}>
       {loading ? <span className="ld-btn__spinner" aria-hidden /> : null}
       {children}
     </button>
   );
   ```
2. **Phosphor in RSC / static export** — import from the SSR entry so icons don't need a client context:
   ```ts
   import { Check, Star } from "@phosphor-icons/react/dist/ssr";
   ```
3. **Bind the body-font token to next/font.** next/font exposes a CSS variable holding a hashed family name, not the literal `DM Sans`, so the token must reference the variable:
   ```css
   --ld-font-body: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
   ```
   and register a `@font-face` for the display family the design system names (here `'National 2'`, with the space).
4. **Wire additively.** Import only the `:root { --ld-* }` token vars + the `.ld-*` classes. OMIT the design system's global element rules (`body`, `h1–h6`, `*`) and its auto `prefers-color-scheme` dark block, so a light-only site isn't restyled. Mark any Radix-driven component (`accordion`, dialog, …) `"use client"`; server components may still render them.
5. **Restart Turbopack after a render-error fix.** A module that threw during render can stay cached; HMR may not invalidate it. Restart the dev server — and treat `next build` as the source of truth.

## Why This Works
`Slot` clones its single child to merge props onto it; multiple children are ambiguous, hence `React.Children.only`. next/font hashes family names to scope them, so the literal name only resolves via the exposed `--font-*` variable. Keeping the token + class layer free of element selectors means the system styles only opted-in (`.ld-*`) elements, leaving the rest of the site untouched.

## Prevention
- For any `asChild`/Slot component, never render sibling content next to `{children}` — gate extras (spinners, icons) to the non-`asChild` branch. Run the project's real build (`npm run build`) on any delivered library before trusting it.
- In a static-export / RSC app, default Phosphor imports to `@phosphor-icons/react/dist/ssr`.
- When consuming a design system in Next.js: bind its font tokens to the app's `next/font` vars, register the display `@font-face`, and import its tokens/classes trimmed of global element rules.
- Treat `next build`, not the Turbopack dev overlay, as the integration source of truth.

## Related Issues
- PR #19 (`gaarlandt/LD-website`) — design-system trial / Pricing page conversion.
- Hand-off + brand-skill amendments: `~/Desktop/letsdog-design-system-HANDOFF.md` (incl. the accent-CTA rule change and the `peach` Button variant).
