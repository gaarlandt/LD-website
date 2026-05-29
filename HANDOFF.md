# Session Handover — Let's Dog Marketing Website

**Purpose**: this file lets a fresh Claude session (or a human picking up the project) get fully oriented in <5 minutes without re-asking what's been done. Read me first whenever you start work here.

**Last session ended**: 2026-05-29. Pricing refresh + UX sweep shipped: 3-tier pricing model (Flexibel €12,99/mo, Early Member €59/€99, Jaar + Consult €79/€119) replaced the old free-vs-paid split; all "Geen creditcard" copy swept to "7 dagen proberen · opzegbaar in de app"; Navbar got an Inloggen button next to Start gratis; Play Store badge now links to the real app; hero scaled up; Hondenkeuze renamed to "Rassenkeuze hulp" (path `/rassenkeuze/`, 10 questions); soft blue `#6E8FB8` added to the brand palette for sparing use. Previous session (2026-05-28) landed: CE harness fully wired + markdown content refactor for the 5 legal pages. DNS cutover to `www.letsdog.nl` still deferred.

---

## TL;DR

Marketing site built with Next.js 16 static export, deployed on Cloudflare Pages at `website-letsdog.pages.dev`. GA4 + Cookiebot wired in, analytics fires on every page load regardless of consent (explicit decision). DNS for `letsdog.nl` still points at the old WordPress site at SiteGround — that's the deferred cutover step, runbook at [`docs/CUTOVER.md`](docs/CUTOVER.md).

The 5 legal pages now read their copy from `content/<slug>.md` (gray-matter + react-markdown + remark-gfm) — Jur can edit prose without touching TSX. Marketing/homepage stays TSX; re-evaluate after a month.

Next priority: ongoing website tweaks. Jur drives each tweak; you implement.

## ⚡ First action for the new session

**Run `/ce-setup` before anything else.** The Compound Engineering harness was enabled for this project on 2026-05-28 (`harness: compound-engineering` in `~/.claude/skills/new-feature/project-ci-rules.md`, decision matrix documented in CLAUDE.md's "Workflow harness" section). The repo doesn't yet have `.compound-engineering/config.local.yaml` — `/ce-setup` bootstraps it interactively and adds the `.gitignore` entry. Takes <1 minute.

After that, you can use `/ce-brainstorm` / `/ce-plan` / `/ce-work` / `/ce-debug` / `/ce-code-review` / `/ce-compound` alongside `/new-feature`. See CLAUDE.md for which to pick when.

---

## Current state of the project

| Aspect | Value |
|---|---|
| Repo | `gaarlandt/LD-website` on GitHub |
| Live preview URL | `https://website-letsdog.pages.dev` |
| Production custom domain | NOT YET BOUND — `www.letsdog.nl` still on WordPress (SiteGround, `35.214.137.79`) |
| Hosting | Cloudflare Pages, project name `website-letsdog` |
| CI/CD | Cloudflare Pages Git integration. Push to `main` → auto-deploy to production. Push to any branch → preview at `<branch-slug>.website-letsdog.pages.dev` |
| Build command | `npm run build` (Next.js static export to `out/`) |
| Node | v20 (pinned in `.claude/launch.json` AND `NODE_VERSION` env var in CF) |
| Analytics | GA4 `G-0FCGXJHMMY` — shared with `keuzehulp.letsdog.nl`, `agenda.letsdog.nl`, `app.letsdog.nl`. Fires immediately on every page (no consent gating). Non-prod hostnames get `debug_mode: true` + `traffic_type: 'internal'` so they're auto-filtered out of standard GA4 reports by the "Internal Traffic" Data Filter. |
| Consent banner | Cookiebot loads on production but is **display-only** — does not gate tracking. CBID stored in CF env var `NEXT_PUBLIC_COOKIEBOT_CBID`. |

---

## What was accomplished in this session (2026-05-29)

**Pricing refresh + UX sweep — single PR `feature/pricing-refresh-ux-sweep`**

Business / copy changes
- New 3-tier pricing model: **Flexibel** €12,99/maand (maandelijks opzegbaar), **Early Member** €59/eerste jaar (daarna €99 — the launch deal, peach-highlighted as "Meest gekozen"), **Jaar + Consult** €79/eerste jaar (daarna €119, includes 1× online consult t.w.v. €39). The legacy free €0 tier is gone.
- The marketing site reflects a 7-day post-payment trial (refund window in the app). All "Geen creditcard" / "geen betaalgegevens" lines swept to **"7 dagen proberen · opzegbaar in de app"** — deliberately soft framing per Jur. The refund mechanic is intentionally NOT advertised explicitly.
- /prijzen FAQ updated: dropped the "upgrade van gratis" Q, added a "Hoe lang geldt de Early Member-prijs?" Q, kept payment-methods + Mollie Q, softened "niet tevreden" Q to imply the 7-day window without naming it.

UI / structural changes
- `components/sections/pricing.tsx`: completely rewritten — 3-card layout on `bg-[#75876D]` with white cards, peach-highlighted middle tier, trust bar + 4,8★ rating below. Now used on both homepage and `/prijzen`.
- `app/prijzen/page.tsx`: new beige upper hero ("Eén juiste aanpak. Drie manieren om te starten." with peach accent, three pills, "Vanaf €4,92 per maand" peach badge) above the shared `<Pricing>` section.
- `components/sections/hero.tsx`: scaled H1 to `lg:text-[5rem]`, widened content to `max-w-2xl`, image now starts at `left-[45%]` desktop, eyebrow uses em-dash style ("— Welzijnsgerichte puppytraining" uppercase), fine print swept to "7 dagen proberen · opzegbaar in de app".
- `components/layout/navbar.tsx`: added outlined **Inloggen** button next to **Start gratis** on desktop, plus stacked in the mobile drawer. Both point to `https://app.letsdog.nl` (app handles auth redirect).
- `components/sections/how-it-works.tsx`: Google Play badge is now a real `<a href="https://play.google.com/store/apps/details?id=nl.letsdog.app" target="_blank">`. App Store badge keeps its existing "Binnenkort beschikbaar" toast (iOS not out yet).
- `components/sections/final-cta.tsx`: fine print swept too.

Renames + routing
- `app/hondenkeuze/` → `app/rassenkeuze/` (via `git mv` — history preserved).
- "Hondenkeuze" → "Rassenkeuze hulp" everywhere (navbar, footer, breed-selector eyebrow, metadata, page H1 eyebrow, button label, iframe title).
- "8 korte vragen" → "10 korte vragen" everywhere.
- Added 2 lines to `public/_redirects`: `/hondenkeuze/ → /rassenkeuze/ 301` and `/hondenkeuze → /rassenkeuze/ 301`. Verify post-deploy that Cloudflare honors both (it should — that's the standard `_redirects` format).
- CLAUDE.md updated: project structure list, Navigation Order, palette (`#6E8FB8` soft blue added), iframe origin note for rassenkeuze.

**Security model**: Business logic lives client-only — this is a static-exported Next.js marketing site with no API routes or server actions. No auth-adjacent data touched; price strings + CTAs are presentational, the actual payment flow lives downstream in `app.letsdog.nl`/Mollie. Defense in depth: N/A at this layer (billing security is owned by the app, not the marketing site). Test plan: build passes + visual verification on Cloudflare preview URL before merge.

**Session log:** 2026-05-29 — pricing refresh + UX sweep — security model: client-only static export, no auth-adjacent data, billing security owned by `app.letsdog.nl` downstream.

---

## What was accomplished in the previous session (2026-05-28)

Two PRs landed:

**PR #6 — Initial migration (squash-merged as `76dabd5`)**
- Added GA4 + Cookiebot + CTA click tracker components under `components/analytics/`
- `public/_redirects` for WP-slug bridges (only `/test/ → /` and `/privacy-policy/ → /privacybeleid/` remain)
- `public/_headers` for immutable cache on static assets
- Recreated `/retour/` and `/ip-overdrachtsverklaring/` pages from old WP content
- Cloudflare Pages project created, env vars set, preview deployments enabled

**PR #7 — Post-migration cleanup (squash-merged as `1da86e1`)**
- Removed the `NEXT_PUBLIC_SKIP_COOKIE_CONSENT` env-var bypass (was a temporary testing mechanism); GA4 now permanently fires without consent gating
- Added `app/icon.svg` favicon (Next.js auto-wires `<link rel="icon">`)
- Sends `traffic_type: 'internal'` on non-prod hostnames so the GA4 Data Filter excludes preview/staging from standard reports
- Rewrote `CLAUDE.md` for Cloudflare instead of Firebase
- Wrote `docs/CUTOVER.md` (self-contained DNS-cutover runbook — read that doc on cutover day, don't ask Claude to regenerate steps)

**Operational cleanup done by Jur**
- Firebase Hosting site `website-letsdog` deleted from Firebase console (the Firebase *project* stays alive because `puppyagenda.web.app` and `rassenkeuze.web.app` still use it)
- Orphaned GA4 data stream `Website` (ID `14274309491`) deleted
- Cloudflare Pages env vars `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_COOKIEBOT_CBID`, `NODE_VERSION` set for Production AND Preview
- GA4 "Internal Traffic" Data Filter activated (filters events tagged `traffic_type='internal'` out of standard reports)

---

## What's open / what's next

| Priority | Item | Notes |
|---|---|---|
| 1 — done | **Markdown content refactor (legal pages only)** | ✅ Shipped this session. 5 legal pages now read from `content/*.md`. Marketing/homepage stays TSX; re-evaluate in ~1 month (target: ~2026-06-28) based on whether Jur actually edits the markdown. See [`docs/brainstorms/markdown-content-refactor-requirements.md`](docs/brainstorms/markdown-content-refactor-requirements.md) + [`docs/plans/2026-05-28-001-refactor-legal-pages-to-markdown-plan.md`](docs/plans/2026-05-28-001-refactor-legal-pages-to-markdown-plan.md). |
| 2 — ongoing | **Website tweaks driven by Jur** | Visual / content changes. Legal-page copy edits = edit `content/*.md` (no Claude needed). Other pages = `/new-feature` → branch → preview verify → merge. |
| 3 — when Jur decides | **DNS cutover** | Follow [`docs/CUTOVER.md`](docs/CUTOVER.md) verbatim. Self-contained playbook, do NOT regenerate. |
| 4 — separate PR, post-cutover | **UTM-source params on CTA buttons** | Extend `components/analytics/cta-tracker.tsx` to include `utm_source` / `utm_medium` / `utm_campaign` per button. For both GA4 (extend the `cta_clicked` event params) AND PostHog (separate event capture). |
| 5 — post-cutover, on request | **GSC verification** | Only if Jur asks. Pull organic-traffic URLs, scan for 404 spikes. |
| 6 — when reconsidered | **Real consent gating** | Currently bypassed. To restore: add `type="text/plain"` + `data-cookieconsent="statistics"` to both `<script>` tags in `components/analytics/ga4.tsx`. Single-file change. |

---

## Where to look for what

```
app/
  layout.tsx                 # mounts navbar, footer, WhatsApp btn, Cookiebot, GA4, CTATracker
  page.tsx                   # homepage
  icon.svg                   # favicon (Next auto-wires)
  <route>/page.tsx           # one file per route, all in Dutch (Nederlands)
components/
  layout/{navbar,footer}.tsx # nav + footer; legal links live in footer
  sections/                  # homepage sections (hero, problem, hope, pricing, cta, etc.)
  shared/                    # WhatsApp button, reveal animation, section-wrapper
  analytics/                 # Cookiebot, GA4, CTATracker — env-gated, comments explain trade-offs
lib/
  analytics.ts               # trackEvent() helper + window.gtag types
  utils.ts                   # asset() helper for image paths (prepends base path)
public/
  _redirects                 # CF Pages redirect rules
  _headers                   # CF Pages response headers — DO NOT use overlapping patterns
  images/                    # logos, photos
  fonts/                     # local OTFs
docs/
  CUTOVER.md                 # DNS cutover playbook — read at cutover time
  solutions/                 # /ce-compound learnings (CE harness). Grep by tags/module before debugging or designing in a documented area.
CLAUDE.md                    # project conventions, stack, deploy flow, harness decision matrix — read for orientation
HANDOFF.md                   # this file
.env.example                 # env vars documented
.claude/launch.json          # dev server config (autoPort, Node v20 pinned)
```

---

## Conventions to follow

**Coding**
- All UI text is in **Dutch** (Nederlands).
- Tailwind utility classes inline. No CSS modules, no styled-components.
- Brand colors: green `#75876D`, beige `#EFE8E4`, black `#141414`, peach `#FFA580`, dark green `#162A0E`. These are hard-coded inline because Tailwind v4 doesn't use a config file.
- Server components by default; add `"use client"` only when actually needed (hooks, browser APIs, event handlers).
- Use the existing `asset()` helper from `lib/utils.ts` for image paths.

**Workflow**
- Always use `/new-feature` skill for new work.
- Always branch off `main`, push, open PR, wait for `<branch-slug>.website-letsdog.pages.dev` preview build (~90s), verify, then merge. This is the project's CI/CD discipline.
- Squash merge + delete branch is the merge pattern.
- Verify visually on the preview URL via the preview tool (`preview_start("letsdog-website")` for local dev; live preview URL for shared validation).

**CLAUDE.md must list major versions of all tech.** When upgrading a dependency, update CLAUDE.md's Tech Stack section in the same commit.

---

## Important decisions made (don't re-litigate without checking)

1. **Cookiebot bypass is intentional.** Banner shows for UX, GA4 fires regardless. Jur explicitly accepted the GDPR risk. If revisiting, re-read `components/analytics/ga4.tsx` comment block.
2. **Mobile apps stay on their own GA4 streams.** All streams already share property `523856309`. Don't try to "unify under one measurement ID" — that's architecturally impossible for Firebase SDK apps.
3. **No GitHub Actions deploy workflows.** Cloudflare Pages handles deploys directly from Git. The old `.github/workflows/deploy-*.yml` were deleted during migration.
4. **WordPress sunset is NOT our job** — handed off to the dev agency. Don't propose deletion plans for the SiteGround instance.
5. **No favicon redesign yet.** Currently using `logo-black.svg` as favicon. Looks fine at typical browser-tab size. Standalone designed favicon is a future open item, not in scope.
6. **Use `*.pages.dev` for staging, not a custom subdomain.** Avoided adding `new.letsdog.nl` to Cookiebot Domain Group (would incur paid-plan cost). Preview verification done on the `*.pages.dev` URL where Cloudflare auto-adds `x-robots-tag: noindex`.
7. **7-day trial is post-payment, marketed as "7 dagen proberen".** The actual mechanic = user pays upfront via Mollie, then has 7 days to cancel in the app for a refund. The website deliberately does NOT say "geld terug" / "refund" — it says "7 dagen proberen · opzegbaar in de app" to feel like a free trial without misrepresenting the policy. Don't reintroduce "Geen creditcard nodig" copy.
8. **3-tier pricing replaces the old free tier.** No more €0 tier. If reintroduced, it'd be a deliberate funnel change, not "fixing" anything — check with Jur first.
9. **Soft blue `#6E8FB8` is a sparing accent only.** Added to the palette 2026-05-29 but not currently used on any page. Reserved for small dots, divider accents, badge dots. Never as a primary surface or large fill — the brand-green-and-peach hierarchy should still dominate.

---

## Common gotchas

1. **`public/_headers` cannot have overlapping path patterns.** Cloudflare MERGES headers when multiple rules match — you'll get duplicated `Cache-Control` directives and the conservative one wins, breaking immutable caching. Keep rules disjoint: one rule per directory or extension family, no catch-all. Current setup is correct; don't add a `/*` fallback.
2. **`NEXT_PUBLIC_*` env vars are inlined at BUILD time.** Setting them in CF dashboard alone does nothing — you must trigger a rebuild after changing them.
3. **Cloudflare Pages preview URLs only build for pushes that happen AFTER the GitHub OAuth was last (re)connected.** If the GitHub integration goes stale (icon shows disconnect warning), reconnect via Settings → Build → Git → Manage, then push a new commit to retrigger.
4. **GA4 events with `traffic_type='internal'` are filtered from BOTH standard reports AND DebugView when the Data Filter is Active.** To debug GA4 firing on the preview URL, temporarily set the Data Filter to "Testing" mode (events appear with a marker but aren't excluded). Switch back to Active afterward.
5. **Cookiebot banner cannot appear on `*.pages.dev`** — Cookiebot rejects unauthorized hostnames. Console will show `Error: The domain ... is not authorized`. Don't try to fix this for preview; just verify Cookiebot on production after DNS cutover.
6. **`npm run lint` is broken on main.** No ESLint config committed. Pre-existing issue, don't block on it. If you fix it, it'll need an `eslint.config.js` per ESLint v9 flat-config spec.
7. **The hydration mismatch warning in Next.js dev mode for the Cookiebot script is benign.** Production static export doesn't have this issue because the script tag is rendered server-side once and never mutated.

---

## How to verify a change works

**Local**:
```bash
npm run dev               # Turbopack dev server, autoPort
# Or via preview tool:
preview_start("letsdog-website")
```

**Preview (after pushing to a branch)**:
- URL: `https://<branch-slug>.website-letsdog.pages.dev/`
- Branch slugs replace `/` with `-`. `feat/foo-bar` → `feat-foo-bar.website-letsdog.pages.dev`.
- Build takes ~90s after push. If it doesn't appear, check the GitHub-OAuth-reconnect gotcha above.

**Production (after merging to main)**:
- URL: `https://website-letsdog.pages.dev/` (will become `www.letsdog.nl` post-cutover)
- Production deploy takes ~90s after merge

**Curl-based smoke tests**:
```bash
U="https://website-letsdog.pages.dev"
curl -sI $U/                          # 200 + cache headers
curl -sI $U/privacy-policy/           # 301 → /privacybeleid/
curl -sI $U/retour/                   # 200
curl -s  $U/ | grep -c "googletagmanager"   # 1 (GA4 present)
curl -s  $U/ | grep -c "Cookiebot"          # 1 (Cookiebot present)
```

---

## External references

- **GA4 setup doc** (Google Drive): `Tech/GA4 LD/Google Analytics Implementation Details LetsDog.md` — single source of truth for cross-domain config, custom dimensions, key events, Google Ads conversion mapping. Don't re-derive what's in there.
- **DNS** (Cloudflare): zone is `letsdog.nl`. All subdomains except `app` (which is WordPress at SiteGround) live on Cloudflare DNS or Cloudflare-fronted services.
- **Cookiebot dashboard**: `manage.cookiebot.com`. CBID `88d3c128-138d-47ef-a899-53eb2022cd69`. Domain Group includes `www.letsdog.nl`, `letsdog.nl`, `keuzehulp.letsdog.nl`, `agenda.letsdog.nl`, `app.letsdog.nl`. Do NOT add `*.pages.dev` — incurs paid-plan upgrade.
- **Cloudflare Pages dashboard**: project name `website-letsdog`, in the same Cloudflare account that owns `letsdog.nl`.

---

## When in doubt

1. Re-read [`CLAUDE.md`](CLAUDE.md) for conventions.
2. Re-read [`docs/CUTOVER.md`](docs/CUTOVER.md) before any DNS or production-impact work.
3. Re-read `~/.claude/skills/new-feature/project-ci-rules.md` (the entry titled "Let's Dog Website") for CI/build/env specifics.
4. Ask Jur. Don't guess on legal, brand, content, or strategic decisions.
