---
title: "National2 as the single sitewide typeface — brand-guide drift went unreconciled for months"
date: 2026-07-03
category: conventions
module: Typography (app/globals.css, app/ld-tokens.css, app/layout.tsx)
problem_type: convention
component: design-system
severity: medium
applies_when:
  - "Adding or auditing a font/typeface choice against the brand-guide-letsdog skill"
  - "A CLAUDE.md stack line (font, color, convention) hasn't been checked against the current brand guide in a while"
  - "Onboarding a design-system change from one Let's Dog app into another"
tags: [typography, national2, brand-guide, design-system, drift, fonts]
---

# National2 as the single sitewide typeface — brand-guide drift went unreconciled for months

> **↑ Promoted to a cross-project contract:** `…/LD - project cross knowledge/contracts/national2-single-typeface.md`
> The rule below governs every Let's Dog surface, not just this repo — read the contract before
> touching typography in BreedSelector or Puppy Agenda too.

## Problem

The `brand-guide-letsdog` skill's typography rule is unambiguous: **"Eén typeface: National 2
(sans)... één familie voor display én body"** — one typeface, for both headings and body text,
site-wide. This site's code did not match that rule: headings used National2 (a local, self-hosted
OTF), body text used DM Sans (Google Fonts, loaded via `next/font/google`). CLAUDE.md's own stack
line documented the split as if it were correct: `National2 (headings, local OTF), DM Sans (body,
Google Fonts)`.

The split predates the brand guide's own correction. The brand guide's changelog shows the rule
flipped from "National 2 = display, DM Sans = body" to "one typeface, National 2, for both" on
2026-05-06 — but a site-migration plan written **after** that date
(`docs/plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md`, requirement BR1) still
described the *old* two-typeface split as the target, and the code was never reconciled against
the *new* rule. The drift wasn't caught by a build error or a visual bug — DM Sans rendered
perfectly well on its own terms, it just wasn't what the brand guide (as of a month earlier) said
to use.

## Solution

1. **Treat the brand-guide skill as the source of truth, not the project's own CLAUDE.md stack
   line.** CLAUDE.md documents what the code *currently does*; the brand guide documents what it
   *should* do. When they disagree, the brand guide wins — CLAUDE.md's line was simply stale,
   carried forward from before the brand guide's May correction.
2. **Fixed by binding every font-family CSS variable to one registered family.** `--font-heading` /
   `--font-body` (in `app/globals.css`'s `@theme inline` block) and `--ld-font-display` /
   `--ld-font-body` (in `app/ld-tokens.css`) all now resolve to the same `"National2"` string —
   simplified to `--font-body: var(--font-heading);` / `--ld-font-body: var(--ld-font-display);`
   so there's one source of truth, not two independently-maintained copies of the same font stack.
3. **Added the missing weight.** National2 was only registered at 500/700 (`@font-face` in
   `globals.css`) — no Regular (400), because nothing needed it while DM Sans handled body text.
   The Regular `.ttf` file already existed in `public/fonts/`, just wasn't wired into a
   `@font-face` rule. Added it, and made sure it's `preload()`-ed in `app/layout.tsx` alongside
   Bold, since body copy is now render-critical on every page (not just headings).
4. **Audited every place a weight the font doesn't have (600/semibold) was requested.** National2
   ships 400/500/700 only, no 600. Three shared component classes (`.ld-avatar`, `.ld-eyebrow`,
   `.ld-alert__title` in `app/ld-components.css`) requested `font-weight: 600` with no real face to
   back it — the browser would silently substitute the nearest available real weight. Moved all
   three to 700 explicitly rather than leaving that to browser-specific substitution.
5. **Removed the now-dead `next/font/google` DM_Sans loader** entirely from `app/layout.tsx`, and
   grepped the whole repo for stray `DM Sans`/`dm-sans`/`DM_Sans` references to make sure nothing
   orphaned pointed at the deleted `--font-dm-sans` CSS variable.

## Why This Matters

A brand-guide correction doesn't automatically propagate into a sibling app's or even the same
app's own code — nothing *breaks* when a stale two-typeface assumption just keeps working on its
own terms. The gap only surfaces when someone reads the brand guide fresh and asks "does the code
still match this?" That's a periodic-audit problem, not a one-time-fix problem: any Let's Dog app
that adopted the design system (or a piece of the brand guide) before a given brand correction can
carry the same silent drift, indefinitely, until someone checks.

## When to Apply

- Before trusting a project's own CLAUDE.md/docs description of a design-system choice (color,
  font, spacing) — cross-check it against the *current* `brand-guide-letsdog` skill state, since
  the project doc may just be describing what was true when it was last touched.
- When wiring a Let's Dog design-system token (`--ld-*`) to an actual loaded font/asset in a new
  app — bind it to the literal registered family string (see the related, distinct gotcha in
  `docs/solutions/integration-issues/design-system-into-nextjs-static-export.md` about a token
  silently failing to resolve when it references a name that was never actually `@font-face`-
  registered in *this* app).
- Periodically (e.g. after any brand-guide changelog entry) — check whether a stack line elsewhere
  (CLAUDE.md, a design-system token file) has quietly gone stale relative to it.

## Related

- The contract: `…/LD - project cross knowledge/contracts/national2-single-typeface.md`
- `docs/solutions/integration-issues/design-system-into-nextjs-static-export.md` — the sibling
  gotcha about a font token binding to an unregistered family name (same failure class, different
  cause: that one is about the *string* not matching a registration; this one is about the rule
  itself having changed and not been re-applied).
- `docs/solutions/developer-experience/subsetting-national2-to-woff2.md` — the performance
  follow-up once National2 became a body font too (unsubset OTF/TTF payload grew from
  headings-only to sitewide).
- PR #60 (`gaarlandt/LD-website`) — the code fix this doc describes.
