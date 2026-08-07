---
title: "The company address is prose on 5 surfaces — one of them only ever appears in sent email"
date: 2026-08-06
category: conventions
module: "company identity / content + functions/api/contact.ts"
problem_type: convention
component: documentation
related_components: [email_processing]
severity: medium
applies_when:
  - "Changing the registered or visiting address of Let's dog B.V."
  - "Changing the KvK number, company name, or any other statutory identity field"
  - "Auditing whether the legal pages and the transactional email agree with each other"
tags: [legal-pages, content, transactional-email, postmark, company-identity, single-source, fan-out, gotcha]
---

# The company address is prose on 5 surfaces — one of them only ever appears in sent email

## Context

The company's statutory address is **not** derived from a constant. It is hand-written prose,
repeated across five places in four files, and nothing links them:

| # | File | Surface | Visible where |
|---|---|---|---|
| 1 | `content/algemene-voorwaarden.md:9` | "gevestigd aan …, KvK …" | `/algemene-voorwaarden/` |
| 2 | `content/privacybeleid.md:20` | "Adres: …" under the controller block | `/privacybeleid/` |
| 3 | `content/modelformulier-herroeping.md:12-13` | the "Aan" address block | `/modelformulier-herroeping/` |
| 4 | `functions/api/contact.ts:305` | plain-text footer of the confirmation email | **only in sent email** |
| 5 | `functions/api/contact.ts:327` | HTML footer of the same email | **only in sent email** |

Surfaces 4 and 5 are the trap. They render on **no page**, appear in **no static export**, and
are asserted by **no test** — `functions/api/contact.test.ts` exercises the Turnstile gate,
honeypot, field validation and Postmark batching, but never the footer string. The only way to
observe them is to submit the contact form and read the email that arrives.

This was found during a real move (2026-08-06, loop item T-16). The site had been shipping
**two different house numbers**: `Naarderstraat 31` on the three legal pages and
`Naarderstraat 317` in both email footers. One of them was wrong, had been wrong for months,
and nobody noticed — because the only surface that disagreed was the one nothing renders.

## Guidance

**Treat a company-identity change as a grep over the datum, not a visit to the pages you can
picture.** The reflex — "the address is on the legal pages and maybe the contact page" — finds
three of five surfaces and misses precisely the two that had drifted.

The sweep that actually works:

```bash
# Grep every token of the OLD value separately; a partially-updated surface
# only shows up if you search street, postcode and city independently.
grep -rniE "naarderstraat|1272 NK|huizen" --include="*.ts" --include="*.tsx" --include="*.md" .
```

Then filter deliberately, because two classes of hit must **not** change:

- **Testimonial locations** — `components/sections/trust.tsx` and `COPY-DECK.md` carry reviewer
  home towns (`location: "Huizen"`, `location: "Naarden"`). Those are customers, not the company.
- **Historic plan docs** — `docs/plans/*` record what was built at the time. Leave them.

After editing, prove it on the built artifact rather than the source:

```bash
npm run build
grep -rl "<new street>" out/ | head      # must list all three legal pages
grep -rl "<old street>" out/            # must be empty
```

The email footers cannot be proven this way — `functions/` does not run under `next dev` and is
not part of `out/`. The only real proof is a form submission on the Cloudflare preview and
reading the received email. Budget for that step; do not mark the change verified without it.

## Why This Matters

Two of the five surfaces are legal text (`algemene-voorwaarden` says *"gevestigd aan"*, which is
the KvK-registered seat, and `modelformulier-herroeping` is the statutory EU withdrawal form a
consumer is meant to post something to). A stale address there is not cosmetic. And the surface
most likely to be missed is the one attached to the outbound email — the artefact that reaches a
customer's inbox and is hardest to retract.

The generalisation: **the risk of a fan-out is not how many surfaces there are, it is how many
of them are invisible to the checks you habitually run.** A string that renders on a page gets
caught by a browser pass. A string that exists only inside a Pages Function survives a green
build, a green test suite, and a full visual review.

## When to Apply

- Any change to the address, KvK number, or registered company name.
- Any audit asking "do our legal pages and our transactional email still agree?"
- As the template for the next identity-shaped datum that gets added: if it is going to live in
  more than one file, ask at the point of writing whether one of those files is invisible.

## Examples

**The divergence this doc exists because of** — same datum, two values, no error anywhere:

```
content/algemene-voorwaarden.md:9   …gevestigd aan Naarderstraat 31,  1272 NK Huizen, KvK 98271814.
functions/api/contact.ts:305        `Let's dog BV · Naarderstraat 317 · 1272 NK Huizen · Nederland\n`
```

**Not currently a surface, worth knowing:** `lib/structured-data.ts` builds the sitewide
`Organization` JSON-LD with `contactPoint` (email + telephone) but **no** `address` /
`PostalAddress`. If a `PostalAddress` is ever added for local SEO, it becomes surface #6 — and
unlike the email footers it *is* checkable in `out/`, so add it to the build-artifact grep above.

## Related

- `docs/solutions/conventions/pricing-tier-change-fans-out-to-multiple-surfaces.md` — the same
  class for plan/price data. That doc has a single source of truth (`pricing-data.ts`) with
  prose mirrors; this one has **no** source of truth at all, only mirrors.
- `docs/solutions/logic-errors/hostname-keyed-click-tracker-misses-mailto.md` — same failure
  shape from the other direction: the case that is missed is the one no habitual check covers.
