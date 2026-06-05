---
title: "A pricing-tier change fans out to ~6 surfaces — edit the shared <Pricing> tiers + every mirror in lockstep"
date: 2026-06-05
category: conventions
module: pricing / components/sections/pricing.tsx
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Adding, removing, or repricing a membership tier on the Let's Dog site
  - Changing how many tiers exist (the "Drie/Twee manieren" framing in copy)
  - Any edit to the `tiers` array in components/sections/pricing.tsx
tags: [pricing, structured-data, json-ld, llms-txt, content-sync, single-source, gotcha, seo]
---

# A pricing-tier change fans out to ~6 surfaces — edit them in lockstep

## Context

The tier data lives in **one** place — the `tiers` array in
`components/sections/pricing.tsx` — and the `<Pricing>` component is rendered by
**both** the homepage (`app/page.tsx`) and `/prijzen` (`app/prijzen/page.tsx`),
so the cards + the Product JSON-LD `offers` update from a single edit. **But the
same facts are also re-stated as prose in several other files**, and those do
**not** derive from the array. Miss one and the site silently contradicts itself
or ships stale structured data (Google penalises out-of-sync JSON-LD). When the
"Jaar + Consult" tier was removed (2026-06-05), the array edit was one file; the
copy sweep was five more.

## The fan-out — surfaces to update for any tier add/remove/rename/reprice

| # | File | What mirrors the tier data | Auto or manual |
|---|---|---|---|
| 1 | `components/sections/pricing.tsx` | `tiers` array **+ the `Tier` `key` union type** | manual (source of truth) |
| 2 | `lib/structured-data.ts` → `productLd()` | `offers` map over `tiers` **(auto)**; but the `description` prose ("Drie/Twee manieren") is **hardcoded** | mixed |
| 3 | `app/prijzen/page.tsx` | hero `<h1>` ("…Twee manieren om te starten."), `metadata` description, **and** any tier-naming FAQ answer | manual |
| 4 | `app/veelgestelde-vragen/faq-data.ts` | the "Wat kost het abonnement?" answer — **also feeds FAQPage JSON-LD** (CLAUDE.md: faq-data is shared by the page and the markup — keep in sync) | manual |
| 5 | `public/llms.txt` | the `[Prijzen]` line enumerating the tiers + count | manual |
| 6 | `content/retour.md` | the return-policy "### Jaarabonnement (…)" heading enumerates the annual plans by name | manual |

Counting framings ("**Drie** manieren", "**Drie** smaken", "**Drie** abonnementen")
are scattered across #3–#6 — grep the number-word too, not just the tier name.

## Verification — grep the BUILT HTML, not the source or a DOM snapshot

After `npm run build`, the deterministic check is:

```bash
grep -rl "Jaar + Consult" out/   # must return nothing
```

Why the built output and not a live DOM snapshot:
- The pricing FAQ uses a **Radix-style Accordion that unmounts collapsed panels** —
  the answer text isn't in the DOM (or `innerText`/`textContent`) until expanded,
  so `preview_snapshot`/`preview_eval` miss it. Either expand the item or grep `out/`.
- JSON-LD (`productLd`, `faqPageLd`) and rendered markdown (`retour.md`) only
  appear in the built HTML — a source grep can miss the *rendered* shape.

## Gotcha — the subscription tier vs the standalone consult service

"Jaar + Consult" (the removed **subscription tier**) is **not** the standalone
**paid consult service** (`https://app.letsdog.nl/consult/`, €39,50 — the
"Boek/Plan een consult" cards on `/contact` and `/over-ons`). They share the word
"consult". A blind sweep for `consult` would break the live service's links/CTA.
Filter by the tier name / price (€79 / €119 / €138,50), not the bare word.

## Related

- Re-centering the reduced card set: the real lever is the **width system**, not
  `mx-auto`. Use a rem-based `max-w-*` consistent with the section's other
  centered rows and verify both sides of the **1440px root-font breakpoint** —
  see [`../developer-experience/rem-max-width-shrinks-under-fluid-root-font-size.md`](../developer-experience/rem-max-width-shrinks-under-fluid-root-font-size.md).
- The homepage Pricing section screenshots blank (scroll-reveal) — verify via DOM
  geometry / built HTML, see
  [`../developer-experience/preview-screenshots-blank-on-scroll-reveal.md`](../developer-experience/preview-screenshots-blank-on-scroll-reveal.md).
