# Concepts

Shared vocabulary for the Let's dog marketing website — the domain entities, named
processes, and status concepts that carry a specific meaning in this project. Code
structure and conventions live in [`CLAUDE.md`](CLAUDE.md); this file is the glossary
of *terms*. Plan and write with these names rather than synonyms.

## Brand & products

- **Let's dog** — the brand. Always written with a lowercase *d* in user-facing output
  (copy, titles, metadata, alt/aria, JSON-LD). The legal entity is **Let's dog BV**.
  (Restyled from "Let's Dog" on 2026-06-11.)
- **Puppycursus / Puppy Academy** — the core training product: structured modules per
  developmental phase (roughly 0–6 months). In the site nav it is labelled "Puppycursus"
  and links to `/puppycursus` (renamed from `/puppyagenda` 2026-06-16; old URL 301-redirects).
- **Puppyagenda** — the puppy-agenda product. The `/puppycursus` page markets it; the
  live application is the separate sibling app at `agenda.letsdog.nl`.
- **Rassenkeuze hulp** — the breed-selector quiz (`/rassenkeuze`), embedded via iframe
  from `keuzehulp.letsdog.nl`. Renamed from "Hondenkeuze" (2026-05-29); the old
  `/hondenkeuze/` URL 301-redirects.
- **Weekplan** — a structured weekly plan that matches the dog's developmental phase.
  Deliberately **not** a personalised "plan op maat" — never describe it as tailored or
  AI-generated.
- **Pre-Puppy voorbereiding** — checklist and exercises for the weeks before the pup
  comes home.
- **Plannen** — two membership plans: **Flexibel** (maandelijks opzegbaar, €19,99/maand)
  and **Early Member** (jaarlijks; intro €59 het eerste jaar, daarna €119/jaar). "Early
  Member" is the launch offer on the year plan; "Flexibel" is the no-commitment monthly
  option.
- **Launch price** — the Early Member intro price on the year plan (€59 het eerste jaar,
  daarna €119/jaar). State it calmly ("Early Member prijs zolang we lanceren" / "€59 het
  eerste jaar"); no discount-percentage drama.

## The Let's dog app ecosystem (sibling surfaces)

- **Website** — this repo: the marketing site (`letsdog.nl` / `www.letsdog.nl`).
- **app.letsdog.nl** — the web-app (login, courses, "Start gratis"). Owns the app-side
  `sign_up` / `purchase` analytics events.
- **keuzehulp.letsdog.nl** — the BreedSelector app, embedded by Rassenkeuze hulp.
- **agenda.letsdog.nl** — the Puppy Agenda app. Canonical owner of dog-passport data
  (name, date of birth, breed, medical) — coordinate with it before depending on those
  fields.

## Named processes & conventions

- **Cutover** — the DNS switch that points the custom domains at Cloudflare Pages.
  Runbook: [`docs/CUTOVER.md`](docs/CUTOVER.md). Several spec items (HSTS `preload`, CAA,
  www→apex 301, GSC sitemap) are gated on it.
- **Preview-first discipline** — every non-main branch gets a Cloudflare preview at
  `<branch-slug>.website-letsdog.pages.dev`; verify there before merging to main.
- **Dual-fire (analytics)** — `trackEvent` sends the *same* event to both GA4 and
  PostHog, each guarded independently. Add events via `trackEvent`, never by calling
  `gtag` / `posthog` directly.
- **Cross-product identity** — lowercased email is the join key across all Let's dog
  apps; `identifyLead(email)` is the single PostHog `identify` on this site (fired on
  contact-form success). See the cross-knowledge hub contract.
- **GA4 custom dimensions** — `link_location` and `link_destination` (set by CTA
  tracking) are registered GA4 custom dimensions; do not rename them.
- **Spec compliance** — the site is held to The Website Specification
  (specification.website); the trigger→action→verify matrix lives in
  [`docs/website-spec-maintenance.md`](docs/website-spec-maintenance.md).
- **Markdown-driven legal pages** — the legal pages render their body from
  `content/<slug>.md` at build time; edit the markdown, not the TSX.

## Audience segments (brand voice)

The brand guide writes for five modes: **Nieuwe Puppybezitter** (core), **Jonge Gezin**,
**Bewuste Professional**, **Herstarter**, and **Mixed** (the default for generic
content). Tone is "je/jouw", empathy-first, no jargon, and no exclamation-marks-as-style.

## Status & constraint concepts

- **"Binnenkort" (app status)** — the website and web-app are live; the iOS/Android apps
  are "binnenkort". Don't promise a date or claim the app works everywhere yet.
- **Cookiebot is display-only** — the consent banner is informational; GA4 + PostHog fire
  regardless of consent state (a deliberate, documented decision).
- **Features not in marketing copy** — AI Coach, "plan op maat", gezin-/herstart-modules,
  health tracker / digitaal paspoort, walker-service, insurance: these are not live for
  marketing and must not appear in site copy.
