---
title: "feat: Homepage restructure — puppyagenda block, mobile-in-Hope, footer badges, slim rassenkeuze"
type: feat
status: active
date: 2026-06-02
---

# feat: Homepage restructure — puppyagenda block, mobile-in-Hope, footer badges, slim rassenkeuze

## Summary

Restructure the homepage so it tells one story — problem → solution → show the product → proof → price → close — and remove a section whose copy went stale after the pricing change. Replace the weak "In drie stappen aan de slag" block (its "gratis aanmelden" step now contradicts the €12,99/mnd pricing) with a new "De puppyagenda" teaser (four phases, lesson-type chips, "Meer dan 150 lessen"). Fold the mobile/on-the-go benefit into "Wat je krijgt", move the app-store badges into the footer, demote the full breed-selector to a slim strip after the final CTA, and point the final CTA at the inline pricing.

The signed-off visual source of truth is `homepage-final-flow.html` (repo root) — every block, copy string, and ordering decision below matches it.

## Problem Frame

The current homepage order is `Hero → Problem → Hope → BreedSelector → Trust → HowItWorks → Pricing → FinalCta`. Two blocks break the narrative:

- **HowItWorks ("In drie stappen aan de slag")** staples three unrelated things together (onboarding steps + a mobile-app banner + store badges), and its step 1 ("gratis aanmelden / direct toegang") is now factually wrong — the cheapest membership is €12,99/mnd. It actively contradicts the pricing block below it.
- **BreedSelector** interrupts the sell: it targets people still *choosing* a dog (a different funnel stage) with a competing free CTA, mid-narrative.

This plan implements the agreed redesign that resolves both, plus the smaller decisions captured during review (mobile benefit relocation, footer badges, final-CTA anchor).

---

## Requirements

### Content & structure
- R1. The homepage renders in this order: Hero → Problem → Hope ("Wat je krijgt") → De puppyagenda → Trust → Pricing → FinalCta → slim rassenkeuze strip.
- R2. A new "De puppyagenda" section appears directly after Hope: eyebrow "De puppyagenda", heading "Van voorbereiding tot ontdekkingsfase", a "Meer dan 150 lessen" pill, a secondary CTA "Bekijk de hele agenda →" linking to `/puppyagenda`, four phase cards — Vóór de komst (15 lessen) / De eerste week thuis (8) / Wennen & socialiseren (10) / Ontdekken & groeien (20) — each with week tag, description, lesson-type icon chips and the lesson count, and a legend row (checklist · video · audio · gezondheid).
- R3. The "In drie stappen aan de slag" block (steps + mobile banner + badges) no longer appears on the homepage, and no "gratis aanmelden / gratis toegang"-style claim about the app account survives anywhere on the page.
- R4. "Wat je krijgt" is refocused on outcomes (not a feature list that duplicates the puppyagenda block) and includes one on-the-go point with a phone icon: video onderweg, audio in de auto.
- R5. The full breed-selector section is replaced by a slim soft-blue strip after the FinalCta ("Nog geen pup? Of twijfel je over het ras?" + "Doe de gratis test" → `/rassenkeuze`). No navbar highlight is added.

### CTAs & footer
- R6. The footer shows the app-store badges (Google Play linked/live, App Store marked "binnenkort") under a "Download de app" label, integrated into the existing footer layout. No PWA / "add to home screen" copy is added.
- R7. The FinalCta primary button scrolls to the inline pricing (`#prijzen`) instead of navigating to the `/prijzen` page.

### Brand & platform constraints
- R8. All new/changed UI uses the existing brand tokens (`app/ld-tokens.css`) and `@/components/ui` primitives; soft blue is used only as a small accent (the slim strip), per brand guidance.
- R9. No new client-side behavior is introduced — every new/changed section is a server component (static-export-safe). No new photographic images are added (badges use existing assets).

---

## Key Technical Decisions

- KTD1. **New static `PuppyAgendaTeaser` component, separate from `puppy-phases.tsx`.** The signed-off design is a static four-card grid, not the scroll-driven `IntersectionObserver` block on `/puppyagenda` (`components/sections/puppy-phases.tsx`, `"use client"`). Build a fresh server component (`components/sections/puppy-agenda-teaser.tsx`) rather than generalizing `puppy-phases.tsx` — different layout, different data shape (lesson-type chips + counts), and keeping it server-only avoids shipping client JS for a presentational block. The two coexist.
- KTD2. **Delete the retired sections rather than leave them unused.** `components/sections/how-it-works.tsx` and `components/sections/breed-selector.tsx` become unreferenced after this change (confirmed only imported by `app/page.tsx`; no internal anchors point at `#hoe-het-werkt` or `#rassenkeuze`). Delete both to avoid dead code; they are recoverable via git. Lift the Google Play / App Store badge markup out of `how-it-works.tsx` before deleting (reuse in the footer).
- KTD3. **Footer stays a server component.** Render the App Store badge as a static "binnenkort" treatment (dimmed badge + label) rather than re-implementing the old click-toast from `how-it-works.tsx`. This avoids making `footer.tsx` `"use client"`. Google Play is a real outbound link.
- KTD4. **Final CTA uses an in-page hash (`#prijzen`).** The Pricing `<section>` already has `id="prijzen"`, and `html { scroll-padding-top: 6rem }` (`app/globals.css`) already offsets in-page anchors below the fixed navbar — so a hash link lands correctly on click and cold-load with no per-element override (see `docs/solutions/conventions/in-page-anchor-offset-fixed-navbar.md`). Scope this change to the FinalCta button only; the Hero/Hope "Start vandaag" buttons are left pointing at `/prijzen` (see Open Questions).
- KTD5. **Verification is build + preview, not unit tests.** The repo has no test harness (scripts: `dev, build, start, lint, optimize:images, generate:icons, generate:og, assets`). These are presentational/static components; correctness is verified by `npm run build` (TypeScript + static export succeed) and a Cloudflare preview visual check per the project's preview-first discipline.

---

## High-Level Technical Design

Section order, before → after (the crux of the change):

Before (`app/page.tsx`):
1. Hero
2. Problem
3. Hope
4. **BreedSelector**  ← interrupts
5. Trust
6. **HowItWorks**  ← stale + 3-in-1
7. Pricing
8. FinalCta

After:
1. Hero
2. Problem
3. Hope *(refocused; mobile point folded in)*
4. **PuppyAgendaTeaser** *(new)*
5. Trust
6. Pricing
7. FinalCta *(button → `#prijzen`)*
8. **RassenkeuzeStrip** *(new, slim)*

Plus: app-store badges relocate into the footer; `HowItWorks` and `BreedSelector` are deleted.

---

## Implementation Units

### U1. Create the `PuppyAgendaTeaser` section
- Goal: New server component rendering the four-phase puppyagenda teaser exactly as in `homepage-final-flow.html` (block ④).
- Requirements: R2, R8, R9
- Dependencies: none
- Files: `components/sections/puppy-agenda-teaser.tsx` (new)
- Approach: Mirror the structure/spacing conventions of existing sections (`SectionWrapper`, `Eyebrow`, `Card` from `@/components/ui`; Phosphor icons via `@phosphor-icons/react/dist/ssr`). Header row: eyebrow "De puppyagenda" + heading "Van voorbereiding tot ontdekkingsfase" + a "Meer dan 150 lessen" pill on the left, a secondary/ghost "Bekijk de hele agenda →" button (links to `/puppyagenda`) on the right — keep it visually secondary so the page's primary green/peach "Start vandaag" CTAs stay dominant. A four-card grid; each card: phase icon + number, title, week tag, description, a row of lesson-type chips, and a per-phase lesson count. A legend row beneath: checklist · video · audio · gezondheid. Phase content/copy is the four blocks from the mockup; per-phase counts are 15 / 8 / 10 / 20. The "Meer dan 150 lessen" pill is the full-program total (more phases exist after week 12) — intentionally larger than the sum of the four shown cards, not a contradiction. Define the phase data as a local `const` array (same pattern as `how-it-works.tsx`/`hope.tsx`).
- Patterns to follow: `components/sections/how-it-works.tsx` (eyebrow + heading + card grid + local data array), `components/sections/hope.tsx` (icon-in-tile treatment). Lesson-type icon mapping (directional): checklist → `ListChecks`/`FileText`, video → `Play`, audio → `Headphones`, gezondheid → `Heartbeat` (matches the user-provided health icon; or wire the provided asset directly). Phase header icons (directional): `House`, `SunHorizon`, `PawPrint`, `Plant`/`Sparkle`.
- Test scenarios: Test expectation: none -- presentational server component; verified by `npm run build` succeeding and a preview visual check that the four cards, pill, legend, and secondary CTA render and match the mockup.
- Verification: Block renders after Hope in preview; "Bekijk de hele agenda" navigates to `/puppyagenda`; layout holds at mobile/tablet/desktop widths.

### U2. Refocus "Wat je krijgt" (Hope) and fold in the mobile point
- Goal: Trim Hope to outcome-led points (no longer a feature list that duplicates the puppyagenda block) and add one on-the-go point with a phone icon.
- Requirements: R4, R8, R9
- Dependencies: none
- Files: `components/sections/hope.tsx`
- Approach: Rework the `outcomes` array to outcome framing: (1) houvast — "jij weet elke dag wat je doet", (2) echte uitleg van gecertificeerde trainers, (3) **"Leer overal, ook onderweg" with a phone icon** (`DeviceMobile`) — video tijdens de wandeling, audio in de auto, (4) een community die je begrijpt. Drops the standalone audio bullet (absorbed into the on-the-go point) and trims feature overlap with the new puppyagenda block. Reassess the floating "Puppyagenda voor elke week" image callout: with a dedicated puppyagenda block now directly below, either keep it as a light visual or simplify — implementer's call, but avoid making it read as a duplicate heading.
- Patterns to follow: existing `hope.tsx` outcomes/icon structure; phone icon `DeviceMobile` from `@phosphor-icons/react/dist/ssr`.
- Test scenarios: Test expectation: none -- presentational; verified by build + preview check that four outcome rows render, the third uses a phone icon, and copy matches the mockup.
- Verification: Hope shows the on-the-go point with a phone icon; no remaining duplication of the puppyagenda feature list.

### U3. Integrate app-store badges into the footer
- Goal: Add a "Download de app" block with Google Play (live link) + App Store ("binnenkort") to the footer, no PWA text.
- Requirements: R6, R8, R9
- Dependencies: none
- Files: `components/layout/footer.tsx`
- Approach: Add a "Download de app" group inside the existing brand column (under the social icons) in the footer's grid. Reuse the badge assets (`public/images/google-play-badge.png` linked to the Play Store URL; `public/images/app-store-badge.svg` shown dimmed with a "binnenkort" label). Lift the badge markup from `how-it-works.tsx` before that file is deleted (U6). Keep the footer a server component (KTD3) — no toast/click state. Label uses the `Eyebrow` `tone="onGreen"` pattern already used for "Navigatie"/"Beleid".
- Patterns to follow: existing `footer.tsx` brand column + `Eyebrow` section labels; badge `next/image` usage from `how-it-works.tsx` (lines for Google Play link + App Store).
- Test scenarios: Test expectation: none -- presentational; verified by preview check that badges render in the footer, Google Play links out (`target="_blank" rel="noopener noreferrer"`), App Store reads "binnenkort", and no PWA copy is present.
- Verification: Footer matches `homepage-final-flow.html` block ⑨; footer remains a server component (no `"use client"` added).

### U4. Point the Final CTA button at inline pricing
- Goal: FinalCta "Start vandaag" scrolls to `#prijzen` instead of routing to `/prijzen`.
- Requirements: R7
- Dependencies: none
- Files: `components/sections/final-cta.tsx`
- Approach: Change the button target from `Link href="/prijzen"` to an in-page hash to `#prijzen`. Relies on the Pricing section's existing `id="prijzen"` and the global `scroll-padding-top` (KTD4) — no scroll-margin override needed.
- Patterns to follow: `docs/solutions/conventions/in-page-anchor-offset-fixed-navbar.md`.
- Test scenarios: Test expectation: behavioral, verified in preview -- clicking "Start vandaag" in the FinalCta scrolls to the Pricing section with the heading clearing the fixed navbar (both warm click and cold-load with `#prijzen` in the URL).
- Verification: Click scrolls to pricing, correctly offset below the navbar.

### U5. Create the slim `RassenkeuzeStrip`
- Goal: New server component — a slim soft-blue strip replacing the full breed-selector.
- Requirements: R5, R8, R9
- Dependencies: none
- Files: `components/sections/rassenkeuze-strip.tsx` (new)
- Approach: A single slim band (soft-blue `--ld-blue` accent, used small per R8/brand guidance): left text "Nog geen pup? Of twijfel je over het ras?" + subline "Doe de gratis rassenkeuze hulp — 10 vragen, wetenschappelijk onderbouwd."; right a `Button` linking to `/rassenkeuze` ("Doe de gratis test →"). Clearly secondary/lighter than the core sections so it reads as a P.S.
- Patterns to follow: `components/sections/breed-selector.tsx` for copy/link source and CTA pattern; `@/components/ui` `Button` (`brand` variant, `pill`).
- Test scenarios: Test expectation: none -- presentational; verified by preview check that the strip renders after FinalCta, uses a soft-blue accent, and the CTA links to `/rassenkeuze`.
- Verification: Strip appears as the last content band before the footer; CTA navigates to `/rassenkeuze`.

### U6. Recompose the homepage and remove retired sections
- Goal: Set the final section order in `app/page.tsx` and delete the now-unused sections.
- Requirements: R1, R3
- Dependencies: U1, U5 (new components must exist)
- Files: `app/page.tsx`; delete `components/sections/how-it-works.tsx`; delete `components/sections/breed-selector.tsx`
- Approach: Update imports in `app/page.tsx` — remove `HowItWorks` and `BreedSelector`, add `PuppyAgendaTeaser` and `RassenkeuzeStrip` — and render in the R1 order. Delete the two retired component files (badge markup already lifted into the footer in U3). Confirm no other importers remain before deleting (grep already shows only `app/page.tsx`; re-verify at build).
- Patterns to follow: current `app/page.tsx` composition.
- Test scenarios: Test expectation: behavioral, verified by build + preview -- `npm run build` succeeds with no unresolved imports; the homepage renders all eight blocks in the R1 order; no references to the deleted components remain.
- Verification: `npm run build` is clean; full-page preview matches `homepage-final-flow.html` top to bottom.

---

## Scope Boundaries

### In scope
The eight items in Requirements: the order change, the new puppyagenda teaser, removal of the stale 3-steps block, the Hope refocus + mobile point, the footer badges, the final-CTA anchor, and the slim rassenkeuze strip.

### Deferred to follow-up work
- **PWA "add to home screen" install UX.** Only the textual/visual badge treatment ships now; the real install prompt is parked. The user is handling a PWA FAQ entry separately.
- **Hero/Hope CTA anchor consistency.** This plan only repoints the FinalCta button to `#prijzen`. Whether the Hero and Hope "Start vandaag" buttons should also switch from `/prijzen` to `#prijzen` is a separate, deferred decision (see Open Questions).
- **Lesson-count data source.** Phase counts and the "Meer dan 150 lessen" headline are static copy in the component (matching the current section pattern); no CMS/data wiring.

### Out of scope
- Navbar highlight for rassenkeuze (the user explicitly decided against it).
- Any change to the `/puppyagenda` page or its scroll-driven `puppy-phases.tsx` block.

---

## Resolved Inputs

Confirmed by the user — no longer open:

- **♥ = gezondheid (health).** Rendered with the user-provided health/heart icon; Phosphor `Heartbeat` is the closest match in the icon set, or wire the provided asset.
- **Per-phase lesson counts (real):** Vóór de komst 15 · De eerste week thuis 8 · Wennen & socialiseren 10 · Ontdekken & groeien 20.
- **"Meer dan 150 lessen"** is the full-program total — more phases/weeks exist after week 12 beyond the four shown — so the pill and the per-card counts are consistent by design, not contradictory.
- **Trust stat unchanged.** Keep the existing "50+ videolessen" stat (a distinct metric) rather than mirroring "150+", so the number isn't shown twice on the page. No Trust edit is in scope.

---

## Risks & Dependencies

- **Anchor scroll (low).** `#prijzen` depends on the Pricing `id="prijzen"` and the global `scroll-padding-top`; both already exist. No risk if Pricing keeps its id.
- **JSX text/whitespace on build (low).** When authoring the new components' inline copy (punctuation, `&` entities, adjacent text + elements), watch the documented SWC whitespace-collapse gotcha — see `docs/solutions/ui-bugs/swc-jsx-expression-whitespace-collapse.md`. Caught by `npm run build` + preview.
- **Dead-code deletion (low).** `how-it-works.tsx` / `breed-selector.tsx` are only imported by `app/page.tsx` and no internal anchors target their section ids (verified). Re-confirm at build after the import swap.
- **Preview-first.** Per project convention, verify on the Cloudflare branch preview before merging to `main`; the contact-form Function is unaffected.

---

## Sources & Research

- **Signed-off design (visual source of truth):** `homepage-final-flow.html` (repo root) — every block, copy string, ordering, and the footer layout match it.
- **Files touched / referenced:** `app/page.tsx`; `components/sections/{hope,final-cta,breed-selector,how-it-works,puppy-phases}.tsx`; `components/layout/footer.tsx`; `components/ui/*` (Button, Card, Eyebrow, Container, Badge); `app/ld-tokens.css` (brand tokens); `public/images/{google-play-badge.png,app-store-badge.svg}`.
- **Learnings applied:** `docs/solutions/conventions/in-page-anchor-offset-fixed-navbar.md` (the `#prijzen` anchor offset is already handled globally); `docs/solutions/ui-bugs/swc-jsx-expression-whitespace-collapse.md` (JSX text build gotcha for the new components).
- **Build & verify:** `npm run build` (TypeScript + static export); Cloudflare branch preview for visual + behavioral checks. No unit-test harness in the repo.
