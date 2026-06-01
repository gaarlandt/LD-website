# Handoff — Brand-guide v2 site migration

**Created:** 2026-06-01
**Status:** Planned · owner-approved · **not started**.
**Plan (source of truth):** [`docs/plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md`](plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md) — read it first.
**How to execute:** `/new-feature`, **one PR per phase**, **Phase 0 first**. (`/ce-work` is the alternative for driving a phase unit-by-unit.)

---

## What this is
Migrate the whole Let's Dog marketing site (**except `puppyagenda`**) onto the brand-guide **v2** design system: full DS component adoption + `--ld-*` tokens + the v2 brand rules. Today only `/prijzen` is converted; everything else is raw Tailwind + hardcoded hex. **Visual/design-system only — no copy changes.**

## Start here (new session)
1. Open a **new `/new-feature` session in its own git worktree** (one-worktree-per-session — see `docs/solutions/developer-experience/one-worktree-per-claude-session.md`).
2. Read the plan. Do **Phase 0 first** — it unblocks everything else:
   - **U1** — add Eyebrow tones: `tone="onGreen"` (white) + `tone="brand"` (green).
   - **U2** — vendor the contact-form DS components (`Field`/`Input`/`Textarea`/`Label`/`Dialog`) + `@radix-ui/react-dialog` & `@radix-ui/react-label`.
   - **U3** — DS hygiene: fix the stale `button.tsx` comment, add `.ld-card` reduced-motion, **reconcile the `'National 2'` (DS) vs `"National2"` (app) font-family** so DS headings resolve the right face.
   - **U4** — extract a shared `GreenHeroBand` (legal + 404).
3. Then phases 1→4 fan out per surface, each its own PR: **chrome** (navbar/footer/whatsapp) → **homepage** (9 sections) → **marketing** (over-ons/rassenkeuze/contact/faq) → **legal + 404**. Phase 5 is the final Lucide-removal + a11y/build/preview sweep.

## Decisions locked (do not re-litigate)
- **Multiple accent colors per page are allowed** — the v2 "one accent per screen" rule is **reversed** (owner, 2026-06-01). Keep the colorful compositions (e.g. homepage hero lime text + peach CTA); just tokenize the hex. *The `brand-guide-letsdog` skill was updated 2026-06-01 to match.* (Note: "accent-as-button-background only for the single highest-emphasis CTA" is a separate button-hierarchy rule that **stays**.)
- **Eyebrows stay brand-green on light** via a new `tone="brand"` Eyebrow variant; white `tone="onGreen"` on green/forest; muted default reserved for low-emphasis only.
- **Keep `BeigeSplitHero` inline** (extract only `GreenHeroBand`). **Keep the star-gold `#F5C518`** as a documented rating exception.
- The homepage **green hero → beige-on-scroll** transition is preserved (it's a brand surface transition, not an accent).

## Critical constraints (from `docs/solutions/`)
- **No test suite** — verify on `npm run build` + the **Cloudflare branch preview**, per surface. The Turbopack dev overlay caches render errors (restart dev after a render-error fix); keep branch names **≤28 chars**.
- **Token layer stays additive** (no global element rules) so unconverted pages survive the partial migration.
- **Phosphor icons** import from `@phosphor-icons/react/dist/ssr` (static export). `lucide-react` is removed only in the final phase.
- **Contact form** Postmark POST only runs on the Cloudflare preview, **not** `next dev`.
- Preserve invariants: every page ends on a **light** section (footer transition); global `scroll-padding-top: 6rem`; `OptimizedImage` for photos / `next/image` for logos; FAQ `faq-data.ts` derived counts + `FAQPage` JSON-LD; SEO/JSON-LD stays in the server `page.tsx`.

## State at handoff
- DS is largely pre-built: `app/ld-tokens.css` + `app/ld-components.css` are **in sync** with the v2 bundle; **7 of 23** React components vendored in `components/ui/`; Phosphor + base Radix deps installed; `button.tsx` is v2-correct (only its comment was stale → fixed in U3).
- **Reference implementation to mirror:** `app/prijzen/page.tsx` + `components/sections/pricing.tsx`.
- Sizing: ~24 units across 6 phases. **Phase 0 + Phase 1 alone** (foundations + chrome) deliver most of the visible consistency win — a sensible first milestone.
