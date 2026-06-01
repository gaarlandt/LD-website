# Let's Dog — Marketing Website

## Project Overview
Marketing website for Let's Dog, a puppy training platform. Built as a static Next.js site deployed on Cloudflare Pages.

## Tech Stack
- **Framework**: Next.js 16 (static export via `output: "export"`)
- **React**: 19
- **Styling**: Tailwind CSS v4 (utility-first, no CSS modules)
- **Animations**: Framer Motion
- **Icons**: Lucide React + inline SVGs (WhatsApp, TikTok)
- **Fonts**: National2 (headings, local OTF), DM Sans (body, Google Fonts)
- **Images**: photographic JPEGs served as AVIF/WebP via the `OptimizedImage` `<picture>` component; variants generated at build-time by `sharp` ^0.34 (`scripts/optimize-images.mjs`) — see "On-page SEO, metadata & spec compliance" below
- **Content (legal pages)**: Markdown via `gray-matter` ^4 + `react-markdown` ^10 + `remark-gfm` ^4 — see "Markdown-driven legal pages" below
- **Analytics**: GA4 (`G-0FCGXJHMMY`, fires immediately) + Cookiebot banner (display-only, does not gate tracking)
- **Deployment**: Cloudflare Pages (project: `website-letsdog`, production URL: `website-letsdog.pages.dev`, custom domains flip in at cutover)

## Key Commands
```bash
npm run dev             # Start dev server (Turbopack)
npm run build           # Static export to ./out
npm run lint            # ESLint (no config committed yet — pre-existing, don't block on it)
npm run optimize:images # Regenerate AVIF/WebP variants after adding/changing a photo
npm run assets          # optimize:images + regenerate favicons + og image
```

## Dev Server / Preview
Use `preview_start("letsdog-website")` to start the dev server via the preview tool. The launch.json config is at `.claude/launch.json` and uses `autoPort: true` so it won't collide with other dev servers.

The preview sandbox requires Node v20 (not v24) — the launch.json uses the absolute path `/Users/jurriaan/.nvm/versions/node/v20.19.5/bin/node`. If Node versions change, update this path.

**Always verify changes visually** after modifying UI components — use the preview verification workflow (snapshot, inspect, screenshot).

## Project Structure
```
.
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
│   ├── prijzen/            # Pricing page
│   ├── puppyagenda/        # Puppy agenda page
│   ├── veelgestelde-vragen/ # FAQ page
│   ├── privacybeleid/      # Privacy policy
│   ├── ai-gebruiksvoorwaarden/ # AI terms of use
│   ├── cookieverklaring/   # Cookie declaration
│   ├── retour/             # Return & cancellation policy
│   └── ip-overdrachtsverklaring/ # IP transfer declaration
├── components/
│   ├── layout/             # Navbar, Footer
│   ├── sections/           # Homepage sections (hero, problem, hope, etc.)
│   ├── shared/             # Reusable (WhatsApp, reveal, section-wrapper, JsonLd, OptimizedImage, legal layout)
│   └── analytics/          # Cookiebot, GA4, CTATracker
├── content/                # Markdown source for the 5 legal pages (privacybeleid, ai-gebruiksvoorwaarden, cookieverklaring, retour, ip-overdrachtsverklaring). Edit these to change copy without touching TSX.
├── lib/
│   ├── utils.ts            # Asset path helper
│   ├── seo.ts              # SITE_URL/SITE_NAME + pageMetadata() (per-page canonical/og/twitter)
│   ├── structured-data.ts  # JSON-LD builders (Organization, WebSite, FAQPage, Product, Person)
│   ├── content.ts          # loadLegalContent(slug) — reads content/<slug>.md at build time via gray-matter
│   └── analytics.ts        # trackEvent helper + window.gtag types
├── public/                 # Static assets (images, fonts, _headers, _redirects, llms.txt, .well-known/security.txt, og/, images/optimized/)
├── scripts/                # Build-time asset generators (optimize-images, generate-icons, generate-og-image) — sharp
├── docs/                   # Documentation
│   ├── CUTOVER.md          # DNS cutover runbook
│   └── solutions/          # /ce-compound learnings, organized by category (developer-experience, integration-issues, etc.) with YAML frontmatter for searchability
├── .env.example            # Documents env vars (NEXT_PUBLIC_GA_MEASUREMENT_ID, NEXT_PUBLIC_COOKIEBOT_CBID)
└── .github/workflows/      # CI/CD (no deploy workflows — Cloudflare Pages handles deploys)
```

## Styling Conventions
- **Colors**: Brand green `#75876D`, Beige `#EFE8E4`, Black `#141414`, Peach `#FFA580`, Dark green `#162A0E`, Soft blue `#6E8FB8` (use sparingly — small accents only, never as a primary surface or large fill)
- **Approach**: Inline Tailwind classes, no CSS modules or external stylesheets
- **Responsive**: Mobile-first, `md:` and `lg:` breakpoints
- **Nav hover**: Brand green underline animates on hover via `after:` pseudo-element

## Navigation Order
```
Rassenkeuze hulp | Puppyagenda | Prijzen | Over ons | FAQ | Contact
```
Defined in `components/layout/navbar.tsx` (desktop + mobile) and `components/layout/footer.tsx`. Desktop navbar also includes outlined **Inloggen** + solid green **Start gratis** CTA buttons (both link to `app.letsdog.nl`).

## Deployment

**Cloudflare Pages, Git-integrated. No GitHub Actions deploy workflows — Cloudflare handles deploys directly from GitHub pushes.**

- **Production**: Merge to `main` → Cloudflare auto-builds + deploys → live on `website-letsdog.pages.dev`, custom domains `www.letsdog.nl` + `letsdog.nl` (after Phase 5 cutover, see `docs/CUTOVER.md`)
- **Preview**: Push to any non-main branch → Cloudflare auto-builds → preview URL at `<branch-slug>.website-letsdog.pages.dev`
- **Preview-first discipline**: always verify on the preview URL before merging to main. Auto-builds for non-prod branches must be enabled in Cloudflare Pages → Settings → Build → Branch control.
- **Env vars** (set in Cloudflare Pages → Settings → Variables and Secrets, scoped to Production AND Preview):
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-0FCGXJHMMY`
  - `NEXT_PUBLIC_COOKIEBOT_CBID=<Domain Group ID from Cookiebot dashboard>`
  - `NODE_VERSION=20`
  - `POSTMARK_SERVER_TOKEN=<Postmark Server API token>` — **secret** (NOT `NEXT_PUBLIC`); powers the contact form via `functions/api/contact.ts`. Optional: `CONTACT_TO` (default `support@letsdog.nl`), `CONTACT_FROM` (default `noreply@letsdog.nl`, must be a Postmark-verified sender).

## Analytics & Consent
- **GA4**: measurement ID `G-0FCGXJHMMY` (shared across all Let's Dog domains — `www`, `keuzehulp`, `agenda`, `app`). See the GA4 doc in Google Drive (`Tech/GA4 LD/`) for cross-domain config, custom dimensions, key events, Google Ads conversion mapping.
- **Hostname behavior**: GA4 sends `debug_mode: true` automatically when hostname is anything other than `www.letsdog.nl` or `letsdog.nl` (preview URLs, localhost). Production hostnames send normally.
- **CTA tracking**: `components/analytics/cta-tracker.tsx` mounts a delegated document click listener that fires `cta_clicked` events for any link to `app.letsdog.nl`, `keuzehulp.letsdog.nl`, or `agenda.letsdog.nl` with params `link_url`, `link_text`, `link_location` (navbar/body), `link_destination`.
- **Cookiebot banner is display-only.** GA4 fires regardless of consent state — see comment in `components/analytics/ga4.tsx` for how to restore real gating if that decision is reversed.

## Markdown-driven legal pages

The 5 legal pages (`privacybeleid`, `ai-gebruiksvoorwaarden`, `cookieverklaring`, `retour`, `ip-overdrachtsverklaring`) read their body content from `content/<slug>.md` at build time. Each `page.tsx` is ~15 lines that loads the markdown and renders via `<LegalPageLayout>`. Edit `content/*.md` to change copy — no TSX touched.

- **Frontmatter** (all optional except `title`/`description`): `title`, `description`, `eyebrow` (default `"Juridisch"`), `lead` (white subhead under the green hero H1), `signature_form: true` (only ip-overdracht — appends the printable Naam/Datum/Handtekening form after the markdown body).
- **Supported markdown**: standard CommonMark + GFM tables (via `remark-gfm`). H2 = section, H3 = subsection, `-` = brand-green bullet, `[text](url)` = brand-green underlined link, `| col | col |` table = renders inside a beige `#EFE8E4` rounded card.
- **Shared layout**: `components/shared/legal-page-layout.tsx` owns the green hero band + react-markdown component overrides that map each markdown node to the existing Tailwind brand classes. Add a new legal page by writing `content/<slug>.md` + creating a 15-line `app/<slug>/page.tsx` using the same shape.
- **Build-time read only**: `lib/content.ts` does `fs.readFileSync` at module scope (Next.js static export resolves at build time). No client bundle impact; `react-markdown` is server-only.
- **Not in scope (yet)**: homepage and marketing pages (over-ons, prijzen, contact, faq, puppyagenda) stay in TSX. Re-evaluate after a month of real editing — see `docs/brainstorms/markdown-content-refactor-requirements.md`.

## On-page SEO, metadata & spec compliance

Brought up to [The Website Specification](https://specification.website) on 2026-05-30 (plan: `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`). Key infrastructure:

- **Per-page metadata** — build it with `pageMetadata({ title, description, path })` from `lib/seo.ts`. It returns a complete title + self-referential canonical + full openGraph + twitter (incl. og:image), so we don't rely on Next's layout→page openGraph merge (which had leaked the homepage `og:url` onto every page). `metadataBase` = **apex `https://letsdog.nl`** (in `app/layout.tsx`); canonical host = apex, trailing slash. `/contact/` + `/veelgestelde-vragen/` are client components split into a server `page.tsx` (exports metadata) + a `*-content.tsx` (the client UI).
- **Structured data** — `lib/structured-data.ts` builds JSON-LD (Organization + WebSite sitewide via layout; FAQPage on FAQ; Product/Offer on prijzen; Person on over-ons), rendered by `components/shared/json-ld.tsx`. FAQ data is in `app/veelgestelde-vragen/faq-data.ts`, shared by the page and the FAQPage markup — **keep them in sync**.
- **robots / sitemap / manifest** — `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`. All metadata routes need `export const dynamic = "force-static"` under `output: export`.
- **Security** — `public/_headers` `/*` block: HSTS (basic `max-age` only), `X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'`, a restrictive `Permissions-Policy`, and RFC 8288 `Link` headers. `public/.well-known/security.txt` (RFC 9116). Cloudflare auto-injects `nosniff` + `referrer-policy` — don't duplicate.
- **Agent-readiness** — `public/llms.txt` (curated index) advertised via the `Link` headers.
- **Cutover-gated items** (HSTS `preload`, CAA, `www`→apex 301, GSC sitemap, `*.pages.dev` noindex rule) live in `docs/CUTOVER.md` → "Spec compliance — post-cutover".
- **Maintenance — when you change content/images/routes:** follow the trigger→action→verify matrix in [`docs/website-spec-maintenance.md`](docs/website-spec-maintenance.md) so the spec systems (canonical, sitemap, JSON-LD, images, llms.txt) stay in sync. Re-run the spec MCP `audit_url` only periodically (before cutover, after a new page type, quarterly) — not on every edit.
- **Known follow-up (brand decision):** body/small text on brand-green `#75876D` maxes at 3.86:1 even in pure white — can't hit AA 4.5:1 without darkening the green or using dark text. Large headings pass (3:1). Not fixed unilaterally.

**Convention — image optimization:** photographic images are served as AVIF/WebP through `OptimizedImage` (`components/shared/optimized-image.tsx`), not raw `next/image`. When you add or swap a photo in `public/images/`: (1) `npm run optimize:images` to generate variants into `public/images/optimized/`, (2) **commit those variants** (committed so the Cloudflare build stays a plain `next build` — no native step in CI), (3) render with `<OptimizedImage src="/images/x.jpeg" … />` (raw path, no `asset()`). Image filenames must have **no spaces** (breaks `srcset`). Logos, SVGs and the app-store badges intentionally stay on `next/image`.

**Convention — post-cutover checklist discipline:** after any change touching SEO / security / headers / canonical, update the "Spec compliance — post-cutover" checklist in `docs/CUTOVER.md`.

## Feature Development Workflow
Use the `/new-feature` skill for all new features. This handles branch creation, implementation, and PR workflow. The branch will get a preview build at `<branch-slug>.website-letsdog.pages.dev` — verify there before merging.

**Pure-docs commits skip the branch + PR flow.** New files under `docs/solutions/`, updates to `CLAUDE.md` / `HANDOFF.md`, and similar documentation-only changes go directly to `main`. They don't touch the production build, Cloudflare auto-redeploys without any user-visible change, and the branch-and-PR overhead isn't worth it for a one-file doc edit. The "never commit to main" rule still applies to code changes — heuristic: if the diff touches any file outside `docs/`, `CLAUDE.md`, or `HANDOFF.md`, branch + PR. Codified 2026-05-29 after `/ce-compound` workflow precedent (commits `3f0e907`, `8ca381b` predecessors).

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

## Important Notes
- Static export: no Next.js server features (no API routes, no SSR). **One exception:** the contact form POSTs to a Cloudflare Pages Function at `functions/api/contact.ts` (relays to Postmark; token in `POSTMARK_SERVER_TOKEN`). Cloudflare runs `functions/` alongside the static `out/`, so the build stays a plain `next build` (the Function is web-standard `Request`/`Response`/`fetch` only — no Node APIs, no npm deps; typed locally so `next build`'s `**/*.ts` typecheck passes). Note: `functions/` does **not** run under `next dev` — verify the form on the Cloudflare preview. Metadata routes (`app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`) need `export const dynamic = "force-static"`.
- Next's image optimizer is off (`images.unoptimized: true`, required for static export) — modern formats come from the `OptimizedImage` `<picture>` component + committed `sharp` variants instead (see the spec-compliance section).
- The `asset()` helper in `lib/utils.ts` prepends the base path to image URLs. Logos/badges still use it via `next/image`; `OptimizedImage` takes a raw path and applies `asset()` internally.
- Rassenkeuze hulp page embeds an iframe from `keuzehulp.letsdog.nl` (renamed from "Hondenkeuze" 2026-05-29; old `/hondenkeuze/` URL 301-redirects via `public/_redirects`)
- `public/_headers` and `public/_redirects` are Cloudflare-Pages-specific config files (copied to `out/` during build). The merge gotcha is specifically about the **same** header set by two matching rules — keep the `/*` block (security + `Link` headers, **no Cache-Control**) disjoint from the per-directory Cache-Control blocks. Never add Cache-Control to `/*`; never add a second rule that sets a header `/*` already sets.
- **In-page anchor offset:** `app/globals.css` sets `scroll-padding-top: 6rem` on `html` (96px — clears the fixed navbar `h-16 lg:h-20` + breathing room). Every new `#anchor` target on any page lands correctly below the navbar for both click-scroll and cold-load deep-links, with no per-element `scroll-margin-top` needed. If a future element ever needs a different offset, add a local `scroll-margin-top` override.
