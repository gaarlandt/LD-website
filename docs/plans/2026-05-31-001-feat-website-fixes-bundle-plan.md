---
title: "feat: Website fixes bundle — footer restyle, Rassenkeuze redesign + 5 content/UX fixes"
type: feat
status: active
date: 2026-05-31
plan_id: 2026-05-31-001
depth: standard
delivery: single PR, one atomic commit per unit, merge-commit to main (per HANDOFF convention)
---

# feat: Website fixes bundle (7 owner items)

## Summary

A single feature branch → one PR bundling **7 owner-requested fixes** to the Let's Dog
marketing site (Next.js 16 static export). Six are small, well-bounded content/UX/style
edits; one is a full page redesign (Rassenkeuze hulp) built to a supplied mockup. Each item
lands as its own atomic commit so `main` keeps granular `git revert` points.

Two items are cross-cutting and need care: the **footer restyle** (dark sage `#162A0E`,
rounded top, soft transition) touches **every page** and is coupled to recoloring the
homepage final CTA; the **Rassenkeuze redesign** replaces the page's body while keeping the
live `keuzehulp.letsdog.nl` iframe and the existing metadata/canonical.

All decisions below were locked with the owner in a pre-plan Q&A — do not re-litigate them.

---

## Problem Frame

The site is live-ready but the owner flagged a punch-list of polish items from reviewing the
current build + a redesign mockup of the Rassenkeuze page:

- A few content/wording issues (Retour clarity, a stray pricing pill).
- CTA/navigation correctness (puppyagenda points at the app instead of pricing).
- Visual consistency (app-store badges mismatched + wrong order; footer is a hard black
  rectangle with an abrupt section→footer cut).
- One page (Rassenkeuze hulp) is functional but visually thin vs. the rest of the site and
  has a fresh mockup to build to.

These are independent fixes with no shared data model — the work is presentational and
content-level. The only architectural concern is that the footer is a shared layout
component, so its restyle must be verified across the whole page set.

---

## Requirements

Traceability back to the 7 owner items (R-IDs map 1:1 to implementation units):

| R-ID | Requirement | Unit |
|---|---|---|
| R1 | Footer copyright must render `© <year> Let's Dog.` **with** a space after the year (verification only — live code already correct; preserve through the restyle). | U5 |
| R2 | Retour page section 3 ("Retourprocedure") must make explicit it applies to **fysieke producten** only. | U1 |
| R3 | App-store badges must be the **same visual size** and ordered **Android (Google Play) left, iOS (App Store) right**, keeping the iOS "Binnenkort beschikbaar" toast. | U4 |
| R4 | Puppyagenda CTA must point to **`/prijzen`** (internal) and carry a **label that fits a pricing destination**. | U3 |
| R5 | Footer must be **dark sage `#162A0E`** with **rounded top corners** sitting over a **light band on every page**, for a soft section→footer transition; the homepage final CTA ("Begin vandaag") becomes a **light `#EFE8E4` section** so it doesn't clash. | U5 |
| R6 | The **"Prijzen · Transparant"** light-green pill above the prijzen H1 must be removed. | U2 |
| R7 | The **Rassenkeuze hulp page** must be redesigned to match the supplied mockup (polished beige split hero → "drie stappen" → "Doe de test" iframe → "Nog geen hond?" cross-link cards → shared rounded footer), using `public/images/rassenkeuze.jpeg` for the hero. | U6 |

**Success criteria:** `npm run build` passes; every page renders correctly in preview
(snapshot/screenshot); footer transition reads soft on all pages; Rassenkeuze page matches the
mockup; no spec-compliance regressions (canonical/sitemap/metadata unchanged for the affected
routes).

---

## Key Technical Decisions

**KTD1 — Keep the live keuzehulp iframe (no native quiz).** The mockup's "Doe de test" block
shows the breed quiz inline; that is the live `keuzehulp.letsdog.nl` app loaded in the embed,
not a flow to rebuild. We restyle the frame/section only. *(owner-locked)* Rebuilding would
duplicate logic that lives in another property — explicitly out of scope.

**KTD2 — Footer rounding mechanism = `rounded-t` on the footer + a guaranteed light backdrop
above it on every page.** The soft corners only read when the area directly above the footer
is light. Approach: (a) give `<footer>` `rounded-t-[2rem]` (radius tuned to mockup) and the
dark-sage `#162A0E` background; (b) set the site's root background to a light brand tone so any
gap behind the corners reveals light; (c) ensure the **last section of every page is light** —
the homepage's dark `FinalCta` is recolored to `#EFE8E4` (owner-confirmed "gray"), and every
other page's final section is audited to confirm it's already light (see U5 Verification).
This is the most robust cross-page approach and matches the mockup, where the dark rounded
footer sits over a light section. *(owner-locked: Option 1 + recolor Begin-vandaag)*

**KTD3 — App-badge parity = equal fixed height + consistent opacity + reorder; accept official
art padding.** The two official badges (Apple SVG 140×42, Google PNG 156×46) have near-identical
aspect ratios but different internal whitespace, and the Apple badge currently carries
`opacity-70`, which reads as "smaller/faded". Render both at the same fixed height with matched
opacity, swap order to Google-left/Apple-right, and tune to equal visual footprint in preview
(may need a small per-badge height nudge to compensate for Apple's transparent margin). Keep the
iOS toast (`Binnenkort beschikbaar`) since iOS isn't shipped.

**KTD4 — Rassenkeuze hero adopts the existing prijzen beige-split-hero pattern; sections inlined
in `page.tsx`; "Nog geen hond?" cards are text-only.** The mockup hero mirrors
`app/prijzen/page.tsx`'s beige upper hero (split text/image, peach accent word, pills, floating
peach badge), so we reuse that proven structure rather than inventing one. The "drie stappen"
section mirrors `components/sections/how-it-works.tsx`. Per the mockup, the three cross-link
cards are **text-only** (eyebrow + title + description + "Bekijken →") — no card images needed.
The page stays a **server component** (CTAs are anchor/Link, no client JS).

**KTD5 — New hero image goes through the project image pipeline.** `public/images/rassenkeuze.jpeg`
has no optimized variants yet. Run `npm run optimize:images`, **commit** the generated
`public/images/optimized/rassenkeuze-{384,768,1280}.{avif,webp}`, and render via
`<OptimizedImage src="/images/rassenkeuze.jpeg" … />` (raw path, no `asset()`) — per the
CLAUDE.md image convention (keeps the Cloudflare build a plain `next build`).

**KTD6 — Delivery: one branch, one atomic commit per unit, one PR, merge-commit to main.**
Per the HANDOFF merge convention (preserve per-unit commits for granular revert). Verify on the
Cloudflare preview URL before merge.

---

## Implementation Units

> Delivery note: units are ordered low-risk content/UX first, then the cross-cutting footer,
> then the page redesign. Each = one commit. U5 and U6 are the substantive ones.

### U1. Retour section 3 → physical-products-only

- **Goal:** Make the "Retourprocedure" section explicit that it covers physical products only.
- **Requirements:** R2
- **Dependencies:** none
- **Files:** `content/retour.md`
- **Approach:** Edit the `## 3. Retourprocedure` heading/body so it's unambiguous that the
  retour-shipping procedure applies to **fysieke producten** (digital subscriptions are governed
  by section 2, not physically returned). Keep tone consistent with the surrounding Dutch copy;
  reuse the existing "Voor digitale abonnementen gelden de regels uit sectie 2." phrasing pattern
  already used in section 4. Likely: retitle to `## 3. Retourprocedure (fysieke producten)` and/or
  add a leading clause scoping it to physical goods. Markdown-only; no TSX touched
  (`LegalPageLayout` renders it at build time).
- **Patterns to follow:** existing scoping language in `content/retour.md` section 4.
- **Test expectation:** none — content/markdown change, no test suite in repo (HANDOFF: verify
  via build + render).
- **Verification:** `npm run build` succeeds; `/retour/` renders section 3 with the
  physical-products scoping; no broken markdown (headings/lists intact).

### U2. Remove "Prijzen · Transparant" pill

- **Goal:** Delete the stray light-green pill above the prijzen page H1.
- **Requirements:** R6
- **Dependencies:** none
- **Files:** `app/prijzen/page.tsx`
- **Approach:** Remove the `<div>` badge block (the green-dot + "Prijzen · Transparant" pill)
  that sits directly above the "Eén juiste aanpak. Drie manieren om te starten." `<h1>`. Leave the
  H1, lead paragraph, pills row, and image column untouched. Confirm spacing above the H1 still
  looks intentional after removal (adjust top margin only if a visible gap remains).
- **Patterns to follow:** n/a (deletion).
- **Test expectation:** none — presentational deletion, no test suite.
- **Verification:** `/prijzen/` no longer shows the pill; H1 spacing reads correctly; build passes.

### U3. Puppyagenda CTA → /prijzen + relabel

- **Goal:** Repoint the "Bekijk de agenda in de app" CTA to the pricing page with a fitting label.
- **Requirements:** R4
- **Dependencies:** none
- **Files:** `app/puppyagenda/page.tsx`
- **Approach:** Change the CTA from an external `<a href="https://app.letsdog.nl" target="_blank">`
  to an internal `next/link` `<Link href="/prijzen">` (drop `target="_blank"`/`rel`), and reword the
  label to match a pricing destination — e.g. **"Bekijk de abonnementen"** (preferred) or "Bekijk de
  prijzen". Keep the existing button styling (green pill). Sanity-check the surrounding paragraph
  copy ("Maak een account en bekijk de preview…") still reads coherently with a pricing CTA; tweak
  only if it now contradicts the destination.
- **Patterns to follow:** internal-Link CTA pattern used in `components/sections/hope.tsx`
  (`<Link href="/prijzen" className="…rounded-full bg-[#75876D]…">`).
- **Test expectation:** none — link/label change, no test suite. Note: `components/analytics/cta-tracker.tsx`
  only fires `cta_clicked` for app/keuzehulp/agenda links, so repointing to an internal `/prijzen`
  route intentionally drops this button from CTA tracking — acceptable (it's now internal nav).
- **Verification:** clicking the button navigates to `/prijzen` (client-side, no new tab); label
  reads correctly; build passes.

### U4. App-store badges — equal size + Android-left / iOS-right

- **Goal:** Make the two store badges the same visual size and reorder Android first, iOS second.
- **Requirements:** R3
- **Dependencies:** none
- **Files:** `components/sections/how-it-works.tsx`
- **Approach:** In the "App Store badges" block: (1) **reorder** so the Google Play (`<a>` → Android)
  badge renders **first/left** and the App Store (`<button>` + toast → iOS) renders **second/right**;
  (2) give both images the **same fixed height** and matched treatment so they read as equal size —
  normalize the Apple badge's `opacity-70` to match the Google badge (full or equal opacity), and
  align the rendered widths (tune height/box so the two official arts occupy an equal footprint).
  Keep the iOS toast behavior (`Binnenkort beschikbaar`) and its `aria-label`; keep the Google
  link `href`. Preserve accessible labels on both.
- **Patterns to follow:** existing badge markup in the same file; `OptimizedImage`/`Image` sizing
  idioms used elsewhere.
- **Test expectation:** none — presentational, no test suite. (Component is `"use client"` for the
  toast `useState`; no logic change.)
- **Verification:** preview screenshot shows Google-left / Apple-right at visually equal size;
  iOS badge still triggers the "Binnenkort beschikbaar" toast on click; Google badge still links
  out; build passes; a11y labels intact.

### U5. Footer restyle (dark sage, rounded, light band) + homepage FinalCta → light

- **Goal:** Replace the hard black footer with a soft dark-sage rounded footer over a light band on
  every page, and recolor the homepage final CTA to light so the transition reads.
- **Requirements:** R5, R1 (preserve copyright space)
- **Dependencies:** none (but is the cross-cutting unit — see System-Wide Impact)
- **Files:** `components/layout/footer.tsx`, `components/sections/final-cta.tsx`,
  `app/layout.tsx` and/or `app/globals.css` (root/body light background)
- **Approach:**
  - **Footer** (`components/layout/footer.tsx`): change `bg-[#141414]` → `bg-[#162A0E]`; add
    `rounded-t-[2rem]` (tune radius to mockup); keep the existing internal layout, links, social
    icons, and the bottom bar. **Preserve** the copyright line exactly:
    `© {new Date().getFullYear()} Let&apos;s Dog. Alle rechten voorbehouden.` (R1 — keep the space).
    Re-check text contrast on `#162A0E` (slightly lighter than `#141414`) — white/60–white/70 still
    passes for the body text; bump a shade only if a link drops below the existing bar.
  - **Light backdrop:** set the site root/body background to a light brand tone (`#EFE8E4`) in
    `app/layout.tsx`/`app/globals.css` so the footer's rounded corners always reveal light.
  - **Homepage FinalCta** (`components/sections/final-cta.tsx`): convert from dark green
    `#162A0E` (white text, dark bg image) to a **light `#EFE8E4` section** with dark `#141414`
    text. Keep the peach `Start vandaag` CTA. Rework the eyebrow/heading/subtext/trust-row colors
    for a light surface (dark text, muted dark for secondary), and either drop the dark background
    photo or convert it to a subtle light treatment — verify legibility. Goal: the homepage now
    ends light, so the rounded footer's soft corners read.
- **Technical design (directional, not spec):** footer transition shape per page —
  `… last content section (LIGHT) ┐  → rounded-t dark-sage footer reveals light at the corners.`
  The invariant: **last section before footer = light** on every page.
- **Patterns to follow:** light beige sections already in the repo (`bg-[#EFE8E4]` in
  `app/prijzen/page.tsx`, `app/puppyagenda/page.tsx`); existing footer internal structure.
- **Test expectation:** none — styling/presentational, no test suite.
- **Verification (cross-page — required):** build passes; then in preview verify the rounded
  light→dark footer transition AND footer copyright spacing on: **homepage, /rassenkeuze (after
  U6), /puppyagenda, /prijzen, /over-ons, /contact, /veelgestelde-vragen, a legal page
  (/retour), and the 404**. For each, confirm the section directly above the footer is light; if
  any page ends on a dark/colored section, note it and extend the fix (add a light closing band or
  recolor) before merge. Confirm `© 2026 Let's Dog.` renders with the space.

### U6. Rassenkeuze hulp page redesign + hero image variants

- **Goal:** Rebuild `app/rassenkeuze/page.tsx` to the mockup; wire the new hero image through the
  optimized pipeline.
- **Requirements:** R7 (and inherits the shared footer from U5)
- **Dependencies:** U5 (shared rounded footer); image pipeline step within this unit
- **Files:** `app/rassenkeuze/page.tsx`, `public/images/optimized/rassenkeuze-*.{avif,webp}`
  (generated + committed), `public/llms.txt` (only if the page description materially changes)
- **Approach:** Replace the page body (keep `export const metadata = pageMetadata({…/rassenkeuze/…})`
  unchanged) with the mockup's section stack:
  1. **Beige split hero** (`bg-[#EFE8E4]`, `pt-32` for navbar clearance): eyebrow "Rassenkeuze
     hulp"; H1 **"Welk ras past `écht` bij jou?"** with `écht` in peach `#FFA580`; lead paragraph;
     primary CTA "Start de rassenkeuze hulp" (green pill, `href="#quiz"` anchor scroll); two pills
     **"Gratis & vrijblijvend"** (green dot) + **"± 2 minuten"** (peach dot). Right column =
     `<OptimizedImage src="/images/rassenkeuze.jpeg" …>` in a rounded frame with a floating peach
     **"✦ Persoonlijk rasadvies"** badge (Sparkles icon).
  2. **"Van vraag naar advies in drie stappen"** (eyebrow "ZO WERKT HET"): three numbered step
     cards — (1) "Beantwoord 10 korte vragen", (2) "Wij matchen op gedrag & leefstijl"
     (wetenschappelijk onderbouwd, gecertificeerde gedragstherapeuten), (3) "Ontvang je
     persoonlijke rasadvies" (direct in beeld, gratis, geen account nodig). Mirror the
     `how-it-works.tsx` card/number styling.
  3. **"Doe de test"** (`id="quiz"`): heading + "Hieronder laadt de rassenkeuze hulp." + the
     **existing** `keuzehulp.letsdog.nl` iframe in a styled rounded card + the "Laadt de
     rassenkeuze hulp niet? Open in een nieuw tabblad" fallback link (keep current iframe attrs:
     `loading="lazy"`, `allow="clipboard-write"`, title).
  4. **"Nog geen hond? Kijk gerust rond"** (light section): lead "Deze test is helemaal gratis…"
     + three **text-only** cross-link cards — GIDS → **Puppyagenda** (`/puppyagenda`), AANPAK →
     **Over ons** (`/over-ons`), LATER → **Prijzen** (`/prijzen`), each with description +
     "Bekijken →".
  5. Shared rounded dark-sage footer (from U5) — page must end on a **light** section (4) so the
     footer corners read.
  - **Image step:** run `npm run optimize:images`; commit the new
    `public/images/optimized/rassenkeuze-*` variants. Confirm filename has no spaces (it doesn't).
  - **Copy:** transcribe Dutch copy from the mockup; keep brand voice. (Optional: run through the
    `brand-guide-letsdog` skill if any line needs polish — not required, mockup copy is approved.)
- **Patterns to follow:** `app/prijzen/page.tsx` (beige split hero + pills + floating peach
  badge), `components/sections/how-it-works.tsx` (numbered steps), existing iframe block in the
  current `app/rassenkeuze/page.tsx`, `OptimizedImage` usage across pages.
- **Test expectation:** none — presentational/content page, no test suite.
- **Verification:** build passes; preview screenshot of `/rassenkeuze` matches the mockup section
  order and styling; hero serves AVIF/WebP (check `<picture>` srcset / network panel); iframe loads
  the live quiz; all cross-links resolve (`/puppyagenda`, `/over-ons`, `/prijzen`); hero CTA scrolls
  to the iframe; page ends light into the rounded footer; metadata/canonical for `/rassenkeuze/`
  unchanged (`curl`/view-source). Per `docs/website-spec-maintenance.md`: route + title/description
  unchanged → sitemap/canonical need no edit; only touch `public/llms.txt` if the page's described
  purpose changed (it doesn't materially).

---

## Scope Boundaries

**In scope:** the 7 items above (R1–R7), the hero image pipeline run, and the cross-page footer
verification.

**Out of scope (true non-goals):**
- Rebuilding the breed quiz natively (KTD1 — keep iframe).
- Any pricing/checkout/CTA *wiring* changes (the open HANDOFF item about Early-Member staging
  URLs is untouched).
- Homepage changes beyond the `FinalCta` recolor required by the footer transition.
- Cookie/analytics/consent behavior.

**Deferred to Follow-Up Work (separate, already-documented backlog — not this PR):**
- 512px image variant (HANDOFF open item #3) — tempting to add while running `optimize:images`,
  but it's a documented standalone optimization; keep this PR scoped. Note it if the new hero shows
  mobile over-delivery in Lighthouse.
- National2 → WOFF2 (HANDOFF #2), privacy `.com`→`.nl` email (HANDOFF #1), `*.pages.dev` noindex
  middleware (HANDOFF #4) — unrelated, stay deferred.

---

## System-Wide Impact

**The footer is a shared layout component (`components/layout/footer.tsx`) rendered by
`app/layout.tsx` on every route.** U5 therefore affects the entire site. The risk is not logic
but visual: the rounded-corner soft transition depends on each page ending on a light section.
Pages to verify (U5 Verification): homepage, /rassenkeuze, /puppyagenda, /prijzen, /over-ons,
/contact, /veelgestelde-vragen, the 5 legal pages (via `LegalPageLayout`), and the 404. Setting a
light root background is the safety net; per-page final-section audit is the guarantee.

No other unit is cross-cutting — U1–U4 and U6 are single-file/single-page.

---

## Risks & Dependencies

| Risk | Likelihood | Mitigation |
|---|---|---|
| A page other than the homepage ends on a dark/colored section → rounded footer corners don't read there. | Medium | U5 audits every page's final section; add a light closing band or recolor where needed before merge. Light root bg is the fallback. |
| Footer text contrast shifts on `#162A0E` (vs `#141414`). | Low | Re-check the white/40–white/70 link/text tints; bump a shade if any drops below the current bar. The known brand-green-contrast limitation is unrelated (footer is dark, not green). |
| Recoloring `FinalCta` to light makes its background photo illegible / loses punch. | Medium | Drop or lighten the dark background image; rebuild text colors for a light surface; verify in preview. |
| App-badge "same size" still looks off due to official-art padding. | Low | Tune per-badge height/box in preview until footprints match; this is a visual-iteration step, not a one-shot. |
| New hero image variants not committed → Cloudflare build can't serve AVIF/WebP / 404s. | Low | Run `npm run optimize:images` and commit `public/images/optimized/rassenkeuze-*` in the same (U6) commit; verify `out/` includes them after build. |
| Transient ugly state if footer rounding is committed before `FinalCta` recolor. | Low | Keep both in U5 (one commit); they ship together. |

**Dependencies:** U6 depends on U5 (shared footer). U1–U4 are independent and can land in any
order. No external/library/service dependencies; no new npm packages.

---

## Verification Strategy

No test suite exists (explicit project decision — HANDOFF). Verification per the project workflow:

1. **Build:** `npm run build` (static export to `out/`) must pass after each unit.
2. **Local preview:** `preview_start("letsdog-website")`; use snapshot/inspect/screenshot to verify
   each change; `preview_resize` for mobile + the footer transition.
3. **Visual proof:** screenshots of the redesigned Rassenkeuze page and the footer transition on a
   light-ending and the (recolored) homepage.
4. **Spec sanity (light):** confirm `/rassenkeuze/` canonical/metadata unchanged; no sitemap edit
   needed (no route/title/description change). Follow `docs/website-spec-maintenance.md` triggers.
5. **Preview-first:** push the branch, verify on `<branch-slug>.website-letsdog.pages.dev` before
   merging (build ~90s).
6. **Merge:** merge-commit to `main` (preserve per-unit commits); delete the branch.

---

## Sources & Research

- Owner Q&A (this session) — locked decisions for KTD1, KTD2, KTD4 image, and the `#EFE8E4` tone.
- Supplied mockup screenshot — the Rassenkeuze redesign + footer reference.
- `CLAUDE.md` — image-optimization convention (`OptimizedImage` + committed sharp variants),
  brand palette, styling conventions, spec-compliance maintenance.
- `HANDOFF.md` — merge convention (merge-commit, per-unit commits), deferred backlog items,
  preview-first discipline, no-test-suite verification approach.
- `docs/website-spec-maintenance.md` — trigger→action→verify matrix for content/route/image changes.
- Repo files read during planning: `components/layout/footer.tsx`, `content/retour.md`,
  `app/prijzen/page.tsx`, `app/puppyagenda/page.tsx`, `app/rassenkeuze/page.tsx`,
  `components/sections/how-it-works.tsx`, `components/sections/final-cta.tsx`,
  `components/sections/hope.tsx`, `components/sections/breed-selector.tsx`,
  `components/sections/hero.tsx`, `components/shared/section-wrapper.tsx`, `app/page.tsx`.
- `docs/solutions/` checked — no load-bearing prior learnings for this presentational work.
