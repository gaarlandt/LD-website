---
title: "Over ons + FAQ page redesign (beige split-hero, Onze methode grid, numbered FAQ + jump-nav)"
date: 2026-05-31
topic: over-ons-faq-redesign
type: feat
depth: standard
---

# Over ons + FAQ page redesign

## Summary

Redesign `/over-ons` and `/veelgestelde-vragen` to the two supplied mockups, moving both off the legacy green-band hero onto the **beige split-hero pattern** already shipped on `/contact`, `/rassenkeuze`, and `/prijzen`. Over ons gains a split hero (Elien photo + certification badges + dual CTAs), a "Mijn verhaal" story section with a peach pull-quote, a **new 4-card "Onze methode" grid**, restyled horizontal certification cards, and a two-button closing CTA. FAQ gains a split hero with a **clickable category-overview card** and a **continuously-numbered (01–12) accordion** grouped under the existing four categories. All copy stays Dutch; the FAQ data file stays the single source of truth for the list, the category counts, and the FAQPage JSON-LD.

---

## Problem Frame

`/over-ons` and `/veelgestelde-vragen` are the **last two pages still on the old green-band hero** (`bg-[#75876D] pt-32 … flex items-end`). Every other top-level marketing page — contact, rassenkeuze, prijzen — was moved to the beige split-hero during recent redesigns, so these two now read as visually out of step with the rest of the site.

Beyond the hero, the current pages under-deliver against the mockups:

- **Over ons** flattens its four method principles into a row of checkmark bullets inside the story block. The mockup promotes them to a first-class **"Onze methode"** 4-card section — the page's clearest statement of *what Let's Dog stands for* — and adds a pull-quote, a richer hero with trust badges, and a second CTA ("Plan een consult") that the current single-button CTA lacks.
- **FAQ** is a plain stacked accordion with no wayfinding. With 12 questions across 4 categories, a visitor can't see the shape of the page or jump to what they need. The mockup adds a **category-overview card** (with per-category counts) that doubles as jump-navigation, and **continuous numbering** so the list reads as a curated set rather than an undifferentiated stack.

The constraints are the usual ones for this repo: **static export, no SSR**; inline Tailwind with hard-coded brand hex; Dutch copy; **no automated test suite** (verify via `npm run build` + the Cloudflare branch-preview); and every page must **end on a light section** so the footer's rounded-corner transition renders correctly.

---

## Key Decisions

- KD1 — **Inline-copy the beige split-hero per page; do not extract a shared component.** This matches the project's inline-Tailwind, copy-the-pattern convention (rassenkeuze and contact each inline their own hero) and the owner's explicit instruction to "just copy what we have on the other pages." Four usages exist after this work, but they differ enough (pills vs. badges vs. a category card; CTA vs. modal-trigger; image aspect) that a shared abstraction would be awkward. Extraction is deferred, not done.
- KD2 — **FAQ jump-links are plain `#` anchors riding the existing global smooth-scroll**; no scroll JavaScript. `app/globals.css` already sets `scroll-behavior: smooth` globally (and `auto` under `prefers-reduced-motion`). Each category section gets an `id` plus a `scroll-margin-top` offset so its heading clears the fixed navbar instead of hiding under it.
- KD3 — **Continuous numbering and per-category counts are derived from `faq-data.ts` at render time**, never hardcoded. This protects R13 (data / JSON-LD sync): adding or removing a question updates the visible list, the overview-card count, and the numbering in one place.
- KD4 — **"Plan een consult" uses `https://app.letsdog.nl/consult/` as the interim destination** (matching the contact page's "Boek een consult"), pending the owner's real purchasable consult product URL. This is an owner action, not a planning blocker — see Outstanding.
- KD5 — **The new "Onze methode" cards reuse the existing card idiom** (`rounded-2xl`, soft shadow, soft-tinted icon tile) seen on the rassenkeuze "drie stappen" and over-ons cert cards. Net-new section, not a net-new visual language.

---

## Requirements

### Shared / consistency (both pages)

- R1. Both pages replace their green-band hero with the established **beige split-hero** pattern — mirror `app/rassenkeuze/page.tsx` / `app/contact/contact-content.tsx` (beige section → `max-w-7xl` 2-col grid → peach-accent H1 + subhead + `bg-white/70` pills/badges + `OptimizedImage` with a floating peach tag). Dutch copy, brand colors inline.
- R2. Both pages **end on a light (`#EFE8E4`) section** so the dark-sage footer's `rounded-t` + `-mt-10` transition reveals a light band above it (HANDOFF fix #5).
- R3. All **"Start vandaag" CTAs link to `/prijzen`** (sitewide convention) via `next/link`; external app links use `app.letsdog.nl`.
- R4. Existing SEO/asset infrastructure is **preserved**: `Person` JSON-LD on over-ons, `FAQPage` JSON-LD on FAQ, per-page metadata via `pageMetadata()`, and photographic images served through `OptimizedImage`.

### Over ons

- R5. **Hero (beige split):** peach-accent H1 "Expertise én empathie. Niet **één van de twee.**", a founder subhead, **three certification badges** ("Gecertificeerd gedragstherapeut" / "NVGH-erkend" / "Geen dwang — nooit"), an Elien photo with an "Elien · oprichtster" tag, and **two CTAs** — "Start vandaag" (→ `/prijzen`) and "Lees haar verhaal" (anchors to the story section).
- R6. **"Mijn verhaal" story section:** eyebrow, H2 "Ik heb gezien wat er mis kan gaan. Dat hoeft niet.", the story paragraphs, and a **peach left-border pull-quote**: "Je pup leert niet sneller als jij harder je best doet. Hij leert sneller als jij begrijpt wat hij nodig heeft." This section carries the anchor target for "Lees haar verhaal".
- R7. **New "Onze methode" section:** eyebrow "Onze methode" + H2 "Waar Let's Dog op gebouwd is" + subhead, and a **4-card grid** (icon + title + description). The four principles currently rendered as checkmark bullets become first-class cards: *Geen fysieke correcties — nooit* / *Welzijn van hond én eigenaar centraal* / *Wetenschappelijk onderbouwd* / *Toegankelijk voor elk ras*.
- R8. **Certifications restyled** to horizontal cards (icon left, text right) for NVGH + Raad van Beheer under "Erkend. Wetenschappelijk. Betrouwbaar.", with the certification logo image retained below.
- R9. **Closing CTA** "Klaar om te beginnen?" with **two buttons**: "Start vandaag" (→ `/prijzen`) and "Plan een consult" (→ consult product; see Outstanding). Rendered as a bordered card on the light section so the page ends light (R2).

### FAQ

- R10. **Hero (beige split):** peach-accent H1 "Vragen? Wij hebben de **antwoorden.**", subhead, a "Stel je vraag" CTA (→ `/contact`), and a **category-overview card** in the second column.
- R11. The category-overview card lists the **four categories with a live per-category count** (derived from the data, never hardcoded). **Each row is a clickable anchor** that smooth-scrolls to its category section.
- R12. The FAQ list is **grouped by the four existing categories**, each with a category label and an **anchor `id`** (offset by `scroll-margin-top` to clear the fixed navbar). Questions remain an **accordion** (expand/collapse retained) and are **numbered continuously 01–12** across categories.
- R13. **`app/veelgestelde-vragen/faq-data.ts` stays the single source of truth** so the rendered list, the overview-card counts, the continuous numbering, and the `FAQPage` JSON-LD all stay in sync.

---

## Acceptance Examples

- AE1. **Covers R11, R12.** Given the FAQ page, when the visitor clicks the "Training" row in the overview card, the page smooth-scrolls to the Training section and its category label is fully visible **below** the fixed navbar (not clipped under it).
- AE2. **Covers R11, R13.** Given a new question added to `faq-data.ts`, when the page rebuilds, the overview-card count for that category, the continuous numbering, and the `FAQPage` JSON-LD all reflect it with no other edits.
- AE3. **Covers R12.** Given the four categories with 3 / 3 / 4 / 2 questions, the visible numbering runs **01–12 continuously** (Over de app 01–03, Training 04–06, Abonnement & betaling 07–10, Technisch 11–12) — it does not restart at 01 per category.
- AE4. **Covers R5, R6.** Given the over-ons hero, when the visitor clicks "Lees haar verhaal", the page scrolls to the "Mijn verhaal" section.
- AE5. **Covers R2.** Given a visitor with `prefers-reduced-motion`, anchor jumps still land on the correct section (the global stylesheet switches `scroll-behavior` to `auto`), so wayfinding works without motion.

---

## Scope Boundaries

**In scope:** the two page redesigns, the shared consistency items (R1–R4), capturing the consult-URL owner action, and the `HANDOFF.md` update that records it.

### Deferred for later
- **Dedicated / exact hero photography.** Both pages reuse the existing `public/images/elien.jpeg`; the owner can drop the exact mockup photo into `public/images/` later (then `npm run optimize:images` + commit variants), mirroring the contact-hero placeholder pattern.
- **Extracting a shared `<BeigeSplitHero>` component.** Four inline copies exist after this work; revisit only if a fifth consumer appears (KD1).

### Out of scope
- Navbar, footer, and all other pages — untouched.
- **Creating the consult WooCommerce product itself** — owner action (the CTA wires to an interim URL until then).
- The two standing optional follow-ups (National2 → WOFF2; contact-hero photo swap) and the skipped `*.pages.dev` noindex item.

---

## Dependencies / Assumptions

- **Photos:** `public/images/elien.jpeg` is reused for both the hero and the story section (different crops/aspects). Owner-supplied hedge photo is a later swap.
- **Icons:** Lucide React (already a dependency) for the method-card and cert-card icons; the certification logo (`public/images/NVGH Logo.jpeg`) is retained via `next/image` (its filename has a space, tolerated because it is not served through `OptimizedImage`/`srcset`).
- **Smooth scroll + offset:** relies on the global `scroll-behavior: smooth` in `app/globals.css`; the only new CSS is a `scroll-margin-top` on the anchor targets.
- **No test suite:** verification is `npm run build` + visual check on the Cloudflare branch-preview (`<branch>.website-letsdog.pages.dev`) before merge — `functions/`-style server caveats do not apply (these are static pages).
- **FAQ stays a client component** (the accordion uses `useState`); anchor links and global smooth-scroll work unchanged within it.

---

## Outstanding Questions / Owner Actions

- OA1 — **Consult product / destination URL (owner action; not a planning blocker).** "Plan een consult" needs a real purchasable consult destination — most likely a WooCommerce checkout URL like the pricing tiers (`…/checkout/?add-to-cart=<consult-SKU>`), not just the generic app link. **Interim:** wire to `https://app.letsdog.nl/consult/` (same as the contact page). **Owner must create/confirm the final URL.** This ties into the existing HANDOFF open item *"Pricing CTAs — … wire each [tier] to its own WooCommerce product when Jur supplies the SKU."* The plan must carry this as an owner-config dependency, **and it must be added to `HANDOFF.md`** as an open item.

---

## Sources / Research

- **Authoritative design input:** the two supplied mockup screenshots (over-ons full page; FAQ page).
- **Beige split-hero pattern to mirror:** `app/rassenkeuze/page.tsx`, `app/contact/contact-content.tsx` (pills/badges, peach-accent H1, `OptimizedImage` + floating peach tag).
- **Current state being replaced:** `app/over-ons/page.tsx`; `app/veelgestelde-vragen/page.tsx` + `faq-content.tsx` + `faq-data.ts`.
- **Behavioral primitives:** `app/globals.css` (`scroll-behavior: smooth` at ~L52; `auto` under reduced-motion at ~L104); `components/sections/final-cta.tsx` (closing-CTA idiom, ends light `#EFE8E4`); `components/sections/pricing.tsx` (consult-tier `ctaHref` precedent).
- **Conventions / constraints:** `HANDOFF.md` — "Start vandaag" → `/prijzen`, footer-must-end-light (fix #5), the consult/WooCommerce SKU open item, merge-commit + preview-first discipline, no test suite. `CLAUDE.md` — brand palette, OptimizedImage convention, static-export rules.
- **Informational only (not a design input):** `docs/HANDOFF-pr17-contact-form.md:87` — the "opusplan" note explains that `/ce-plan`/`/ce-brainstorm` are *skills*, not Claude Code's built-in plan mode, so the model does not auto-switch Opus→Sonnet mid-run. Bears on model/cost selection, not on these page designs.
