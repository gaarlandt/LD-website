---
title: "Lessons from other Let's Dog apps that apply to the Website"
date: 2026-06-02
category: cross-project
module: cross-project
problem_type: knowledge
severity: medium
applies_when:
  - "Working on the Cloudflare Pages Function (contact form / Postmark) or any secret"
  - "Using Phosphor icons, framer-motion, or building first-visit / nav-strip UI"
  - "Adding tests, or wiring PostHog/identity"
  - "Before debugging a 'works locally, breaks on deploy' symptom"
tags: [cross-project, lets-dog, shared-knowledge, breed-selector, puppy-agenda, cloudflare-pages, posthog, testing]
---

# Lessons from other Let's Dog apps that apply to the Website

Curated from BreedSelector (BS) and Puppy Agenda V2 (PA). Only items that genuinely apply *here* — the Website is a static-export marketing site with Cloudflare Pages Functions and the `.ld-*` design system. Full map + contracts in the shared hub:

> **Hub:** `/Users/jurriaan/Documents/Coding/ldcoding/LD - project cross knowledge/` (repo `gaarlandt/ld-project-cross-knowledge`) — start at `index.md`.

## Pages Functions run on the Workers runtime — PA's Worker lessons apply

- **Curl-smoketest the Pages Function secret.** Your contact Function holds `POSTMARK_SERVER_TOKEN`; a wrong/unset secret returns a generic error. Smoketest right after setting it (and remember secrets only apply to builds *after* the change). → `…/PuppyAgenda/Puppy Agenda V2/Puppy Agenda V2 Code/docs/solutions/conventions/curl-smoketest-new-cf-worker-secrets-2026-05-29.md`
- **Prefer browser-only over `isomorphic-*` packages.** Pages Functions are the Workers runtime — isomorphic packages with a Node fallback throw at runtime despite a clean build. → `…/Puppy Agenda V2 Code/docs/solutions/tooling-decisions/prefer-browser-only-packages-over-isomorphic-on-workers-2026-05-15.md`
- **Phosphor icons: import from `/dist/ssr`, use the `*Icon` names.** You use Phosphor — the SSR entry is Workers-safe and dodges the deprecated-name lint. → `…/Puppy Agenda V2 Code/docs/solutions/tooling-decisions/phosphor-icons-on-cloudflare-workers-2026-06-01.md`

## Contracts you participate in

- **PostHog cross-product identity** — the WP/marketing surface must follow the shared identity rules (`wp:<id>`, lowercased-email join, per-app `aud`). → `…/contracts/posthog-cross-product-identity.md`

## UI / UX patterns

- **Consolidate first-visit gates into ONE surface** — don't stack cookie-consent + welcome/promo modals; gate them through one decision. → `…/Puppy Agenda V2 Code/docs/solutions/design-patterns/consolidate-first-visit-modals-into-one-surface-2026-05-29.md`
- **Pinned + scrollable horizontal strip with mask-fade** — for category/nav strips with always-visible + overflow items (two-flex-child split, not `position: sticky`). → `…/Puppy Agenda V2 Code/docs/solutions/design-patterns/pinned-scroll-strip-with-mask-fade-2026-05-15.md`
- **Selector-keyed DOM caches go stale across route transitions — key on pathname.** Relevant for multi-page + scroll-spy/anchor behaviour where a hook caches `querySelector` results. → `…/Puppy Agenda V2 Code/docs/solutions/architecture-patterns/route-transition-stale-target-cache-2026-05-27.md`

## Testing

- **Two-layer testing strategy** (Vitest unit + manual regression with trigger-path ASK rule) — a near-exact fit: static-export, single contributor, browser-only behaviour. → `…/Keuzehulp/code_breedselector/docs/solutions/architecture-patterns/two-layer-testing-strategy-2026-05-12.md`

---
*Maintained via the `cross-project-learnings-letsdog` skill. To add an entry, say "this is a cross-project learning."*
