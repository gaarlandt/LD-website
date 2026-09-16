---
title: "A pricing change fans out to several surfaces — edit the shared `tiers` data + every mirror in lockstep"
date: 2026-06-05
category: conventions
module: pricing / components/sections/pricing-data.ts
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Adding, removing, or repricing a membership plan on the Let's dog site
  - Changing how many plans exist or their framing (the "Twee manieren" count in copy)
  - Any edit to the `tiers` array in components/sections/pricing-data.ts (incl. the checkout add-to-cart / productId)
tags: [pricing, structured-data, json-ld, llms-txt, content-sync, single-source, gotcha, seo]
---

# A pricing change fans out to several surfaces — edit them in lockstep

## Context

The plan data lives in **one** place — the `tiers` array in
`components/sections/pricing-data.ts` (pure data, no `"use client"`). It's consumed by
`pricing-plans.tsx` (Jaarlijks stacked above Maandelijks), which is rendered by **both**
the homepage `<Pricing>` section and `/prijzen` — and every *derived* figure (per-year
total, savings %, per-month equivalent, the struck-through list price) is computed from
`priceValue` / `listPriceValue` in that module, so the cards + the Product JSON-LD
`offers` update from a single edit. **But the same facts are also re-stated as prose in
several other files**, and those do **not** derive from the array. Miss one and the site
silently contradicts itself or ships stale structured data (Google penalises out-of-sync
JSON-LD).

The current model is **two plans**: **Flexibel** (`key: "flex"`, €14,99/maand) and
**Early Member** (`key: "early"`, €59 het eerste jaar, daarna €119/jaar), both with a
7-day free trial since T-85. When the old
multi-tier "Drie/Twee manieren" set was replaced by a monthly/yearly toggle card (2026-06),
the array edit was one file; the copy + structured-data sweep was several more. That toggle
itself was replaced by the stack on 2026-09-16 (T-85, Jur's call) — the fan-out below did
not change with it, because it was never about the module.

## The fan-out — surfaces to update for any plan add/remove/rename/reprice

| # | File | What mirrors the plan data | Auto or manual |
|---|---|---|---|
| 1 | `components/sections/pricing-data.ts` | `tiers` array **+ the `Tier` `key` union (`"flex" \| "early"`)** + the checkout `add-to-cart` IDs and `productId` (begin_checkout analytics) | manual (source of truth) |
| 2 | `lib/structured-data.ts` → `productLd()` | `offers` map over `tiers` **(auto)**; but the `description` prose ("Twee manieren…") is **hardcoded** | mixed |
| 3 | `app/prijzen/page.tsx` | hero `<h1>` ("…Twee manieren om te starten."), `metadata` description, **and** the on-page pricing FAQ answers (`faqs` array — a separate mirror from faq-data.ts) | manual |
| 4 | `app/veelgestelde-vragen/faq-data.ts` | the "Wat kost het abonnement?" answer — **also feeds FAQPage JSON-LD** (CLAUDE.md: faq-data is shared by the page and the markup — keep in sync) | manual |
| 5 | `public/llms.txt` | the `[Prijzen]` line enumerating the plans + count | manual |

Counting framings ("**Twee** manieren", "**Twee** smaken", "**Twee** abonnementen") are
scattered across #2–#5 — grep the number-word too, not just the plan name. (The return
policy `content/retour.md` used to enumerate the annual plan by name; it was rewritten to
generic "abonnement" / "jaarabonnement" prose and is **no longer** a per-plan mirror —
don't re-add plan names there.)

## Verification — grep the BUILT HTML, not the source or a DOM snapshot

After `npm run build`, the deterministic check is to grep `out/` for a string from the
**old / removed** plan (a name or a price) and confirm it returns nothing:

```bash
grep -rl "<old plan name or price>" out/   # must return nothing
```

Why the built output and not a live DOM snapshot:
- The pricing FAQ uses a **Radix Accordion that unmounts collapsed panels** — the answer
  text isn't in the DOM (or `innerText`/`textContent`) until expanded, so
  `preview_snapshot`/`preview_eval` miss it. Either expand the item or grep `out/`.
- JSON-LD (`productLd`, `faqPageLd`) and rendered markdown only appear in the built HTML —
  a source grep can miss the *rendered* shape.
- **Grep `out/_next/static` too, not only the HTML.** This bit on 2026-09-15: the module was
  still a toggle card then, it server-rendered only its default view (Jaarlijks), and
  "Start 7 dagen proef" gave 0 HTML files and 1 JS chunk — a removed monthly string would have
  read as "gone" while it had simply never been in the HTML. Since 2026-09-16 both plans are
  server-rendered (the stack), so the HTML carries every string again; keep grepping the chunks
  anyway, because any future state in this module lands there and nowhere else.

## Gotcha — the subscription plan vs the standalone consult service

The subscription plans are **not** the standalone **paid consult service**
(`https://app.letsdog.nl/consult/`, €39,50 — the "Boek/Plan een consult" cards on
`/contact` and `/over-ons`). They share the word "consult". A blind sweep for `consult`
would break the live service's links/CTA. Filter by the plan name / price (€14,99 / €59,
list €119), not the bare word.

## Related

- Re-centering a reduced card set: the real lever is the **width system**, not `mx-auto`.
  Use a rem-based `max-w-*` consistent with the section's other centered rows and verify
  both sides of the **1440px root-font breakpoint** — see
  [`../developer-experience/rem-max-width-shrinks-under-fluid-root-font-size.md`](../developer-experience/rem-max-width-shrinks-under-fluid-root-font-size.md).
- The monthly/yearly toggle that lived here until 2026-09-16 animated via a CSS transition
  that the headless preview freezes. The lesson outlives the toggle for any other state-driven
  style swap: see
  [`../developer-experience/preview-throttles-css-transitions.md`](../developer-experience/preview-throttles-css-transitions.md).
