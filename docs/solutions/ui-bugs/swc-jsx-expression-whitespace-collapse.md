---
title: SWC/Turbopack drops the space between a JSX {expression} and adjacent text
date: 2026-05-31
category: ui-bugs
module: Marketing site — JSX text rendering (footer copyright)
problem_type: ui_bug
component: tooling
symptoms:
  - Footer copyright rendered as "2026Let's" with no space between the year and the brand name
  - JSX source clearly had the space ({year} then a space then text) but the rendered DOM textContent did not
root_cause: wrong_api
resolution_type: code_fix
severity: low
tags: [nextjs, swc, turbopack, jsx, whitespace, react, footer]
---

# SWC/Turbopack drops the space between a JSX {expression} and adjacent text

## Problem
A footer line written as `© {new Date().getFullYear()} Let's Dog.` rendered in the browser as `© 2026Let's Dog.` — the space between the year expression and the following word was silently dropped. The source unambiguously contained the space.

## Symptoms
- Footer copyright displayed `2026Let's Dog` instead of `2026 Let's Dog`.
- `document.querySelector(...).textContent` confirmed the character after `2026` was `L` (charCode 76), not a space (32).
- The space *before* the expression (`© ` then `{year}`) was preserved; only the space *after* the expression was lost.

## What Didn't Work
- **Assuming the source was already correct.** The JSX had a literal space between `}` and `Let`, and standard Babel JSX preserves a single space between an expression and same-line text — so the initial assumption was "the live code already renders the space; the missing space is only in the design mockup." Verifying the actual rendered DOM (not the screenshot, not the source) disproved this.

## Solution
Insert an explicit JSX whitespace expression `{" "}` between the `{expression}` and the text:

```tsx
// Before — space silently collapsed by SWC/Turbopack:
© {new Date().getFullYear()} Let&apos;s dog. Alle rechten voorbehouden.

// After — explicit, always-rendered space:
© {new Date().getFullYear()}{" "}Let&apos;s dog. Alle rechten voorbehouden.
```

Verify the fix in the rendered DOM, not the source or a screenshot:

```js
[...document.querySelectorAll('footer p')]
  .find(e => e.textContent.includes('rechten voorbehouden'))
  .textContent.includes('2026 Let'); // → true
```

## Why This Works
Next.js (16) with Turbopack compiles JSX via **SWC**, whose JSX-whitespace handling differs from Babel's in this edge case: the literal inline whitespace between an `{expression}` container and an adjacent same-line `JSXText` node is collapsed rather than preserved. `{" "}` is an explicit string-literal child, not collapsible inline whitespace, so it always renders. This is a render-time/tooling behavior — `next build` succeeds and TypeScript is happy; the defect is only visible in the output.

## Prevention
- For any `{expr} word` in JSX **text** context (dynamic year, name, count followed by a word), use an explicit `{" "}` separator instead of relying on a literal inline space.
- Trust the rendered DOM over the source/mockup when a spacing/whitespace defect is reported — measure with `textContent` / charCodes.
- Quick audit for the risky pattern (text context only — attribute whitespace is irrelevant):
  ```bash
  grep -rn ')} [A-Za-zÀ-ÿ]\|]} [A-Za-zÀ-ÿ]' app components | grep -v 'className\|=>'
  ```

## Related Issues
- HANDOFF.md "Common gotchas" #8 (same gotcha, quick-reference form).
- Surfaced during PR #16 (website fixes bundle), footer copyright item.
