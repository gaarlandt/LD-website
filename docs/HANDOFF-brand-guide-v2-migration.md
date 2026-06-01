# Handoff — Brand-guide v2 site migration

**Created:** 2026-06-01 · **Last updated:** 2026-06-01 (end of session 2)
**Status:** ✅ **COMPLETE — all phases (0–5) merged to `main`.** The whole in-scope site (everything except `puppyagenda`) is on brand-guide v2; `lucide-react` is fully removed.
**Plan (source of truth):** [`docs/plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md`](plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md) — read it, but note the **plan corrections** below (puppy-phases, Lucide removal).
**How to execute:** `/new-feature`, **one PR per phase, one commit per unit**, **merge with a merge-commit (not squash)** so per-unit commits survive for rollback.

---

## What this is
Migrate the whole Let's Dog marketing site (**except `puppyagenda`**) onto the brand-guide **v2** design system: DS component adoption + `--ld-*` tokens + v2 brand rules. **Visual/design-system only — no copy, route, SEO, or behavior changes.**

---

## ✅ Progress log (sessions 1–2 — 2026-06-01)

| Phase | Units | PR | Tag | Notes |
|---|---|---|---|---|
| **0 — DS foundations** | U1–U4 | [#20](https://github.com/gaarlandt/LD-website/pull/20) merged | `release/ds-foundations-*` | Eyebrow tones · vendored 5 form components + `@radix-ui/react-dialog`/`react-label` · button JSDoc + `.ld-card` reduced-motion + National 2 font reconcile · `GreenHeroBand`. **+ fixed a pre-existing dev blocker** (see Discoveries). |
| **1 — global chrome** | U5–U7 | [#21](https://github.com/gaarlandt/LD-website/pull/21) merged | `release/ds-chrome-*` | navbar (focus-trapped mobile menu, 44px hamburger) · footer (forest tokens, onGreen eyebrows) · whatsapp (token shadow, dropped `"use client"`). |
| **2 — homepage** | U8–U11, U13–U16 | [#22](https://github.com/gaarlandt/LD-website/pull/22) merged | `release/ds-homepage-*` | hero · problem · hope · how-it-works · trust · breed-selector · final-cta · pricing cleanup. **U12 puppy-phases EXCLUDED** (see Discoveries). |
| **3 — marketing** | U17–U20 | [#23](https://github.com/gaarlandt/LD-website/pull/23) merged | `release/ds-phases-3-5-*` | over-ons · rassenkeuze · contact (Radix `Dialog`) · FAQ (Radix `Accordion`, dropped `"use client"`). |
| **4 — legal & 404** | U21–U23 | [#23](https://github.com/gaarlandt/LD-website/pull/23) merged | `release/ds-phases-3-5-*` | legal-page-layout (`GreenHeroBand` — eyebrow 2.1→4.7:1, National 2 h3) · signature-form · 404. |
| **5 — cleanup** | U24 | [#23](https://github.com/gaarlandt/LD-website/pull/23) merged | `release/ds-phases-3-5-*` | puppyagenda + puppy-phases icons→Phosphor (icons only); **`lucide-react` removed**. |

> Sessions 1–2 both 2026-06-01. Phases 3–5 shipped as **one combined PR** (#23, owner decision) with one commit per unit + a merge-commit, not the original "one PR per phase".

`components/ui/`: **12 of 23** DS components vendored (field/input/textarea/label/dialog added in Phase 0). ✅ `lucide-react` **removed** (U24) — the whole in-scope site is on Phosphor.

---

## 🔑 Decisions & discoveries this session (do not re-litigate)

- **Merge with a merge-commit, NOT squash.** Owner wants the per-unit commits preserved for granular rollback. One PR per phase, one commit per unit. (Repo allows merge/rebase/squash.)
- **puppy-phases (U12) is OUT OF SCOPE.** The plan listed it as a homepage section, but `<PuppyPhases>` renders **only on `/puppyagenda`** (`app/puppyagenda/page.tsx:52`), which is explicitly excluded. It was reverted in Phase 2 and stays on Lucide/raw-Tailwind. **Do not convert it** unless puppyagenda is brought into scope.
- **85% root font-size** (`app/globals.css` `html{font-size:85%}`, the MacBook-scaling rule; jumps to 100% at ≥1440px). Tailwind `rem`-based utilities render ~15% smaller below 1440px. **Use absolute `px` for accessibility hit targets** (e.g. the navbar hamburger is `w-[44px]`, because `w-11`=2.75rem rendered only 37px). Same caution for any ≥44px tap-target requirement.
- **Tailwind v4 scans Markdown.** `app/globals.css` carries `@source not "../**/*.md"` — **don't remove it**, and **never put Tailwind-class-like strings in committed docs** (e.g. a literal `bg-[var(--ld-*)]`). They generate a malformed utility that is a **fatal 500 in `next dev`** (Turbopack) but only a warning in `next build` — it silently broke local dev for the whole repo.
- **Multiple accents per page allowed** (KTD4) · **eyebrows brand-green on light / onGreen-white on green** (KTD5) · **keep `BeigeSplitHero` inline**, extract only `GreenHeroBand` (KTD8) · **keep star-gold `#F5C518`** as a documented rating exception (KTD10) · the homepage **green-hero → beige-on-scroll** transition is preserved.

---

## ✅ Migration complete (session 2 — 2026-06-01)

Phases 3–5 (U17–U24) shipped in **[PR #23](https://github.com/gaarlandt/LD-website/pull/23)** — one commit per unit, merged with a merge-commit:
- **U17 over-ons · U18 rassenkeuze** — CTAs→Button, eyebrows→Eyebrow, chips/tags→Badge, cards→Card, tokens, Phosphor. Lime/peach accents kept (KTD4); keuzehulp iframe attrs untouched; `#verhaal` anchor, NVGH logo, `personLd` preserved.
- **U19 contact** — hand-rolled `motion.div` modal → vendored Radix **`Dialog`** (focus-trap/scroll-lock/Esc/focus-restore from Radix); fields → `Field`/`Input`/`Textarea` with `--ld-danger` errors + `aria-invalid`. Honeypot, aria, `trackEvent`, `open`/`onClose`, and the **Postmark POST** all preserved.
- **U20 FAQ** — custom accordion → Radix **`Accordion`** (one per category); dropped `"use client"`. Gapless 01–12 numbering, counts, slug ids, empty-category filtering, and FAQPage JSON-LD all preserved.
- **U21 legal-page-layout** (all 6 pages) — adopted **`GreenHeroBand`** (eyebrow contrast 2.1→4.7:1), tokenized markdown overrides, National 2 h3, remark-gfm tables kept. **U22 signature-form** (tokens + 16px). **U23 404** — GreenHeroBand, secondary pills, brand CTA.
- **U24** — converted puppyagenda + puppy-phases **icons only** to Phosphor (no reskin) and **removed `lucide-react`**.

Verified: `npm run build` (Node 20) green + full browser pass (Dialog & Accordion open→close→reopen, validation, GreenHeroBand contrast, GFM tables, mobile, zero console errors).

**Blocker (Phase 5 Lucide removal) — RESOLVED.** puppyagenda was the last `lucide-react` consumer; per owner decision its icons (and `puppy-phases.tsx`) were swapped to Phosphor **icons-only** — puppyagenda stays out of the reskin, but the dep is now fully gone. The contact-form **submit** posts to the unchanged Postmark function; verify on production once live if not done on a preview.

---

## Critical constraints (carry forward)
- **No test suite** — `npm run build` (Node 20) + Cloudflare preview per surface. Turbopack dev caches render errors (restart dev after a render-error fix). Branch names ≤28 chars.
- **Token layer is additive** (no global element rules) so unconverted pages survive the partial migration.
- **Phosphor** imports from `@phosphor-icons/react/dist/ssr`. Keep current icon sizes per context (don't force 24px where layout is tuned smaller).
- Preserve invariants: every page ends on a **light** section (footer transition); global `scroll-padding-top: 6rem`; `OptimizedImage` for photos / `next/image` for logos; SEO/JSON-LD stays in the server `page.tsx`.
- **Reference implementation to mirror:** `components/sections/pricing.tsx` + the already-converted homepage sections.

## Open follow-ups (no rush, not blocking)
- **Capture the Tailwind-markdown-scanning gotcha** in `docs/solutions/developer-experience/` (strong `/ce-compound` candidate — net-new, dev-fatal/build-silent). Suggested tags: `tailwind-v4, @source, markdown, turbopack, arbitrary-value`.
- **how-it-works step-connector lines** sit ~8px above the icon centers after the Card padding change — minor vertical-alignment polish (or remove the connectors for cleaner separated cards — owner's call).
- **Update the `brand-guide-letsdog` skill** to reverse the "one accent per screen" rule (KTD4) — brand-skill docs only, separate from website code.
