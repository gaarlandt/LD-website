---
title: "Lessons from other Let's Dog apps that apply to the Website"
date: 2026-06-02
category: cross-project
module: cross-project
problem_type: knowledge
severity: medium
applies_when:
  - "Working on the Cloudflare Pages Function (contact form / Postmark) or any secret"
  - "Using Phosphor icons or building first-visit / nav-strip UI"
  - "Adding tests, or wiring PostHog/identity"
  - "Before debugging a 'works locally, breaks on deploy' symptom"
tags: [cross-project, lets-dog, shared-knowledge, breed-selector, puppy-agenda, cloudflare-pages, posthog, testing]
---

# Lessons from other Let's Dog apps that apply to the Website

Curated from BreedSelector (BS) and Puppy Agenda V2 (PA). Only items that genuinely apply *here* — the Website is a static-export marketing site with Cloudflare Pages Functions and the `.ld-*` design system. Full map + contracts in the shared hub:

> **Hub:** `/Users/jurriaan/Documents/Coding/ldcoding/LD - project cross knowledge/` (repo `gaarlandt/ld-project-cross-knowledge`) — start at `index.md`.

## Pages Functions run on the Workers runtime — PA's Worker lessons apply

- **Curl-smoketest the Pages Function secret.** Your contact Function holds `POSTMARK_SERVER_TOKEN`; a wrong/unset secret returns a generic error. Smoketest right after setting it (and remember secrets only apply to builds *after* the change). → `…/PuppyAgenda/code_puppyagenda/docs/solutions/conventions/curl-smoketest-new-cf-worker-secrets-2026-05-29.md`
- **Prefer browser-only over `isomorphic-*` packages.** Pages Functions are the Workers runtime — isomorphic packages with a Node fallback throw at runtime despite a clean build. → `…/PuppyAgenda/code_puppyagenda/docs/solutions/tooling-decisions/prefer-browser-only-packages-over-isomorphic-on-workers-2026-05-15.md`
- **Phosphor icons: import from `/dist/ssr`, use the `*Icon` names.** You use Phosphor — the SSR entry is Workers-safe and dodges the deprecated-name lint. → `…/PuppyAgenda/code_puppyagenda/docs/solutions/tooling-decisions/phosphor-icons-on-cloudflare-workers-2026-06-01.md`
- **An HTTP 2xx is not a JSON guarantee — guard any upstream `res.json()`.** Your `functions/api/contact.ts` already plays it safe (it checks `postmarkRes.ok` and never parses the body) — keep it that way, and *if* a Function ever parses an upstream JSON response, read `res.text()` + `JSON.parse` in a `try/catch` and return a structured error rather than trusting that a 2xx is JSON (a proxy / CDN / error page can return `200 text/html`). PA hit exactly this calling SiteGround WP from a Worker. → `…/PuppyAgenda/code_puppyagenda/docs/solutions/integrations/ld-lesson-lookup-2xx-non-json-body-2026-06-07.md`
- **⚠️ SiteGround *proxy-caches* anonymous WP REST GETs — cache-bust any read that must be fresh.** Distinct from the 2xx-≠-JSON guard ↑: SiteGround's proxy serves an anonymous `GET` to `app.letsdog.nl/wp-json/...` **stale for minutes** (`x-proxy-cache: HIT`) even with **no `Cache-Control`** header, so a content read can silently show yesterday's data. **If a WS Pages Function (or build/ISR step) ever reads WP REST anonymously**, append a **unique cache-bust query param** (`?_cb=<ts-rand>` → forces a proxy MISS; the proxy keys on the full URL) + `cache:'no-store'`; a `Cache-Control` *request* header dies on CORS preflight if it's not in the route's `Access-Control-Allow-Headers`. Detect via `curl -D -` twice (plain vs `?_cb=$RANDOM`) + compare `x-proxy-cache`. → PA `…/PuppyAgenda/code_puppyagenda/docs/solutions/integrations/siteground-proxy-caches-anonymous-wp-rest-get-2026-06-22.md`

## Contracts you participate in

- **Cross-host consent handover (`ld_consent`)** (owner **PF**, the Let's Dog platform on `mijn.letsdog.nl` — the *new* platform, not Puppy Agenda; new 2026-08-08) — **this is the one contract where WS and PF write the same record.** The visitor answers Cookiebot here, the platform has to honour the same answer, and Cookiebot's own cookie is host-only — so the choice travels in a first-party cookie on `.letsdog.nl` that **both** apps read and write. Two rules bind every writer here, and both were learned the hard way in this repo: **newest choice wins** (compare the moment of the choice, and ignore the timestamp when deciding whether the choice *changed* — Cookiebot re-stamps `consentUTC` at *now*, so a same-choice write makes the platform log a consent event nobody performed), and **an absent Cookiebot answer is not a withdrawal** (`withdraw()` clears `hasResponse`, so "took it back" and "never asked here" are the same state — only record a withdrawal you witnessed in one subscription). Also: PostHog runs on legitimate interest while Google and Meta need consent, so "no choice" and "refused" are different cases — don't flatten them. Cookiebot's banner never renders on `*.pages.dev` and localhost carries a placeholder CBID, so a *changed* consent can only be verified across the two production hosts. Local war story + measurements: `docs/solutions/logic-errors/two-writers-on-one-record-need-a-newest-wins-rule.md`. → `…/contracts/cross-host-consent-handover.md`
- **Cross-host attribution handover (`ld_attribution`)** (owner **PF**; new 2026-08-11) — **the second record WS and PF both write**, and the one you are most likely to get wrong *because* the consent contract above is right next to it. Same mechanism, same `.letsdog.nl` domain, **opposite conflict rule: FIRST touch wins, not newest.** A later direct visit is the same person coming back, not new information — so once a record exists, leave it alone: no merging a later touch into the gaps of the first (that invents a campaign combination that never happened), and any parseable record wins, *including one at a version you don't recognise*, because you cannot tell whether the platform wrote it first. Never store an empty record either — that consumes the first-touch slot and makes the next real ad click look like a returning visitor. **Exactly seven parameter names, byte for byte** (`utm_source/medium/campaign/term/content`, `gclid`, `fbclid`), truncated at **200** to match the platform's DB CHECK; both sides ignore anything outside that allowlist silently, so a rename shows up as an empty column and never as an error. **Two consent gates**: utm + `gclid` on statistics, `fbclid` on marketing — one "may we measure" boolean picks a side for the visitor. Transfer is the cookie and deliberately **not** link parameters: ads land on `/rassenkeuze/`, people click around, and link parameters do not survive that. Local implementation + the tests that pin the contract: `lib/attribution.ts`, `lib/attribution.test.ts`, `components/analytics/attribution-capture.tsx`. → `…/contracts/cross-host-attribution-handover.md`
- **PostHog cross-product identity** — the WP/marketing surface must follow the shared identity rules (`wp:<id>`, lowercased-email join, per-app `aud`). → `…/contracts/posthog-cross-product-identity.md`
- **Blocking/empty states in embedded iframes** — when the Website embeds an app via iframe (e.g. BreedSelector), keep the `<iframe>` a **plain in-flow block**; do **NOT** pin it (`position:sticky` / `fixed`) to stop the embedded app's overlays clipping (corrected 2026-06-04 — pinning fixes the overlay but breaks the embedded app's *normal* in-flow view). The embedded app owns this: it should render blocking / empty / error states as in-flow content + a structural gate, not a `position:fixed` overlay. → `…/contracts/iframe-fixed-overlay-positioning.md`
- **BreedSelector results-email deep-link** — BreedSelector's results email links visitors back to `/rassenkeuze/?q1=…`; the Website forwards its **whole** query string into the embedded iframe `src` plus a forced `source=website`, so BS deep-links straight to the saved results (no fresh quiz, no re-submitted lead). Keep `/rassenkeuze/` forwarding the query and reachable; the `q1…qN` schema + the deep-link / no-re-submit behavior are **BS's** to change, not ours. WS-local how-to (static-export client-side read): `docs/solutions/design-patterns/client-side-query-params-static-export.md`. → `…/contracts/breedselector-results-email-deeplink.md`
- **Firebase → Cloudflare Pages migration** (BS owns it, new 2026-06-17) — you already made this move (git-integrated), so your `public/_headers` is the reference for the **merge invariant** (`/*` security-only vs per-dir `Cache-Control`-only) and the dropped auto-injected `nosniff`/`Referrer-Policy`, and your `docs/CUTOVER.md` is the DNS-cutover runbook. The net-new bit BS added: the **Direct-Upload-via-`cloudflare/wrangler-action@v3`** variant, which keeps a CI test gate in front of the deploy (Git-integration builds independently of Actions and bypasses that gate) — worth knowing if WS ever wants its Pages deploy gated on tests/lint. → `…/contracts/firebase-to-cloudflare-pages-migration.md`

## UI / UX patterns

- **Consolidate first-visit gates into ONE surface** — don't stack cookie-consent + welcome/promo modals; gate them through one decision. → `…/PuppyAgenda/code_puppyagenda/docs/solutions/design-patterns/consolidate-first-visit-modals-into-one-surface-2026-05-29.md`
- **Pinned + scrollable horizontal strip with mask-fade** — for category/nav strips with always-visible + overflow items (two-flex-child split, not `position: sticky`). → `…/PuppyAgenda/code_puppyagenda/docs/solutions/design-patterns/pinned-scroll-strip-with-mask-fade-2026-05-15.md`
- **Selector-keyed DOM caches go stale across route transitions — key on pathname.** Relevant for multi-page + scroll-spy/anchor behaviour where a hook caches `querySelector` results. → `…/PuppyAgenda/code_puppyagenda/docs/solutions/architecture-patterns/route-transition-stale-target-cache-2026-05-27.md`

## Tooling / workflow

- **Cross-model review via `agy` (Antigravity).** Before merging a substantial Claude-reviewed change here, run one Gemini pass over the fix diff (`agy --model "Gemini 3.1 Pro (High)" -p "<brief+diff>"`; `-p` ignores stdin — embed the diff) and verify every finding before acting on it. On LD Platform this caught 2 real bugs that 12 Claude reviewers + 14 validators missed, plus 1 confident false positive. → hub `…/contracts/cross-model-code-review-agy.md`

## Testing

- **Two-layer testing strategy** (Vitest unit + manual regression with trigger-path ASK rule) — a near-exact fit: static-export, single contributor, browser-only behaviour. → `…/Keuzehulp/code_breedselector/docs/solutions/architecture-patterns/two-layer-testing-strategy-2026-05-12.md`

## Dependencies & supply-chain

- **Transitive-only vulns need an `overrides` block, not Dependabot.** Patch a CVE in a buried sub-dependency via a `package.json` `overrides` floor (you're on **npm**); Dependabot can't bump one in isolation. Triage `npm audit` by dependency *path* first — your CF-Pages build toolchain and any local CLIs aren't runtime exposure, so size urgency by where the code runs, not the severity badge. → `…/PuppyAgenda/code_puppyagenda/docs/solutions/tooling-decisions/transitive-dep-vulns-need-overrides-not-dependabot-2026-06-03.md`

---
*Maintained via the `cross-project-learnings-letsdog` skill. To add an entry, say "this is a cross-project learning."*
