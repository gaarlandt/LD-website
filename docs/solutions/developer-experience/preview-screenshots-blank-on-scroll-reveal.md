---
title: "Preview-tool screenshots come back blank on Framer-Motion scroll-reveal sections"
date: 2026-06-03
category: developer-experience
module: development-workflow
problem_type: developer_experience
component: tooling
severity: low
related_components: [development_workflow]
applies_when:
  - Verifying below-the-fold homepage/marketing sections via the preview tool (preview_screenshot)
  - preview_screenshot returns a blank solid-colour frame while preview_snapshot/DOM confirms the content is present
  - The page uses Framer-Motion scroll-reveal (whileInView / opacity-0 until in view)
tags: [framer-motion, preview-tool, claude-preview, verification-workflow, scroll-reveal, screenshot]
---

# Preview-tool screenshots come back blank on Framer-Motion scroll-reveal sections

## Context

Verifying the homepage copy changes + the puppyagenda tooltip swap (PR #30) on the dev server via the preview MCP tool, every `preview_screenshot` of a below-the-fold section (Trust stats, Pricing, the puppyagenda progress section) came back as a **blank beige frame** — even though `preview_snapshot` and `preview_eval`/`preview_inspect` confirmed the content was in the DOM with the right text, sizes, and colours.

Two things compound to cause it:

1. **Framer-Motion scroll-reveal.** Most marketing sections animate in with a `whileInView` / opacity-0→1 reveal. Until a section is genuinely scrolled into view, its content sits at `opacity: 0` (blank). Framer also re-applies its inline `opacity`/`transform` on every animation frame, so **manually setting `el.style.opacity = '1'` does not stick** — Framer overwrites it on the next frame.
2. **Scroll vs capture timing.** A programmatic `window.scrollTo(...)` immediately followed by `preview_screenshot` tends to capture *before* the reveal's IntersectionObserver has fired and the ~0.5s fade has finished, so you photograph the opacity-0 state. `html { scroll-behavior: smooth }` (set globally in `app/globals.css`) makes it worse — an immediate `scrollY` read right after `scrollTo` returns ~0 because the smooth animation hasn't run.

Net effect: the screenshot looks empty and you start chasing a phantom rendering bug that isn't there.

## Guidance

**Don't rely on `preview_screenshot` alone to verify below-the-fold content on this site. Prefer DOM assertions; when you do need a screenshot, trigger the reveal first and wait for it.**

Three reliable approaches, cheapest first:

**(a) Verify via the DOM — most reliable, no animation involved.** `preview_eval` / `preview_inspect` see content regardless of opacity:

```js
// confirm the trust-stats grid + medal icon without a screenshot
(() => {
  const cells = [...document.querySelectorAll('#bewijs .grid')[0].children];
  return cells.map(c => ({ text: c.innerText, hasSvg: !!c.querySelector('svg') }));
})()
```

**(b) Trigger the reveal, then wait, then screenshot.** Use an async `preview_eval` that disables smooth scroll, scrolls to the element's absolute top, and `await`s ~1s so the IntersectionObserver fires and the fade completes. Once triggered, Framer leaves the section at opacity 1 (reveals are usually `once`), so the subsequent `preview_screenshot` is clean:

```js
(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  const el = [...document.querySelectorAll('h2')]
    .find(e => e.innerText.includes('Zie precies waar je staat')).closest('section');
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 40, behavior: 'instant' });
  await new Promise(r => setTimeout(r, 1100));   // let the reveal finish
  return getComputedStyle(el).opacity;           // expect "1" before screenshotting
})()
```

**(c) For an image-only check, screenshot the raw asset URL.** Navigating straight to the file has no reveal and no scroll:

```js
window.location.href = '/images/pa-tooltip.png';   // then preview_screenshot
```

## Why This Matters

A blank screenshot reads as "the component didn't render" — but the DOM proof shows it did. Without knowing the cause you can burn several turns re-reading source, re-scrolling, and re-shooting. The site is built on Framer-Motion reveals across most marketing sections, so this recurs for anyone verifying homepage / puppyagenda / pricing changes through the preview tool. Asserting on the DOM (or trigger-then-wait) turns a 10-minute detour into a 30-second check.

## When to Apply

- Any visual verification of below-the-fold sections on the marketing site via the preview tool.
- Whenever `preview_screenshot` shows a solid-colour / blank frame but `preview_snapshot` lists the expected content.
- Before concluding "the section isn't rendering" — check `getComputedStyle(el).opacity` first; `0` means it's a reveal that hasn't triggered, not a bug.

## Examples

```
Symptom:  preview_screenshot of #bewijs (Trust) → blank beige frame
Check:    preview_eval → getComputedStyle(section).opacity === "0"   (reveal not triggered)
Fix:      async preview_eval: scrollTo(section) + await 1100ms → opacity "1" → screenshot
Fallback: assert content via preview_inspect / preview_eval and skip the screenshot
```

## Related

- `docs/solutions/developer-experience/one-worktree-per-claude-session.md` — the preview server runs from the per-session worktree.
- `docs/solutions/developer-experience/fresh-worktree-needs-npm-install.md` — getting that preview server to start at all (worktree `node_modules`).
- `docs/website-spec-maintenance.md` — the broader verify-after-change workflow; the preview tool is the local half of it.
