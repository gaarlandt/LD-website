---
title: "Deferred state-reset timer wipes a live dialog on fast close→reopen"
date: 2026-06-25
category: design-patterns
module: Marketing site — contact form modal (app/contact/contact-form-modal.tsx)
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - A modal defers a transient-state reset with setTimeout on close (to avoid a flash during the close transition)
  - The dialog's open state is parent-controlled, so reopening does NOT route back through the close handler
  - The reset clears state a freshly-reopened dialog depends on (a captcha token, form status, field errors)
tags: [react, modal, radix-dialog, settimeout, useref, race-condition, turnstile, cross-project]
---

# Deferred state-reset timer wipes a live dialog on fast close→reopen

## Context
The contact modal resets transient state (`status`, `errors`, the Turnstile
`token`) 250 ms after close, so the reset isn't visible during the close
transition. A user who closes and **reopens within 250 ms** hits a race: the
still-pending timer fires on the now-live dialog and wipes the freshly-rendered
widget's token, leaving submit permanently disabled on an open form.

This is a general shape — any deferred-cleanup timer armed on close can land on a
reopened instance. It is a **cross-project** candidate: Puppy Agenda and
BreedSelector modals that reset state on close likely share it.

## Guidance
Store the timer handle in a `useRef` and cancel it on every path that can race it:

```tsx
const resetTimerRef = useRef<number | null>(null);

function handleOpenChange(next: boolean) {
  if (next) return;
  onClose();
  if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current); // re-entry guard
  resetTimerRef.current = window.setTimeout(() => {
    resetTimerRef.current = null;
    setStatus("idle"); setErrors({}); setToken("");
  }, 250);
}

// Cancel on REOPEN. Reopen is parent-driven (the `open` prop), so it does NOT go
// through handleOpenChange — this effect is the actual fix. Guarded on `open` so
// it never clears the timer the closing render just armed.
useEffect(() => {
  if (open && resetTimerRef.current !== null) {
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }
}, [open]);

// Don't let a pending reset fire after the component unmounts.
useEffect(() => () => {
  if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
}, []);
```

## Why This Matters
The intuitive fix — "clear the timer on re-entry of the close handler" — does NOT
work when `open` is parent-controlled: reopening sets the prop from outside, so
the close handler never runs on reopen. The load-bearing cancel is the
`[open]`-keyed effect. It must be guarded on `open` (act only when true): a plain
`[open]` cleanup that cleared unconditionally would also clear the timer the
*closing* render just armed, defeating the reset entirely.

## When to Apply
- Any `setTimeout` that mutates React state and is armed in an event handler (not
  an effect), where the component can re-render into a state that depends on the
  to-be-cleared values before the timer fires.
- Especially modals / dialogs / popovers with a close-transition-deferred reset.

## Examples
Before (the bug): a bare `window.setTimeout(reset, 250)` in the close handler —
close, reopen at +60 ms, the fresh widget issues a token at ~+150 ms, the stale
timer fires at +250 ms and wipes it → submit disabled on a live dialog.

After: the ref + `[open]`-effect cancel above. Verified by closing and reopening
inside the window and confirming the token survives and submit stays enabled
(the full open→close→reopen cycle on a hard reload, not just "does it open").

## Related
- [Framer Motion modal won't close — AnimatePresence stable key](../ui-bugs/framer-motion-animatepresence-stable-key.md) — same modal file; the "verify the full open→close→reopen cycle" discipline.
- [Turnstile on a Cloudflare Pages Function](../conventions/turnstile-on-cloudflare-pages-function.md) — the single-use token lifecycle this race wipes.
- Pairs with [Map a server's field-error codes onto field-level UI](server-field-error-to-field-ui-mapping.md) (same hardening PR).
