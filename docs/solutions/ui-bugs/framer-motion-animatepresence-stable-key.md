---
title: "Framer Motion modal won't close — AnimatePresence child needs a stable key"
date: 2026-05-31
category: ui-bugs
module: Marketing site — contact form modal (app/contact/contact-form-modal.tsx)
problem_type: ui_bug
component: tooling
symptoms:
  - Modal opens and animates in, but no close path (X button, Escape, backdrop click) removes it from the DOM
  - "State-flip side-effects still run (e.g. body scroll-lock cleanup resets overflow) yet the [role=\"dialog\"] node stays mounted"
  - No console error; reproduces on a clean hard-reload so it is not an HMR artifact
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags: [framer-motion, react, modal, animation, animatepresence, nextjs]
---

# Framer Motion modal won't close — AnimatePresence child needs a stable key

A modal/dialog built with `<AnimatePresence>` wrapping a conditionally-rendered
`<motion.div>` **opens but never closes**. Clicking the close button, pressing
Escape, and clicking the backdrop all run their handlers, but the dialog node
stays mounted in the DOM.

## Symptoms

- The modal appears on open and animates in correctly.
- Every close path (X button, `Escape`, backdrop click) fails — the dialog
  remains in the DOM.
- **The tell:** side-effects of the `open` state flipping to `false` DO run —
  e.g. a `useEffect` cleanup that restores `document.body.style.overflow`
  executes, so `bodyOverflow` resets to empty — yet `document.querySelector('[role="dialog"]')` is still truthy. React updated the state; the element just never unmounted.
- **No console error.** This is presence-tracking, not a crash.
- Reproduces on a clean hard-reload (so it is NOT a Fast Refresh / HMR
  state artifact — rule that out by hard-navigating before concluding).

## What Didn't Work

- Verifying the close handler logic (`onClose`, `setOpen(false)`, focus return)
  — the handlers were all correct and firing.
- Suspecting HMR — a clean `window.location.href` reload reproduced it
  identically, proving it was a real bug.

## Solution

Give the conditionally-rendered child of `AnimatePresence` a stable `key`:

```tsx
// Before — no key: AnimatePresence can't track the exit/unmount
<AnimatePresence>
  {open && (
    <motion.div className="fixed inset-0 …" initial={…} animate={…} exit={…}>
      …
    </motion.div>
  )}
</AnimatePresence>

// After — stable key lets AnimatePresence track presence and unmount on exit
<AnimatePresence>
  {open && (
    <motion.div key="contact-modal" className="fixed inset-0 …" initial={…} animate={…} exit={…}>
      …
    </motion.div>
  )}
</AnimatePresence>
```

(See `app/contact/contact-form-modal.tsx`, PR #17.)

## Why This Works

`AnimatePresence` tracks its children by `key` to know which ones are entering
and which are exiting. When the single child is gated by `{open && …}` with no
`key`, toggling `open` to `false` removes the child from the render output, but
`AnimatePresence` has no stable identity to match against its previous render —
so it fails to drive the exit animation and the unmount that follows it, leaving
the node stranded in the DOM. A stable `key` gives it that identity, so it can
run the `exit` transition and then unmount.

## Prevention

- **Always put a stable `key` on a `motion.*` element rendered directly inside
  `AnimatePresence`** — even when there's only one child and it's gated by a
  boolean. It's free and prevents this class of bug.
- When verifying modal/animation behavior, **test the full open → close → reopen
  cycle on a clean reload**, not just "does it open". A modal that opens is only
  half-verified.
- Watch for the diagnostic signature: state-flip side-effects fire but the node
  persists → suspect presence/key, not your handler logic.
