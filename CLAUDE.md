# Let's Dog — Marketing Website

## Where the project state lives (read this first)
This repo sits **inside a werkmap**: `~/Documents/Coding/ldcoding/LDwebsite/`. That parent
folder is its own private git repo (`gaarlandt/LD-website-loop`) and carries the self-learning
loop — open tasks, decisions, session log. **Two nested repos: know which one you're in.**

- **Code changes** → this repo (`gaarlandt/LD-website`), branch + PR + Cloudflare preview.
  **Target every git command explicitly — `git -C <path> …` — instead of relying on `cd`.**
  The shell cwd is session state that snaps back between tool calls, and a command aimed at
  the wrong one of these two repos still exits 0: on 2026-08-06 a `cat >> LOG.md` created a
  stray LOG in *this* repo, and on 2026-08-07 a `git checkout main && git pull` ran in the
  loop repo. Only reading the output caught either. Same rule for file writes: absolute paths.
- **Open work, decisions, session state** → the werkmap: `../loop/INDEX.md` (generated),
  `../loop/sessies.md` (which session is next), `../JUR.md` (what waits on Jur), `../LOG.md`.
  Mint items only with `bash ../scripts/loop/new.sh t|d "titel"`; close a session with
  `bash ../scripts/loop/close.sh "<sessienaam>"`. Loop commits never touch this repo, so they
  never trigger a Pages build.
- `HANDOFF.md`, `TODO.md` and `PROGRESS.md` were retired on 2026-08-02 — their still-open
  points became loop items T-1…T-10 / D-1, and the originals are kept verbatim in
  `../archief/pre-v3-2026-08-02/`. Don't recreate them here.

## Project Overview
Marketing website for Let's Dog, a puppy training platform. Built as a static Next.js site deployed on Cloudflare Pages.

## Tech Stack
- **Framework**: Next.js 16 (static export via `output: "export"`)
- **React**: 19
- **Styling**: Tailwind CSS v4 (utility-first, no CSS modules)
- **Animations**: CSS transitions + Radix primitive animations (Framer Motion removed 2026-06-25 — its only consumer was an unused `Reveal` component)
- **Icons**: Phosphor (`@phosphor-icons/react/dist/ssr`) + inline SVGs (WhatsApp, TikTok)
- **Fonts**: National2 everywhere — one typeface for headings and body, per the brand guide ("Eén typeface: National 2"). Self-hosted, local files in `public/fonts/`: Regular `.ttf` (400, body) and Bold `.otf` (700, headings + emphasis like `.ld-eyebrow`/`.ld-avatar`) are the two weights the design leans on; Medium `.otf` (500, `font-medium` usages — desktop nav links, FAQ accordion) is also registered and preloaded. National2 has no 600 (semibold) face — components that need real weight fidelity use 500 or 700, not 600. No Google Fonts — DM Sans was removed 2026-07-03, its only role was body text.
- **Images**: photographic JPEGs served as AVIF/WebP via the `OptimizedImage` `<picture>` component; variants generated at build-time by `sharp` ^0.34 (`scripts/optimize-images.mjs`) — see "On-page SEO, metadata & spec compliance" below
- **Content (legal pages)**: Markdown via a small front-matter splitter (`lib/content.ts`, YAML parsed by `js-yaml` ^4) + `react-markdown` ^10 + `remark-gfm` ^4 — see "Markdown-driven legal pages" below
- **Analytics**: GA4 (`G-0FCGXJHMMY`, Consent Mode v2, denied by default) + PostHog (EU, browser-only, legitimate interest — runs without an answer, **stops on an explicit refusal of statistics** since 2026-08-12) + Meta Pixel (`958837033882897`, loads only on marketing consent) — all fired via `lib/analytics.ts` `trackEvent`; Meta receives only the mapped standard-event subset (`lib/meta-events.ts`). Cookiebot banner **does** gate Google and Meta (since 2026-08-08). Details: `docs/analytics-events.md`
- **Error sink**: Sentry (EU ingest, project `website`), **two runtimes, one project**, since 2026-08-15 (T-44, loop decision D-6). No SDK anywhere — the browser (`lib/error-sink.ts`) and the contact Pages Function both POST an envelope built by the shared, dependency-free `lib/error-report.ts`, tagged `runtime: browser | pages-function`. **`@sentry/browser` was built and then removed on a measurement**: its barrel is the only entry point and Turbopack does not tree-shake it behind a dynamic import, so it added a 438 KB / 144 KB-gz chunk containing rrweb — the session-replay engine the cookie declaration §6 promises we do not run. Hand-rolling costs **+3.8 KB raw / +2.2 KB gz** total. Reported: the handover-cookie contract breaches (`ld_attribution` rule 5, both cookies' rule 6), the eight failure paths of `functions/api/contact.ts`, and a consent chain that never started. **Not** reported: unhandled browser errors (rejected in D-6). **Ungated** — it must speak for a visitor who refused everything — and the counterpart of that is a **hard limit: no consent categories in the payload**, enforced by an allowlist of measurement keys in `lib/error-report.ts` rather than by call-site discipline. Key `NEXT_PUBLIC_SENTRY_DSN` (Cloudflare dashboard only); **unset is a supported state and a total no-op**
- **Post-deploy verification**: `npm run verify:live` (`playwright-core`, devDependency) — the consent + attribution chain measured **at the objects** on the deployed site, because the unit suite structurally cannot see a third party that arrives in pieces. See "Key Commands" below and [`docs/verify-live.md`](docs/verify-live.md)
- **Testing**: Vitest ^4 (Node env) — unit tests for the contact Pages Function (`functions/api/contact.test.ts`) + pure lib helpers. `*.test.ts` + `vitest.config.ts` are **excluded from the root `tsconfig.json`** (which `next build` typechecks across `**/*.ts`) and typechecked separately via `tsconfig.test.json`, so adding tests never breaks the production build. Run `npm test` — see "Testing" below
- **Deployment**: Cloudflare Pages (project: `website-letsdog`, production URL: `website-letsdog.pages.dev`, custom domains flip in at cutover)

## Key Commands
```bash
npm run dev             # Start dev server (Turbopack)
npm run build           # Static export to ./out
npm run lint            # ESLint (no config committed yet — pre-existing, don't block on it)
npm test                # Vitest unit tests (Node env; contact Function + pure helpers)
npm run optimize:images # Regenerate AVIF/WebP variants after adding/changing a photo
npm run assets          # optimize:images + regenerate favicons + og image
npm run verify:live     # Drive a real Chrome against the DEPLOYED site and measure the consent
                        # + attribution chain at the objects (~2 min). See below.
```

**`npm run verify:live` — the post-deploy check for anything hanging off a third party.**
Seven proofs against production (`scripts/verify-live.mjs`), each measured in **both**
directions, driving the real Cookiebot on the real hosts: the return leg, the D-4 all-false
clamp, the outbound leg to `mijn.letsdog.nl/checkout`, GA4's `consent update` in the dataLayer,
Meta's load/revoke gate, PostHog's run-without-an-answer *and* stop-on-refusal, and
`ld_attribution`'s first-touch rule. It exists because **a marker in the shipped bundle proves
code was DELIVERED, not that it is CALLED** — three consecutive fixes for one consent bug passed
307 green tests and did nothing on production, twice. Unit tests cannot see a Cookiebot that
arrives in pieces; this can. Needs `wrangler` logged in (it refuses to run until it has *proved*
which commit the apex is serving, by matching the apex's build fingerprint against the
deployment alias's) and the `playwright-core` devDependency (no browser download — it drives the
installed Chrome). `--fault <id>` injects a real breakage to prove a proof can still go red.
**It writes into production** (~a dozen real analytics events per run), so run it deliberately,
not on a timer. Full reference, the ship checklist, the manual steps it cannot take, and the
currently-red PostHog finding: [`docs/verify-live.md`](docs/verify-live.md).

## Dev Server / Preview
Use `preview_start("letsdog-website")` to start the dev server via the preview tool. The launch.json config is at `.claude/launch.json` and uses `autoPort: true` so it won't collide with other dev servers.

The preview sandbox requires Node v20 (not v24) — the launch.json uses the absolute path `/Users/jurriaan/.nvm/versions/node/v20.19.5/bin/node`. If Node versions change, update this path.

**Always verify changes visually** after modifying UI components — use the preview verification workflow (snapshot, inspect, screenshot).

## Testing
Vitest (Node environment) covers the server-side + pure logic the browser preview can't exercise. Run `npm test` (`vitest run`).

- **What's covered**: the contact Cloudflare Pages Function (`functions/api/contact.test.ts` — it ships straight to prod and **cannot run under `next dev`**, so unit tests are its only pre-deploy coverage) and pure `lib/` helpers. Browser/Workers round-trip behaviour (live Turnstile + Postmark, headers) is still verified manually on the Cloudflare branch preview.
- **`next build` isolation (don't break this)**: the root `tsconfig.json` `include`s `**/*.ts`, and `next build` typechecks all of it — so `*.test.ts` and `vitest.config.ts` are listed in the root `tsconfig.json` `exclude`, and typechecked separately by `tsconfig.test.json`. Without that, the first test file's `vitest` import breaks the production build. Keep new test files under those globs (or extend the exclude) so the build stays green.
- **Adding tests**: co-locate as `<name>.test.ts` next to the source. For the contact Function, exercise `onRequestPost` with a hand-built `Request` + an inline structurally-typed `env` and a stubbed global `fetch` (no Next/Workers harness needed). Prefer extracting pure logic (e.g. predicates, parsers) so it's unit-testable off the Workers runtime.

## Project Structure
```
.
├── CONCEPTS.md             # Shared domain vocabulary (entities, named processes, status concepts) — orient here; maintained by /ce-compound
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (navbar, footer, WhatsApp, analytics)
│   ├── page.tsx            # Homepage
│   ├── icon.svg            # SVG favicon (wordmark; Next auto-wires <link rel="icon">)
│   ├── apple-icon.png      # apple-touch-icon (square brand mark; Next auto-wires)
│   ├── manifest.ts         # PWA web app manifest → /manifest.webmanifest
│   ├── robots.ts           # /robots.txt (Allow + Sitemap)
│   ├── sitemap.ts          # /sitemap.xml (canonical apex URLs)
│   ├── not-found.tsx       # Branded Dutch 404
│   ├── contact/            # Contact page
│   ├── rassenkeuze/        # Rassenkeuze hulp — breed selector quiz (iframe to keuzehulp.letsdog.nl)
│   ├── over-ons/           # About page
│   ├── partners/           # Partners — ambassadeurs & UGC-makers, mailto funnel to creators@letsdog.nl
│   ├── prijzen/            # Pricing page
│   ├── puppycursus/        # Puppycursus page (route renamed from /puppyagenda)
│   ├── veelgestelde-vragen/ # FAQ page
│   ├── privacybeleid/      # Privacy policy
│   ├── algemene-voorwaarden/ # General terms (SaaS & app)
│   ├── ai-gebruiksvoorwaarden/ # AI terms of use
│   ├── cookieverklaring/   # Cookie declaration
│   ├── retour/             # Return & withdrawal policy
│   ├── modelformulier-herroeping/ # EU model withdrawal form
│   ├── veiligheidsdisclaimer/ # Safety & advice disclaimer (dog behaviour)
│   └── ip-overdrachtsverklaring/ # IP transfer declaration
├── components/
│   ├── layout/             # Navbar, Footer
│   ├── sections/           # Homepage sections (hero, problem, hope, etc.)
│   ├── shared/             # Reusable (WhatsApp, reveal, section-wrapper, JsonLd, OptimizedImage, legal layout)
│   └── analytics/          # Cookiebot, ConsentDefault, ConsentCookie, ConsentSync, AttributionCapture, GA4, CTATracker, PostHogProvider, MetaPixel + MetaPixelPageView
├── content/                # Markdown source for the 8 legal pages (privacybeleid, algemene-voorwaarden, ai-gebruiksvoorwaarden, cookieverklaring, retour, modelformulier-herroeping, veiligheidsdisclaimer, ip-overdrachtsverklaring). Edit these to change copy without touching TSX.
├── lib/
│   ├── utils.ts            # Asset path helper
│   ├── seo.ts              # SITE_URL/SITE_NAME + pageMetadata() (per-page canonical/og/twitter)
│   ├── structured-data.ts  # JSON-LD builders (Organization, WebSite, FAQPage, Product, Person)
│   ├── content.ts          # loadLegalContent(slug) — reads content/<slug>.md at build time (front-matter via js-yaml)
│   ├── analytics.ts        # trackEvent (dual-fire GA4+PostHog) + identifyLead
│   ├── attribution.ts      # ld_attribution handover cookie — the seven campaign params, FIRST-TOUCH (inverse of consent.ts)
│   ├── error-report.ts     # Error sink core, shared by BOTH runtimes: rule ids, fixed messages, Sentry event/envelope, and the REDACTION allowlist. Pure — no deps, no DOM, no Node (the Pages Function imports it)
│   ├── error-sink.ts       # Browser half — posts the envelope itself, ungated, no-op without a DSN
│   └── prod-hosts.ts        # PROD_HOSTS allowlist (shared by ga4.tsx + posthog-provider)
├── public/                 # Static assets (images, fonts, _headers, _redirects, llms.txt, .well-known/security.txt, og/, images/optimized/)
├── scripts/                # Build-time asset generators (optimize-images, generate-icons, generate-og-image) — sharp
├── docs/                   # Documentation
│   ├── CUTOVER.md          # DNS cutover runbook
│   └── solutions/          # /ce-compound learnings, organized by category (developer-experience, integration-issues, etc.) with YAML frontmatter for searchability
└── .env.example            # Documents env vars (NEXT_PUBLIC_GA_MEASUREMENT_ID, NEXT_PUBLIC_COOKIEBOT_CBID)
```

## Styling Conventions
- **Brand name**: written **`Let's dog`** (lowercase *d*) in all website output — copy, page titles, metadata, alt/aria, manifest, and structured data (`SITE_NAME` in `lib/seo.ts`). Restyled from "Let's Dog" on 2026-06-11; the `brand-guide-letsdog` skill matches. Don't reintroduce the capital *D* (a few internal code comments still carry it — those aren't user-facing).
- **Colors**: Brand green `#75876D`, Beige `#EFE8E4`, Black `#141414`, Peach `#FFA580`, Dark green `#162A0E`, Soft blue `#A5C3E2` (use sparingly — small accents only, never as a primary surface or large fill)
- **Approach**: Inline Tailwind classes, no CSS modules or external stylesheets
- **Tailwind ignores Markdown** (`@source not "../**/*.md"` in `app/globals.css`): Tailwind v4 auto-scans the repo for class candidates, so class-like prose in docs (e.g. a literal `bg-[var(--ld-*)]` in a plan) generates a malformed utility — a **fatal 500 in `next dev`**, only a warning in `next build`. Keep real classes in `.tsx`/`.ts`; don't drop that `@source not` line.
- **Responsive**: Mobile-first, `md:` and `lg:` breakpoints
- **Nav hover**: Brand green underline animates on hover via `after:` pseudo-element
- **Interactive overlays — prefer native invoker commands.** For a `<button>` that opens/closes/toggles another element (popover, `<dialog>`, disclosure), reach for the HTML `command`/`commandfor` attributes + the Popover API / native `<dialog>` before hand-rolling a `useState` toggle + `onClick` + ARIA — the browser wires keyboard activation, focus, `aria-expanded`, and light-dismiss (outside-click + Esc) for free. Spec-`recommended` (Baseline end-2025 → keep a JS fallback; React 19 renders the attrs but may need a TS cast). Best local candidate: the hand-rolled popover in `components/layout/app-store-coming-soon.tsx`. Cross-project contract: `…/LD - project cross knowledge/contracts/invoker-commands.md`.
- **Mobile header (homepage-only white state):** on `/` only, the fixed header shows a white hamburger + white logo (with a legibility drop-shadow) until scrolled past 16px, then flips to the existing dark ink + `beige/95` bar — the homepage's mobile hero is a full-bleed photo that dark icons can't reliably read against. Every other route keeps the dark icon/logo unconditionally (their top section is plain beige). A persistent glass-pill **Login** (→ `mijn.letsdog.nl`) sits top-right on mobile across all pages, independent of that gate — its own translucent fill carries contrast regardless of what's behind it. Gated via `usePathname() === "/"` in `components/layout/navbar.tsx`.

## Navigation Order
```
Rassenkeuze hulp | Puppycursus | Prijzen | Over ons | Partners | Contact
```
Defined in `components/layout/navbar.tsx` (desktop + mobile) and `components/layout/footer.tsx`. **FAQ left the top nav on 2026-08-03** to free that slot for Partners; `/veelgestelde-vragen/` is now reachable from the footer (last entry, alongside the footer-only Homepage link) and the 404 quick-links only — the two nav arrays are separate consts and stay in sync by convention, not by a shared import. Desktop navbar also includes an outlined **Inloggen** button (→ `mijn.letsdog.nl`) and a solid green **Start vandaag** CTA (→ `/prijzen`). **Mobile** reorders the same bar instead of reusing the desktop CTAs: hamburger pinned far left (`order-1`), logo nudged right next to it (`order-2`), then a flexible spacer, then a persistent **Login** pill pinned far right (`order-4`, → `mijn.letsdog.nl`) — see the white-state note above. The mobile dropdown menu's only CTA is **Start vandaag**; it no longer duplicates a login button now that the bar always shows one.

## Deployment

**Cloudflare Pages, Git-integrated. There is no `.github/workflows/` directory and no GitHub Actions at all — Cloudflare handles deploys directly from GitHub pushes.** The old Firebase deploy workflows were removed at the Cloudflare migration (May 2026). Consequence worth knowing when CI looks stuck: the **only** check on a PR here is "Cloudflare Pages", so a GitHub Actions outage cannot affect this repo. The GitHub dependency is the push webhook that tells Cloudflare to build — if that fails the check sits `pending` rather than failing, which looks identical to "still building". (Verified 2026-08-07: `gh run list` shows nothing since 2026-05-28.)

- **Production**: Merge to `main` → Cloudflare auto-builds + deploys → live on `website-letsdog.pages.dev`, custom domains `www.letsdog.nl` + `letsdog.nl` (after Phase 5 cutover, see `docs/CUTOVER.md`)
- **Preview**: Push to any non-main branch → Cloudflare auto-builds → preview URL at `<branch-slug>.website-letsdog.pages.dev`
- **Preview-first discipline**: always verify on the preview URL before merging to main. Auto-builds for non-prod branches must be enabled in Cloudflare Pages → Settings → Build → Branch control.
- **Env vars** (set in Cloudflare Pages → Settings → Variables and Secrets, scoped to Production AND Preview):
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-0FCGXJHMMY`
  - `NEXT_PUBLIC_COOKIEBOT_CBID=<Domain Group ID from Cookiebot dashboard>`
  - `NODE_VERSION=20`
  - `POSTMARK_SERVER_TOKEN=<Postmark Server API token>` — **secret** (NOT `NEXT_PUBLIC`); powers the contact form via `functions/api/contact.ts`. Optional: `CONTACT_TO` (default `support@letsdog.nl`), `CONTACT_FROM` (default `noreply@letsdog.nl`, must be a Postmark-verified sender).
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public Site Key — set as a **plaintext** variable; inlined into the client bundle at build) + `TURNSTILE_SECRET_KEY` (Secret Key — encrypted **secret**, server-only) — Cloudflare Turnstile keys gating `functions/api/contact.ts` against abuse; a matched pair from one **Managed** widget (hostnames `letsdog.nl` + `www.letsdog.nl` + `website-letsdog.pages.dev`). Set in **Production** scope; leave Preview unset so branch previews use Cloudflare's always-pass **test** keys (real keys would fail on `<branch>.pages.dev` hosts). On a production host a missing secret fails closed (500), never silently open.
  - `NEXT_PUBLIC_POSTHOG_KEY` — public client-side ingestion key. **Moved to the platform's PostHog project at the 2026-08-12 cutover** (Jur's call, T-31/U9): this site used to share project `143695` with BreedSelector, Puppy Agenda and the retiring `app.letsdog.nl`, and now reports alongside `mijn.letsdog.nl` instead. The value lives **only** in the Cloudflare Pages dashboard — there is no `.env` in this repo, so it cannot be read from source or a review. Two consequences worth knowing: `143695` is left to BreedSelector (its exception alert still runs there), and because `NEXT_PUBLIC_*` is inlined at build time, **setting the variable changes nothing until a build runs** — and an empty/wrong value fails silent, producing a site that measures nothing without any error.
  - `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
  - `NEXT_PUBLIC_SENTRY_DSN` — the error sink (T-44 / D-6). **Plaintext**, scoped to Production AND Preview. One variable serves both runtimes: Pages inlines it into the client bundle at build time *and* hands it to Functions in `env`, which is what lets the browser and `functions/api/contact.ts` share one project. A DSN is public by design (it ships in the bundle), so this is not a secret being mishandled, but it lives **only** in the dashboard. Unset or malformed ⇒ both halves are a silent no-op that breaks nothing; and as with every `NEXT_PUBLIC_*` here, **setting it changes nothing until a build runs.**
  - `NEXT_PUBLIC_META_PIXEL_ID=958837033882897` (Meta Pixel — public by design, it ships in page source; set as a **plaintext** variable, NOT a secret, so the build can inline it. Unset or malformed ⇒ `components/analytics/meta-pixel.tsx` renders nothing and the pixel silently does not exist). Dataset **"Letsdog A team"**, owned by the letsdogworld business portfolio and in use since 2026-08-11 (platform loop decision **D-99**) — the platform sends `Purchase` into this same dataset over the Conversions API, so the two must stay in step. **Changing this value alone changes nothing on the live site:** `NEXT_PUBLIC_*` is inlined at build time, so a new build must follow.

## Analytics & Consent
- **GA4**: measurement ID `G-0FCGXJHMMY` (shared across all Let's Dog domains — `www`, `keuzehulp`, `agenda`, `app`). See the GA4 doc in Google Drive (`Tech/GA4 LD/`) for cross-domain config, custom dimensions, key events, Google Ads conversion mapping.
- **Hostname behavior**: GA4 sends `debug_mode: true` automatically when hostname is anything other than `www.letsdog.nl` or `letsdog.nl` (preview URLs, localhost). Production hostnames send normally.
- **PostHog**: the **platform's** EU project since 2026-08-12 (`https://eu.i.posthog.com`), keyed via `NEXT_PUBLIC_POSTHOG_KEY/HOST`. Browser-only, initialised in `components/analytics/posthog-provider.tsx` (mounted in `app/layout.tsx`) — static export has no server runtime. **Legitimate interest, which is two halves, not one** (D-93 part C): it runs while the visitor has not answered, and it **stops on an explicit refusal of statistics** — and since 2026-08-17 (T-47) also on a **present-but-unreadable `ld_consent`**, which is not silence but an answer we cannot read (bytes go unreadable almost only because the two repos drifted, i.e. our own defect, which has to fall to the safe side; `readConsentState()` carries that third state, `absent` still measures) — the second half was built in T-24/T-31 U9 and is what makes the published cookie declaration true, so don't "tighten" it into a full opt-in gate (that changes the legal grounds) and don't remove the stop (that makes the grounds a fiction). Three non-obvious details, all measured: the refusal is read from the **merged** state of Cookiebot *and* `ld_consent` via `newestRecordedConsent()`, because a choice made on the platform reaches `ld_consent` first and a `$pageview` cannot be un-sent; `posthog.reset()` internally clears the opt-out, so `stop()` **resets first and opts out last**; and an opt-out persists, so `start()` must lift it or a re-grant leaves PostHog permanently silent. Follows the cross-product identity contract: `defaults:'2026-01-30'`, `respect_dnt`, session recording off, `cross_subdomain_cookie`, super-properties `app:'website'` + `environment:'production'|'preview'`, `person_profiles:'identified_only'`, autocapture off. `$pageview` is automatic (history-based via `defaults`). **`app:'website'` is load-bearing now that both hosts share a project — every website dashboard must filter on it.** `cross_subdomain_cookie` does **not** hand the visitor to the platform (it runs the React Native SDK, which never reads that cookie) — that gap is T-542 on the platform side; promise nothing from the flag.
- **Multi-fire**: `lib/analytics.ts` `trackEvent(name, params)` fires the SAME event to GA4 (gtag) AND PostHog, each guarded independently (a blocked sink never suppresses the other). The **Meta Pixel is a third sink on the same chokepoint but receives only a mapped subset** — the events that correspond to a Meta *standard* event (`begin_checkout`→`AddToCart`, both form successes→`Lead`, `view_item_list`→`ViewContent`), translated in `lib/meta-events.ts`. `cta_clicked` is deliberately not sent. **Event ownership is split across two hosts (D-101, 2026-08-11)** now that both `letsdog.nl` and the platform carry a pixel into the same dataset: this site owns `PageView`/`ViewContent`/`AddToCart`/`Lead`, the platform owns `InitiateCheckout` (only it can see a real checkout arrival, for both ways in) and `Purchase` (server-side over the Conversions API, never in a browser). `begin_checkout` therefore maps to `AddToCart`, not `InitiateCheckout` — an event both hosts fire is an event counted twice. Check that table in `docs/analytics-events.md` before adding a Meta mapping. `identifyLead(email)` is the single PostHog `identify` (contact- and creator-form success) — **it identifies on the anonymous `$device_id`, never on the email address** (T-46, 2026-08-17, reversing the old contract rule: one shared PostHog project since 2026-08-12 made an email-as-`distinct_id` a personal datum in a shared space and in a `.letsdog.nl` cookie, and the cross-host join runs on the shared `$device_id` anyway). The address rides along only as a person property, and only behind an explicit statistics yes. No `alias()`. **Add events by calling `trackEvent` — don't call `gtag`/`posthog` directly.** Full event reference (every event, trigger, properties + PostHog super-properties): [`docs/analytics-events.md`](docs/analytics-events.md).
- **CTA tracking**: `components/analytics/cta-tracker.tsx` mounts a delegated document click listener that fires `cta_clicked` (via `trackEvent`) for links to `mijn.letsdog.nl` (and the retiring `app.letsdog.nl`, kept listed while that host resolves), `keuzehulp.letsdog.nl`, `agenda.letsdog.nl`, the production checkout path (`<app host>/checkout*` → `link_destination:"checkout"`, split by path from the general `app` host — the `?plan=` choice rides in the query, so the path split still applies), and same-site pricing links (`/prijzen` + `#prijzen` → `"pricing"`). Params `link_url`, `link_text`, `link_location` (navbar/body), `link_destination` — **the last two are registered GA4 custom dimensions; do not rename.** Pricing additionally fires GA4-ecommerce `view_item_list` (`components/sections/pricing-view-tracker.tsx`) + `begin_checkout` (`components/sections/plan-cta.tsx`, with `billing_period` monthly/yearly + `items`). App-side `sign_up`/`purchase` live on the platform (`mijn.letsdog.nl`, owned by Jur). See the GA4 setup doc (`Tech/GA4 LD/`).
- **Consent is enforced for Google and Meta (2026-08-08, loop decision D-93 — reverses the earlier ungated posture).** Three moving parts, all in `components/analytics/`: `consent-default.tsx` sets the Consent Mode v2 default (everything `denied` but `security_storage`) before any Google tag can act — it must stay in `<head>` while GA4's `config` stays in `<body>`, because dataLayer push order is what makes it correct; `meta-pixel.tsx` refuses to request `fbevents.js` until marketing consent and revokes + clears `_fbp`/`_fbc` on withdrawal, driven by Cookiebot's public consent events rather than its auto-blocker (which never caught this pixel); `consent-cookie.tsx` + `lib/consent.ts` write the **`ld_consent`** handover cookie on `.letsdog.nl` so `mijn.letsdog.nl` can honour the same choice; `consent-sync.tsx` reads it back, so a choice changed on the platform takes effect here too — both hosts write this cookie, so every writer applies newest-wins and an absent local answer is never read as a withdrawal. **Since 2026-08-13 (loop decision D-4) the return leg also adopts a choice when Cookiebot holds no answer at all — but only one that allows ≥1 category; an all-false cookie is refused and the banner is shown.** That clamp is load-bearing, not a gap: `withdraw()` clears `hasResponse`, so "withdrew just now" and "never asked here" are the same observable state, and `recordConsentWithdrawal` has just written an all-false cookie stamped *now* — adopting it would feed this site's own withdrawal back into its own banner. A cookie allowing something provably cannot come from that writer (a withdrawal is all-false by definition), which is why `allowsAnyCategory` is shared by both and why the line sits there and nowhere else. Accepted price, stated not hidden: someone who refused everything on the platform is asked once more here. **Consequence worth knowing:** this is what makes the Meta *load* gate reachable for a platform-recorded marketing consent (it can only subtract from Cookiebot, so before D-4 nothing ever reached it without a local answer and the pixel could not load); a platform-recorded refusal still cannot load it. **That cookie's shape is a fixed cross-repo contract** with the platform's `packages/core/src/consent.ts` — one character off and the platform silently reads "everything refused"; `lib/consent.test.ts` pins it. **PostHog is deliberately not gated** (legitimate interest, D-93 part C). **Verify any change to this section on the deployed site with `npm run verify:live`** — the unit suite pins the wire formats and the decision logic, and pinned both while production was broken for a week. Residual, stated not hidden: gtag.js still sends a cookieless ping pre-consent (Google's "advanced" consent mode) — the one-line change to basic mode is documented in `ga4.tsx` and is Jur's call.

## Markdown-driven legal pages

The 8 legal pages (`privacybeleid`, `algemene-voorwaarden`, `ai-gebruiksvoorwaarden`, `cookieverklaring`, `retour`, `modelformulier-herroeping`, `veiligheidsdisclaimer`, `ip-overdrachtsverklaring`) read their body content from `content/<slug>.md` at build time. Each `page.tsx` is ~15 lines that loads the markdown and renders via `<LegalPageLayout>`. Edit `content/*.md` to change copy — no TSX touched.

- **Frontmatter** (all optional except `title`/`description`): `title`, `description`, `eyebrow` (default `"Juridisch"`), `lead` (white subhead under the green hero H1), `signature_form: true` (only ip-overdracht — appends the printable Naam/Datum/Handtekening form after the markdown body).
- **Supported markdown**: standard CommonMark + GFM tables (via `remark-gfm`). H2 = section, H3 = subsection, `-` = brand-green bullet, `[text](url)` = brand-green underlined link, `| col | col |` table = renders inside a beige `#EFE8E4` rounded card, `` `code` `` = beige inline pill (added 2026-08-12 for the cookie names the cookie declaration lists; without it these fall back to an unstyled monospace face the brand doesn't carry).
- **Shared layout**: `components/shared/legal-page-layout.tsx` owns the green hero band + react-markdown component overrides that map each markdown node to the existing Tailwind brand classes. Add a new legal page by writing `content/<slug>.md` + creating a 15-line `app/<slug>/page.tsx` using the same shape.
- **Build-time read only**: `lib/content.ts` does `fs.readFileSync` at module scope (Next.js static export resolves at build time). No client bundle impact; `react-markdown` is server-only. Front-matter is split with a small regex and parsed by `js-yaml` directly — we dropped `gray-matter` (unmaintained, dragged in a vulnerable js-yaml 3.x); **don't reintroduce it**, the flat title/description/lead/signature_form YAML doesn't need it.
- **Not in scope (yet)**: homepage and marketing pages (over-ons, prijzen, contact, faq, puppycursus) stay in TSX. Re-evaluate after a month of real editing — see `docs/brainstorms/markdown-content-refactor-requirements.md`.

## Bulk copy edits — the copy-deck workflow

For a large batch of text changes across several marketing pages, **don't** edit page-by-page in the browser (slow — one round-trip per string) and don't have the user dictate each change live. Instead, extract every visible string into one editable **copy deck** (`COPY-DECK.md` at the repo root): organised page → section, each block labelled with its role and a `· source:` file pointer. The user rewrites the prose freely in that single document; then Claude diffs it against the original, maps every change back to the source `.tsx`/`.ts` in one pass (re-encoding `&apos;`/`&ldquo;` entities to match the surrounding code), and verifies on the preview. This is the fastest path for volume copy work and the user prefers it. The deck from the 2026-06-16 refresh is kept in-repo as a working template — reuse its shape for the next pass.

## On-page SEO, metadata & spec compliance

Brought up to [The Website Specification](https://specification.website) on 2026-05-30 (plan: `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`). Key infrastructure:

- **Per-page metadata** — build it with `pageMetadata({ title, description, path })` from `lib/seo.ts`. It returns a complete title + self-referential canonical + full openGraph + twitter (incl. og:image), so we don't rely on Next's layout→page openGraph merge (which had leaked the homepage `og:url` onto every page). `metadataBase` = **apex `https://letsdog.nl`** (in `app/layout.tsx`); canonical host = apex, trailing slash. `/contact/` + `/veelgestelde-vragen/` are client components split into a server `page.tsx` (exports metadata) + a `*-content.tsx` (the client UI).
- **Structured data** — `lib/structured-data.ts` builds JSON-LD (Organization + WebSite sitewide via layout; FAQPage on FAQ; Product/Offer on prijzen; Person on over-ons), rendered by `components/shared/json-ld.tsx`. FAQ data is in `app/veelgestelde-vragen/faq-data.ts`, shared by the page and the FAQPage markup — **keep them in sync**.
- **robots / sitemap / manifest** — `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`. All metadata routes need `export const dynamic = "force-static"` under `output: export`.
- **Security** — `public/_headers` `/*` block: HSTS (basic `max-age` only), `X-Frame-Options: SAMEORIGIN`, CSP (`frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'` — the latter three are defense-in-depth, added 2026-06-25), a restrictive `Permissions-Policy`, and RFC 8288 `Link` headers. `public/.well-known/security.txt` (RFC 9116). Cloudflare auto-injects `nosniff` + `referrer-policy` — don't duplicate.
- **Agent-readiness** — `public/llms.txt` (curated index) and `public/.well-known/api-catalog` (RFC 9727 Linkset; `_headers` sets `application/linkset+json` since the file is extensionless) are advertised via the `Link` headers.
- **Cutover-gated items** (HSTS `preload`, CAA, `www`→apex 301, GSC sitemap, `*.pages.dev` noindex rule) live in `docs/CUTOVER.md` → "Spec compliance — post-cutover".
- **Maintenance — when you change content/images/routes:** follow the trigger→action→verify matrix in [`docs/website-spec-maintenance.md`](docs/website-spec-maintenance.md) so the spec systems (canonical, sitemap, JSON-LD, images, llms.txt) stay in sync. Re-run the spec MCP `audit_url` only periodically (before cutover, after a new page type, quarterly) — not on every edit.
- **Known follow-up (brand decision):** body/small text on brand-green `#75876D` maxes at 3.86:1 even in pure white — can't hit AA 4.5:1 without darkening the green or using dark text. Large headings pass (3:1). Not fixed unilaterally.

**Convention — image optimization:** photographic images are served as AVIF/WebP through `OptimizedImage` (`components/shared/optimized-image.tsx`), not raw `next/image`. When you add or swap a photo in `public/images/`: (1) `npm run optimize:images` to generate variants into `public/images/optimized/`, (2) **commit those variants** (committed so the Cloudflare build stays a plain `next build` — no native step in CI), (3) render with `<OptimizedImage src="/images/x.jpeg" … />` (raw path, no `asset()`). Image filenames must have **no spaces** (breaks `srcset`). Logos, SVGs and the app-store badges intentionally stay on `next/image`. `optimize:images` also generates AVIF/WebP for **PNG app screenshots** (e.g. the puppyagenda product shots `public/images/pa-*.png`); only `google-play-badge.png` is skipped by name (it stays on `next/image`).

**Convention — post-cutover checklist discipline:** after any change touching SEO / security / headers / canonical, update the "Spec compliance — post-cutover" checklist in `docs/CUTOVER.md`.

## Feature Development Workflow
Use the `/new-feature` skill for all new features. This handles branch creation, implementation, and PR workflow. The branch will get a preview build at `<branch-slug>.website-letsdog.pages.dev` — verify there before merging.

**Merge with a merge commit, not squash (decided 2026-05-31, codified 2026-08-03 as T-7).**
Default to `gh pr merge --merge --delete-branch`. The per-unit commits on a feature branch are
deliberate — keeping them on `main` is what makes `git revert <one unit>` and `git bisect`
usable; squashing collapses a multi-unit PR into a single blob that can only be reverted whole.
Squash (`--squash`) is the exception, for small or throwaway PRs whose intermediate commits carry
no information (a typo fix, a one-file tweak, a branch full of "wip"). Delete the branch on merge
either way.

**Pure-docs commits skip the branch + PR flow.** New files under `docs/solutions/`, updates to `CLAUDE.md`, and similar documentation-only changes go directly to `main`. They don't touch the production build, Cloudflare auto-redeploys without any user-visible change, and the branch-and-PR overhead isn't worth it for a one-file doc edit. The "never commit to main" rule still applies to code changes — heuristic: if the diff touches any file outside `docs/` or `CLAUDE.md`, branch + PR. (Both mentions of `HANDOFF.md` dropped 2026-08-03: it was retired here on 2026-08-02 — loop bookkeeping now lives in the `LDwebsite` workspace root and is committed by `close.sh`, never by this rule.) Codified 2026-05-29 after `/ce-compound` workflow precedent (commits `3f0e907`, `8ca381b` predecessors).

## Workflow harness — Compound Engineering

This project uses the **compound-engineering** harness (`harness: compound-engineering` in `~/.claude/skills/new-feature/project-ci-rules.md`). The `ce-*` skills supplement `/new-feature` — they don't replace it. `/new-feature` still owns branch creation, PR workflow, and merge. CE skills add a richer thinking flow before/around implementation and a knowledge-compounding loop after.

**Decision matrix — pick the entry point based on where you are:**

| Where you are | Use |
|---|---|
| Vague idea, want to explore the problem space | `/ce-brainstorm` (produces a right-sized requirements doc) |
| Shape is clear, need a structured plan | `/ce-plan` |
| Plan is ready, time to implement | `/ce-work` (or `/new-feature` if it's a tight scoped feature) |
| Standard branch → PR → merge feature (no upfront planning needed) | `/new-feature` directly |
| Debugging a stack trace, failing test, or stuck after failed fixes | `/ce-debug` |
| About to open a PR, want a second look | `/ce-code-review` (recommended on diffs ≥50 lines OR touching `components/analytics/**`, auth, or payments paths) |
| Just solved a non-trivial problem worth saving | `/ce-compound` (writes to `docs/solutions/`) |
| Want to find documented past solutions before starting | grep `docs/solutions/` by `tags:` or `module:` in YAML frontmatter |

**Knowledge store**: `docs/solutions/` contains learnings from past sessions, organized by category. Check it before debugging something that smells familiar, or before deciding architecture in a documented area. Each file has YAML frontmatter (`title`, `tags`, `module`, `problem_type`) that makes it searchable.

**Bootstrap**: if `.compound-engineering/config.local.yaml` doesn't exist in this repo yet, run `/ce-setup` once. It checks CE tool availability and creates the local config (gitignored).

## Cross-project knowledge (Let's Dog)

Lessons that span the Let's Dog apps (BreedSelector, Puppy Agenda, Website) live in a shared hub — the per-repo `/ce-compound` flow doesn't cross repos, so check here before solving anything cross-cutting.

**Hub:** `/Users/jurriaan/Documents/Coding/ldcoding/LD - project cross knowledge/` (repo `gaarlandt/ld-project-cross-knowledge`) — start at `index.md`.

**Before you touch any of these, read the canonical rule first — and note which app *owns* it (that's where the source of truth lives and where a change has to be coordinated):**

- **The consent handover cookie `ld_consent`** (both this site *and* the platform write it — anything touching `lib/consent.ts`, `components/analytics/consent-*.tsx`, or the cookie's shape) → read `contracts/cross-host-consent-handover.md`. **Owner: Let's Dog platform** (`mijn.letsdog.nl` — the *new* platform, not Puppy Agenda; its `packages/core/src/consent.ts` is the mirror reader). Two rules bind every writer: newest choice wins (and a timestamp-only difference is never a change), and an absent Cookiebot answer is not a withdrawal. Local war story: `docs/solutions/logic-errors/two-writers-on-one-record-need-a-newest-wins-rule.md`.
- **The attribution handover cookie `ld_attribution`** (this site *and* the platform both write it — anything touching `lib/attribution.ts`, `components/analytics/attribution-capture.tsx`, or the seven parameter names) → read `contracts/cross-host-attribution-handover.md`. **Owner: Let's Dog platform** (`mijn.letsdog.nl` — its `profiles` columns are the durable record). **FIRST touch wins — the exact inverse of `ld_consent` above, so do not copy that rule.** Seven names byte-identical to the platform's `ATTRIBUTION_URL_PARAMS`, truncated at 200; two consent gates (utm + `gclid` = statistics, `fbclid` = marketing), never one boolean. Pinned here by `lib/attribution.test.ts` — **and on the platform side by a test asserting a literal cookie string as this repo writes it**, so the shape is not ours alone to change: see the contract's Status section for what landed there and when. Also: the platform builds Meta's `fbc` from a stored `fbclid` using `t` as the click moment, which is a second reason that field is never restamped.
- **PostHog / cross-product identity** (`wp:<id>`, lowercased-email join) → read `contracts/posthog-cross-product-identity.md`. **Owner: Puppy Agenda** (origin: PA `docs/solutions/integrations/posthog-cross-product-identity.md`).
- **WordPress iframe embedding** (CSP-only vs shortcode+JWT) → read `contracts/wordpress-iframe-embedding.md`. **Owner: BreedSelector** (origin: BS `docs/solutions/architecture-patterns/wordpress-iframe-embedding-pattern-selection-2026-05-21.md`).
- **JWT / cookie / eTLD+1 auth** → read `contracts/jwt-cookie-auth-conventions.md`. **Owner: Puppy Agenda** (origin: PA's `env-driven-cookie-config`, `staging-dev-impersonation`, `cookie-deletion-…` docs).
- **Dog passport data** — dog name, date of birth, breed, … and medical data → **Owner: Puppy Agenda.** PA holds the canonical record, synced from WordPress → PA (design: PA `docs/plans/2026-05-27-001-feat-wp-dog-data-sync-plan.md`). This site will read these fields at later stages — coordinate with PA before depending on them.
- **HTML invoker commands** (button→overlay wiring — `command`/`commandfor` for popover/`<dialog>` toggle; prefer over hand-rolled `useState`+`onClick`+ARIA) → read `contracts/invoker-commands.md`. **Owner: Website Redesign** (this repo — spec-driven; grounded in Styling Conventions above + `docs/website-spec-maintenance.md`). Best local swap: `components/layout/app-store-coming-soon.tsx`.
- **National2 as the single typeface** (headings + body, no DM Sans/secondary body font; weights 400/500/700 only — no 600, don't request `font-semibold` against it) → read `contracts/national2-single-typeface.md`. **Owner: Website Redesign** (this repo — reference fix in `docs/solutions/conventions/national2-single-typeface-brand-reconciliation.md`; WOFF2-subsetting follow-up in `docs/solutions/developer-experience/subsetting-national2-to-woff2.md`). BS/PA carrying the same pre-brand-guide-correction drift is the open question the contract exists to close.
- **Workers / Pages, Supabase, Next.js, design-system gotchas** → `index.md` (per-cluster origin docs listed there).

**Lessons from the other apps that apply *here*:** [docs/solutions/cross-project/lessons-from-other-ld-apps.md](docs/solutions/cross-project/lessons-from-other-ld-apps.md)

To record a new cross-cutting lesson, say **"this is a cross-project learning."**

## Important Notes
- Static export: no Next.js server features (no API routes, no SSR). **One exception:** the contact form POSTs to a Cloudflare Pages Function at `functions/api/contact.ts` (relays to Postmark in one `/email/batch` call that emails both the support inbox and a best-effort confirmation copy back to the submitter; token in `POSTMARK_SERVER_TOKEN`). The Function verifies a Cloudflare Turnstile token before sending (anti-abuse; keys `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, with an always-pass test-key fallback when unset). Cloudflare runs `functions/` alongside the static `out/`, so the build stays a plain `next build` (the Function is web-standard `Request`/`Response`/`fetch` only — no Node APIs, no npm deps; typed locally so `next build`'s `**/*.ts` typecheck passes). Note: `functions/` does **not** run under `next dev` — verify the form on the Cloudflare preview. Metadata routes (`app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`) need `export const dynamic = "force-static"`.
- Next's image optimizer is off (`images.unoptimized: true`, required for static export) — modern formats come from the `OptimizedImage` `<picture>` component + committed `sharp` variants instead (see the spec-compliance section).
- The `asset()` helper in `lib/utils.ts` prepends the base path to image URLs. Logos/badges still use it via `next/image`; `OptimizedImage` takes a raw path and applies `asset()` internally.
- Rassenkeuze hulp page embeds an iframe from `keuzehulp.letsdog.nl` (renamed from "Hondenkeuze" 2026-05-29; old `/hondenkeuze/` URL 301-redirects via `public/_redirects`). The page forwards its own URL query string into the iframe `src` (plus a forced `source=website`) via a small `"use client"` child (`app/rassenkeuze/rassenkeuze-embed.tsx`) that reads `window.location.search` in a `useEffect` — deliberately **not** `useSearchParams()`, which forces a Suspense boundary under static export; `page.tsx` stays a Server Component (keeps `metadata`). This powers BreedSelector's results-email deep-links back to `/rassenkeuze/?q1=…` (BS jumps straight to results from those params; whether localhost/preview hosts may frame keuzehulp is controlled by **BS's** `frame-ancestors`, not us).
- `public/_headers` and `public/_redirects` are Cloudflare-Pages-specific config files (copied to `out/` during build). The merge gotcha is specifically about the **same** header set by two matching rules — keep the `/*` block (security + `Link` headers, **no Cache-Control**) disjoint from the per-directory Cache-Control blocks. Never add Cache-Control to `/*`; never add a second rule that sets a header `/*` already sets.
- **In-page anchor offset:** `app/globals.css` sets `scroll-padding-top: 6rem` on `html` (96px — clears the fixed navbar `h-16 lg:h-20` + breathing room). Every new `#anchor` target on any page lands correctly below the navbar for both click-scroll and cold-load deep-links, with no per-element `scroll-margin-top` needed. If a future element ever needs a different offset, add a local `scroll-margin-top` override.
