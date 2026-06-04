---
title: "feat: Homepage colour-rhythm (Option A Zachtgroen) + CTA & nav-label copy"
type: feat
status: active
date: 2026-06-04
---

# feat: Homepage colour-rhythm (Option A "Zachtgroen") + CTA & nav-label copy

## Summary

Recolour the homepage section bands to the approved **Option A "Zachtgroen"** rhythm — a strict **soft-green (`--ld-green-soft` / `#E6ECE3`) ↔ white** alternation through the middle of the page, with Hero, Pricing and the footer left on their fixed colours. Plus two small copy changes: the two large primary CTA buttons (hero + bottom CTA) become **"Start de cursus vandaag"**, and the **"Puppyagenda" nav/section label** becomes **"Puppycursus"** (route and page body unchanged).

This is colour + copy only — **no layout, image, or content/prose changes**. The approved reference is the HTML mock-up at `/Users/jurriaan/Desktop/letsdog-homepage-color-mockup/homepage-color-bands.html` (built from the design handoff in `/Users/jurriaan/Desktop/design_handoff_homepage_colors/`).

---

## Requirements

### Colour rhythm (Option A)

- R1. The middle homepage bands alternate soft-green ↔ white: **Herkenbaar?** (`problem`) → soft-green, **Wat je krijgt** (`hope`) → white (unchanged), **De Puppyagenda/cursus** (`puppy-agenda-teaser`) → soft-green, **Final CTA** (`final-cta`) → soft-green. Soft-green uses the existing token `bg-[var(--ld-green-soft)]`.
- R2. The current single **Trust** band (Stats + Reviews + Certificeringen on one beige section) renders as **three separate bands**: Stats → white, Reviews/testimonials → soft-green, Certificeringen → white.
- R3. No colour seam at the Hero→Problem transition: the hero's bottom fade, currently fading to `--ld-beige`, fades to `--ld-green-soft` to match the new Problem band.
- R4. Fixed bands are untouched: Hero (brand green), Pricing (brand green), Rassentest banner (white + blue card), Footer (forest).
- R5. No accent-level recolouring: pain-point icon tiles (lime), benefit tiles (beige), all eyebrows (`tone="brand"`), gold stars, quote icons, phase-card icon tiles, etc. stay exactly as they are. Only **section background** colours change.

### Copy

- R6. The hero primary button and the bottom Final-CTA primary button both read **"Start de cursus vandaag"** (both are already `variant="peach"` — no colour change). The compact navbar "Start vandaag" button is **unchanged**.

### Nav / section / page label rename

- R7. The primary nav (navbar), the footer nav, and the homepage teaser section label read **"Puppycursus"** instead of "Puppyagenda". The `/puppyagenda` **route is unchanged**.
- R8. The `/puppyagenda` page's **metadata title** ("page name") reads **"Puppycursus — Let's Dog"**. The page's on-screen body content is **unchanged**.
- R9. The rename is scoped to **labels/names**, not running prose (see Scope Boundaries for the exact include/exclude list).

---

## Key Technical Decisions

- **Reuse the existing `--ld-green-soft` token, don't hardcode the hex.** `--ld-green-soft: #E6ECE3` is already defined in `app/ld-tokens.css` and already consumed as `bg-[var(--ld-green-soft)]` in `components/sections/puppyagenda/phase-explorer.tsx`, so the Tailwind arbitrary-value class is a proven pattern needing no `globals.css` change. It matches the handoff hex exactly and, like the `--ld-beige` it replaces, tracks dark-mode token swaps automatically.
- **Trust split stays one component.** `Trust` returns a fragment of three `<SectionWrapper>`s rather than splitting into three exported components — so `app/page.tsx` stays unchanged and the stats/testimonials/certification data arrays remain co-located. Each `SectionWrapper` already supplies `py-20 lg:py-28`, so the now-redundant internal `mb-20 pb-20 border-b` dividers between the three blocks are dropped and section padding carries the rhythm.
- **Preserve the `#bewijs` anchor.** It currently sits on the combined Trust section; keep `id="bewijs"` on the first of the three new bands (Stats) so any external deep-link lands at the same place. (No inbound `#bewijs` links exist in-repo, but preserve for safety.)
- **"Page name" = the SEO/metadata title, not the URL.** In the clarifying question the user accepted "the `/puppyagenda` URL stays unchanged" in every option, so "rename the page name" is read as the `pageMetadata({ title })` value. The route, internal `href="/puppyagenda"` links, sitemap entry, and page body are all left intact (no 301/redirect work).
- **Rename is label-scoped, not a prose find-replace.** "Everywhere" was the answer to a question scoped to nav + footer + homepage section + page name. Running-prose mentions of "de puppyagenda" (testimonials, FAQ, over-ons, OG description, llms.txt, page body) are deliberately left unchanged to avoid unrequested copy churn — flagged for confirmation.

---

## Implementation Units

### U1. Recolour the straightforward soft-green bands + hero fade

**Goal:** Apply the soft-green band colour to the three simple sections and fix the hero→Problem transition seam.
**Requirements:** R1, R3.
**Dependencies:** none.
**Files:**
- `components/sections/problem.tsx` — section bg `bg-[var(--ld-beige)]` → `bg-[var(--ld-green-soft)]`
- `components/sections/puppy-agenda-teaser.tsx` — section bg `bg-[var(--ld-bg-sunken)]` → `bg-[var(--ld-green-soft)]` (the `SectionWrapper` className only; leave the beige phase-card icon tiles untouched)
- `components/sections/final-cta.tsx` — section bg `bg-[var(--ld-beige)]` → `bg-[var(--ld-green-soft)]`
- `components/sections/hero.tsx` — bottom-fade gradient `from-[var(--ld-beige)]` → `from-[var(--ld-green-soft)]` (line ~95)
**Approach:** Pure className swaps. `hope.tsx` is intentionally not in this list — it is already `bg-white` and stays white.
**Patterns to follow:** existing `bg-[var(--ld-green-soft)]` usage in `components/sections/puppyagenda/phase-explorer.tsx`.
**Test scenarios:** Test expectation: none — static styling change, verified visually in Phase "Verification".
**Verification:** In the preview, Problem / Puppyagenda / Final-CTA bands render soft-green `#E6ECE3`; the hero's lower edge fades into soft-green with no beige strip above the Problem band.

### U2. Split Trust into three alternating bands

**Goal:** Turn the single beige Trust section into Stats (white) / Reviews (soft-green) / Certificeringen (white) so the rhythm continues.
**Requirements:** R2.
**Dependencies:** none (independent of U1, but conceptually part of the same rhythm).
**Files:**
- `components/sections/trust.tsx` — return a fragment of three `<SectionWrapper>`s: Stats (`bg-white`, keep `id="bewijs"`), Testimonials (`bg-[var(--ld-green-soft)]`), Certifications + NVGH logo (`bg-white`). Remove the inter-block `mb-20 pb-20 border-b` spacing/divider now that each block is its own padded section.
**Approach:** Move the three existing content blocks into three wrappers; keep all card markup, gold stars, quote icons, and the centered headers exactly as-is. `app/page.tsx` keeps rendering a single `<Trust />`.
**Patterns to follow:** the `SectionWrapper` usage already in `problem.tsx` / `hope.tsx` (className for bg, `py-20 lg:py-28` padding is built in).
**Test scenarios:** Test expectation: none — structural/styling change, verified visually. Confirm the `#bewijs` anchor still scrolls to the stats band.
**Verification:** Three distinct bands render white → soft-green → white; vertical spacing between them looks even (no doubled or collapsed gaps); stars/quotes/cards unchanged.

### U3. CTA copy → "Start de cursus vandaag"

**Goal:** Update the two large primary CTAs.
**Requirements:** R6.
**Dependencies:** none.
**Files:**
- `components/sections/hero.tsx` — hero button text "Start vandaag" → "Start de cursus vandaag" (line ~61)
- `components/sections/final-cta.tsx` — bottom CTA button text "Start vandaag" → "Start de cursus vandaag" (line ~25)
**Approach:** Text-only. Both buttons are already `variant="peach"`; no styling change. The navbar's `variant="brand"` "Start vandaag" button (`components/layout/navbar.tsx` ~line 115 + mobile ~line 167) is **left unchanged**.
**Test scenarios:** Test expectation: none — static copy change, verified visually.
**Verification:** Hero and bottom-CTA buttons read "Start de cursus vandaag" and don't overflow/wrap awkwardly at mobile width; navbar button still reads "Start vandaag".

### U4. Rename "Puppyagenda" → "Puppycursus" (labels + page title + docs)

**Goal:** Rename the navigation/section label and the page's SEO title, leaving the route and prose intact.
**Requirements:** R7, R8, R9.
**Dependencies:** none.
**Files (label/name occurrences — rename):**
- `components/layout/navbar.tsx:12` — `links` label "Puppyagenda" → "Puppycursus" (drives desktop + mobile; `href:"/puppyagenda"` unchanged)
- `components/layout/footer.tsx:8` — `navLinks` label "Puppyagenda" → "Puppycursus" (href unchanged)
- `components/sections/puppy-agenda-teaser.tsx:89` — homepage section eyebrow "De puppyagenda" → "De puppycursus"
- `app/puppyagenda/page.tsx:9` — `pageMetadata` title "Puppyagenda — Let's Dog" → "Puppycursus — Let's Dog"
- `app/not-found.tsx:15` — 404 quick-nav label "Puppyagenda" → "Puppycursus" (consistency; href unchanged) — *flagged, see Open Questions*
- `app/rassenkeuze/page.tsx:39` — related-links card title "Puppyagenda" → "Puppycursus" (href unchanged) — *flagged, see Open Questions*
- `CLAUDE.md` — "Navigation Order" line: `… | Puppyagenda | …` → `… | Puppycursus | …`
**Files (deliberately NOT changed — prose/route, see Scope Boundaries):** `app/layout.tsx` OG description, `app/veelgestelde-vragen/faq-data.ts`, `app/over-ons/page.tsx`, `components/sections/final-cta.tsx` body sentence, `components/sections/trust.tsx` testimonial quote, `public/llms.txt`, the `/puppyagenda` page body (`components/sections/puppyagenda/*`), `app/sitemap.ts` route.
**Approach:** Targeted string edits at the listed lines only. Do **not** run a blanket find-replace.
**Test scenarios:** Test expectation: none — copy change, verified visually + by clicking the nav item to confirm it still routes to `/puppyagenda`.
**Verification:** Navbar (desktop + mobile), footer, and homepage section all read "Puppycursus"; clicking the nav item still loads `/puppyagenda`; the page's browser-tab title reads "Puppycursus — Let's Dog"; page body still reads "Puppyagenda".

---

## Scope Boundaries

**In scope:** homepage section background colours (Option A rhythm), the Trust 3-band split, the hero-fade companion fix, the two large CTA button labels, and the "Puppyagenda → Puppycursus" label/title rename listed in U4.

**Explicitly NOT changing:**
- **Layout, spacing structure, images, photography** — none.
- **Accent colours** — pain-point icon tiles, benefit tiles, eyebrows, gold stars, quote icons, phase-card tiles all stay (user explicit: no accent tweaks).
- **Fixed bands** — Hero bg, Pricing bg, Rassentest banner, Footer.
- **Navbar chrome** — the scrolled `bg-[var(--ld-beige)]/95` bar and mobile-menu `bg-[var(--ld-beige)]` stay beige (chrome, not a content band; not part of the Option A handoff).
- **The `/puppyagenda` route** and all internal `href="/puppyagenda"` links, the sitemap entry, and canonical paths — no URL change, no redirects.
- **The `/puppyagenda` page body** — PaHero H1, steps, progress, phases, closing CTA copy.
- **Running-prose mentions of "de puppyagenda"** — OG description (`app/layout.tsx`), FAQ answers (`faq-data.ts`), over-ons copy, the Final-CTA body sentence, the Trust testimonial quote, and `llms.txt`. These describe the feature in prose and are left as "puppyagenda" to avoid unrequested copy churn.

### Deferred to follow-up work
- If the broader "puppyagenda → puppycursus" prose rename is wanted, it's a separate, larger copy pass (touches FAQ, over-ons, OG/SEO description, llms.txt, page body) with its own SEO review.

---

## Open Questions / Assumptions

These are defaults chosen from the conversation; confirm or flip at review (nothing is built yet):

1. **"Page name" = metadata title** (not the URL). Assumed because the URL-stays wording was accepted in the clarifying question. If the URL should actually become `/puppycursus`, that's a bigger SEO change (route rename + 301 in `public/_redirects` + `sitemap.ts` + every internal link + canonical) and would be its own unit.
2. **Rename = labels/names, not prose.** Assumed narrow scope (see Scope Boundaries). If "everywhere" was meant literally (including testimonials/FAQ/over-ons/OG/llms.txt), widen U4.
3. **Secondary nav labels included.** The 404 quick-nav (`not-found.tsx`) and the rassenkeuze related-links card (`rassenkeuze/page.tsx`) are renamed for consistency since they're navigation labels. Easy to exclude if you'd rather only touch the main nav + footer.
4. **Homepage eyebrow phrasing** — "De puppyagenda" becomes "De puppycursus" (keeps the existing "De …" article). The "Bekijk de hele agenda" button on that section uses "agenda" in its generic sense and is left unchanged; flag if you'd prefer "Bekijk de hele cursus".

---

## Verification

This is fully previewable (homepage + the two changed strings):

1. `preview_start("letsdog-website")`, load `/`.
2. Visually confirm the band rhythm top→bottom: green (hero) → soft-green → white → soft-green → white → soft-green → white → green (pricing) → soft-green → white (banner) → forest. Cross-check against the approved mock-up.
3. Confirm no beige seam under the hero; confirm the three former-Trust bands are evenly spaced.
4. Confirm both large CTAs read "Start de cursus vandaag"; navbar button still "Start vandaag".
5. Confirm "Puppycursus" in navbar (desktop + mobile via `preview_resize`), footer, and homepage section; click it → still routes to `/puppyagenda`; tab title is "Puppycursus — Let's Dog".
6. `preview_resize` mobile + desktop screenshots as proof.
7. Delivery via `/new-feature` (branch → Cloudflare preview build → verify on `<branch>.website-letsdog.pages.dev` → PR → merge). No `optimize:images`/asset regeneration needed (no image changes). No sitemap/canonical changes (no route change).

---

## Sources / Research

- Approved colour reference: `/Users/jurriaan/Desktop/letsdog-homepage-color-mockup/homepage-color-bands.html` (built this session from the handoff).
- Design handoff: `/Users/jurriaan/Desktop/design_handoff_homepage_colors/` (`README.md`, `landing-a.jsx` theme object `A`, `tokens.css`).
- Token definition: `app/ld-tokens.css` (`--ld-green-soft: #E6ECE3`); existing consumer `components/sections/puppyagenda/phase-explorer.tsx`.
- Section padding contract: `components/shared/section-wrapper.tsx` (`px-6 lg:px-8 py-20 lg:py-28`).
- Occurrence sweep for the rename captured in U4 (labels vs prose vs route).
