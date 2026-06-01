# Handoff — Brand-guide v2 site migration

**Created:** 2026-06-01 · **Last updated:** 2026-06-01 (end of session 1)
**Status:** Phases **0, 1, 2 merged to `main`**. **Phase 3 (marketing pages) is next.** Phases 4–5 not started.
**Plan (source of truth):** [`docs/plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md`](plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md) — read it, but note the **plan corrections** below (puppy-phases, Lucide removal).
**How to execute:** `/new-feature`, **one PR per phase, one commit per unit**, **merge with a merge-commit (not squash)** so per-unit commits survive for rollback.

---

## What this is
Migrate the whole Let's Dog marketing site (**except `puppyagenda`**) onto the brand-guide **v2** design system: DS component adoption + `--ld-*` tokens + v2 brand rules. **Visual/design-system only — no copy, route, SEO, or behavior changes.**

---

## ✅ Progress log (session 1 — 2026-06-01)

| Phase | Units | PR | Tag | Notes |
|---|---|---|---|---|
| **0 — DS foundations** | U1–U4 | [#20](https://github.com/gaarlandt/LD-website/pull/20) merged | `release/ds-foundations-*` | Eyebrow tones · vendored 5 form components + `@radix-ui/react-dialog`/`react-label` · button JSDoc + `.ld-card` reduced-motion + National 2 font reconcile · `GreenHeroBand`. **+ fixed a pre-existing dev blocker** (see Discoveries). |
| **1 — global chrome** | U5–U7 | [#21](https://github.com/gaarlandt/LD-website/pull/21) merged | `release/ds-chrome-*` | navbar (focus-trapped mobile menu, 44px hamburger) · footer (forest tokens, onGreen eyebrows) · whatsapp (token shadow, dropped `"use client"`). |
| **2 — homepage** | U8–U11, U13–U16 | [#22](https://github.com/gaarlandt/LD-website/pull/22) merged | `release/ds-homepage-*` | hero · problem · hope · how-it-works · trust · breed-selector · final-cta · pricing cleanup. **U12 puppy-phases EXCLUDED** (see Discoveries). |

`components/ui/`: **12 of 23** DS components vendored (added field/input/textarea/label/dialog in Phase 0). `lucide-react` still installed (removed in Phase 5 — but see blocker).

---

## 🔑 Decisions & discoveries this session (do not re-litigate)

- **Merge with a merge-commit, NOT squash.** Owner wants the per-unit commits preserved for granular rollback. One PR per phase, one commit per unit. (Repo allows merge/rebase/squash.)
- **puppy-phases (U12) is OUT OF SCOPE.** The plan listed it as a homepage section, but `<PuppyPhases>` renders **only on `/puppyagenda`** (`app/puppyagenda/page.tsx:52`), which is explicitly excluded. It was reverted in Phase 2 and stays on Lucide/raw-Tailwind. **Do not convert it** unless puppyagenda is brought into scope.
- **85% root font-size** (`app/globals.css` `html{font-size:85%}`, the MacBook-scaling rule; jumps to 100% at ≥1440px). Tailwind `rem`-based utilities render ~15% smaller below 1440px. **Use absolute `px` for accessibility hit targets** (e.g. the navbar hamburger is `w-[44px]`, because `w-11`=2.75rem rendered only 37px). Same caution for any ≥44px tap-target requirement.
- **Tailwind v4 scans Markdown.** `app/globals.css` carries `@source not "../**/*.md"` — **don't remove it**, and **never put Tailwind-class-like strings in committed docs** (e.g. a literal `bg-[var(--ld-*)]`). They generate a malformed utility that is a **fatal 500 in `next dev`** (Turbopack) but only a warning in `next build` — it silently broke local dev for the whole repo.
- **Multiple accents per page allowed** (KTD4) · **eyebrows brand-green on light / onGreen-white on green** (KTD5) · **keep `BeigeSplitHero` inline**, extract only `GreenHeroBand` (KTD8) · **keep star-gold `#F5C518`** as a documented rating exception (KTD10) · the homepage **green-hero → beige-on-scroll** transition is preserved.

---

## ▶️ Start here next session — Phase 3 (marketing pages)

1. Open a **new `/new-feature` session in its own git worktree** (one-worktree-per-session). Branch e.g. `feat/ds-marketing` (≤28 chars for the CF preview slug). `npm install` first — **worktrees don't get `node_modules`** (gitignored); the install also restores the Radix deps.
2. Build on **Node v20** (`/Users/jurriaan/.nvm/versions/node/v20.19.5/bin` on PATH) to match Cloudflare. `npm run build` is the source of truth; verify each surface on the **Cloudflare branch preview**.
3. Convert the four marketing pages — one commit per unit:
   - **U17 `app/over-ons/page.tsx`** — 4 CTAs→Button, 4 eyebrows→Eyebrow, cert chips/tag→Badge, method+cert+CTA cards→Card, tokens, Phosphor. Preserve the 3 badges, `#verhaal` anchor, the 4-card grid, `next/image` NVGH logo, two-button closing CTA, `personLd` JSON-LD.
   - **U18 `app/rassenkeuze/page.tsx`** — hero CTA→Button, pills/tag→Badge, eyebrows→Eyebrow, 6 cards→Card, keep the lime section + peach badge (tokenize), Phosphor. Leave the iframe `loading`/`allow` attrs untouched.
   - **⚠️ U19 `app/contact/contact-content.tsx` + `contact-form-modal.tsx` — HIGHEST-RISK unit.** Swap the hand-rolled `motion.div` modal for the vendored Radix **`Dialog`** (focus trap + scroll-lock + Esc + focus-restore for free); move the 3 fields onto `Field`/`Input`/`Textarea`/`Label`; focus ring via `--ld-sh-focus`; errors via `--ld-danger` (`Field error`). **Preserve** the honeypot, `aria-required`/`aria-describedby`, `trackEvent`, the `open`/`onClose` interface, and the **Postmark POST** (`functions/api/contact.ts`). **The real submit only runs on the Cloudflare preview — `functions/` don't run under `next dev`.** See `docs/solutions/ui-bugs/framer-motion-animatepresence-stable-key.md`. Vendored `Dialog` usage: `<Dialog><DialogContent>…</DialogContent></Dialog>` (Portal + Overlay baked in); **must contain a `<DialogTitle>`** (Radix a11y — the component is documented for it).
   - **U20 `app/veelgestelde-vragen/faq-content.tsx`** — replace the custom `FaqItem`/`useState` accordion with the vendored DS **`Accordion`**; category chips→Badge, CTAs→Button, "Categorieën"→Eyebrow; `ChevronDown` auto-removed by the Accordion. **Preserve** the gapless 01–12 numbering, per-category counts, slug ids + overview-card hrefs, empty-category filtering, the `{" "}` SWC whitespace guards, and the `FAQPage` JSON-LD sync (`faq-data.ts` stays the single source). If no other client state remains, drop `"use client"`.

## Then Phase 4 — legal + 404
- **U21 `components/shared/legal-page-layout.tsx`** (skins all 6 legal pages) — adopt the **`GreenHeroBand`** built in Phase 0 (`components/shared/green-hero-band.tsx`, props `eyebrow`/`title`/`lead?`/`titleClassName?`); it fixes the ~2.1:1 eyebrow-on-green AA failure. Tokenize the `react-markdown` overrides; **add `font-heading` to the `h3` override**. Keep the `remarkPlugins={[remarkGfm]}` wiring (GFM tables — verify `/cookieverklaring`).
- **U22 `signature-form.tsx`** (tokens + min 16px font) · **U23 `app/not-found.tsx`** (adopt `GreenHeroBand`, CTA→Button).

## Then Phase 5 — cleanup & verification (U24)
- Remove `lucide-react` + whole-site a11y/motion/invariant sweep + full CF preview click-through.
- **⚠️ BLOCKER:** `/puppyagenda` (excluded) **still imports `lucide-react`** (`Calendar, Video, BookOpen, CheckSquare`), as does `components/sections/puppy-phases.tsx`. `lucide-react` **cannot be fully removed** while puppyagenda stays out of scope. **Decision needed:** keep the dep, or fold puppyagenda's icons (only) into the migration.

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
