# Session Handover — Let's Dog Marketing Website

**Purpose**: this file lets a fresh Claude session (or a human picking up the project) get fully oriented in <5 minutes without re-asking what's been done. Read me first whenever you start work here.

**Last session ended**: 2026-06-02 (latest). **Homepage restructure MERGED — PR #27** (merge `bb6f036`, tag `release/homepage-restructure-20260602-192325`). Replaced the stale **"In drie stappen aan de slag"** block (its "gratis aanmelden" step contradicted the €12,99/mnd pricing) with a new **static** **"De puppyagenda"** 4-phase teaser (`components/sections/puppy-agenda-teaser.tsx` — Vóór de komst 15 / De eerste week thuis 8 / Wennen & socialiseren 10 / Ontdekken & groeien 20 lessen; **"Meer dan 150 lessen"** = full program, not the sum of the 4 shown; lesson-type chips checklist·video·audio·**gezondheid**, gezondheid = documented off-palette coral `#C2554B`, Phosphor `Heartbeat`). Homepage reordered to **Hero → Probleem → Wat je krijgt → Puppyagenda → Trust → Prijzen → Final CTA → slim rassenkeuze strip** (`components/sections/rassenkeuze-strip.tsx`, soft-blue P.S.). **"Wat je krijgt"** trimmed to outcomes + the on-the-go benefit folded in with a phone icon; its redundant "Puppyagenda voor elke week" callout **and** "Start vandaag" CTA removed. **App-store badges moved into the footer** ("Download de app"; Google Play live, App Store "binnenkort"; **no PWA copy** — PWA parked as a future to-do/FAQ). Final CTA → `#prijzen` (inline pricing). `how-it-works.tsx` + `breed-selector.tsx` **deleted**. Trust keeps its own "50+ videolessen" stat so 150+ isn't shown twice. All new sections are **server components** (static-export-safe). Plan: [`docs/plans/2026-06-02-001-feat-homepage-restructure-plan.md`](docs/plans/2026-06-02-001-feat-homepage-restructure-plan.md). New learning: [`docs/solutions/developer-experience/fresh-worktree-needs-npm-install.md`](docs/solutions/developer-experience/fresh-worktree-needs-npm-install.md) (a fresh worktree has no `node_modules`; the parent checkout's install was stale → build failed on `@radix-ui/react-label` until `npm install` in the worktree). The signed-off visual mockup `homepage-final-flow.html` was a repo-root scratch artifact (not committed).

**Earlier — 2026-05-31.** **Contact page redesign + working contact form MERGED — PR #17** (merge commit `0b9bd94`, tag `release/contact-page-redesign-20260531-191453`). `/contact` rebuilt to the mockup (beige split hero, restyled consult card, 3-card "Direct bereikbaar") and the old **fake** inline form replaced by an accessible **popup modal** that POSTs to a new **Cloudflare Pages Function** (`functions/api/contact.ts`) which relays to `support@letsdog.nl` via **Postmark** — the **first server-side code in this repo**. **Verified working in production:** `POST https://website-letsdog.pages.dev/api/contact` → `{"ok":true}` 200, real email delivered. Owner set `POSTMARK_SERVER_TOKEN` (Prod + Preview); `noreply@letsdog.nl` is a verified Postmark sender. Bundled in the same PR: privacy email `.com`→`.nl` ✅, 512px responsive image variant ✅ (both HANDOFF open items closed); `*.pages.dev` noindex deliberately skipped (owner). Two real bugs were caught by browser verification + fixed in-PR (modal `AnimatePresence` needed a stable `key`; `OptimizedImage` has its **own** `VARIANT_WIDTHS` that also needed `512`). Standalone resume doc: [`docs/HANDOFF-pr17-contact-form.md`](docs/HANDOFF-pr17-contact-form.md). New `docs/solutions/` learnings: framer-motion-animatepresence-stable-key, optimized-image-variant-widths-two-places, cloudflare-pages-preview-functions-gotchas. **Two follow-ups remain (both optional/low):** swap the placeholder contact-hero photo (`training.jpeg`), and National2→WOFF2 (awaiting owner files). Earlier the same day: **Website fixes bundle MERGED — PR #16**: sitewide 3-column footer redesign + Rassenkeuze page redesign + 5 content/UX polish fixes (app-badge sizing, retour §3, puppyagenda CTA, prijzen pill, footer copyright space). Verified on the Cloudflare preview, merged via merge commit + tagged `release/website-fixes-bundle-*`. Details in **"What was accomplished (2026-05-31, later — website fixes bundle)"** below. Earlier the same day: **Website spec-compliance MERGED.** PR #15 — the full plan (units U1–U15, Phases A–G) **plus review follow-ups** — was verified (build + `curl` + dev-server preview + Lighthouse) and **merged to `main` via a merge commit** (`6ed3ff2`; all per-unit commits preserved for granular rollback), tagged `release/website-spec-compliance-20260531-091748`. Production auto-deploys from `main`. Follow-ups folded into the same PR: a real on-domain **Algemene Voorwaarden** page + privacy/AI copied verbatim from the live site; **icons recolored to black-on-white**; all **"Start vandaag" CTAs → `/prijzen`** (Inloggen → app); **maintenance docs** (`docs/website-spec-maintenance.md` + a shareable copy for Reinoud); obsolete Firebase CI failures purged. Lighthouse (mobile preview): Perf ~89, CWV green (LCP 166 ms / CLS 0.033 / TBT 18 ms), A11y ~100 (only the documented brand-green contrast item remains). **👉 Start at "⚡ Next session — open items" below.** On 2026-05-30 — **spec-compliance planning** — audited the new site *and* the live old WordPress site against The Website Specification (now installed as a `specification-website` skill + MCP); wrote the build plan at `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`, locked all owner decisions, and produced the stakeholder comparison (`docs/2026-05-30-current-vs-new-site-spec-audit.{md,html}`). Previous session (2026-05-29): Pricing refresh + UX sweep shipped: 3-tier pricing model (Flexibel €12,99/mo, Early Member €59/€99, Jaar + Consult €79/€119) replaced the old free-vs-paid split; all "Geen creditcard" copy swept to "7 dagen proberen · opzegbaar in de app"; Navbar got an Inloggen button next to Start gratis; Play Store badge now links to the real app; hero scaled up; Hondenkeuze renamed to "Rassenkeuze hulp" (path `/rassenkeuze/`, 10 questions); soft blue `#6E8FB8` added to the brand palette for sparing use. Previous session (2026-05-28) landed: CE harness fully wired + markdown content refactor for the 5 legal pages. DNS cutover to `www.letsdog.nl` still deferred.

---

## ⚡ NEXT SESSION — open items + owner actions

**Over-ons + FAQ redesign is DONE — PR #18 merged 2026-06-01**, tag `release/over-ons-faq-redesign-20260601-083944`. Both pages are live on Cloudflare Pages. See open items table below for the one pending owner action (OA1 — consult product URL).

**▶ QUEUED: Brand-guide v2 site migration** (planned 2026-06-01, owner-approved, **not started**). Migrate the whole site (except `puppyagenda`) onto the DS v2 — full component adoption + tokens + v2 brand rules. Plan: [`docs/plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md`](docs/plans/2026-06-01-001-feat-brand-guide-v2-site-migration-plan.md). **Start here:** [`docs/HANDOFF-brand-guide-v2-migration.md`](docs/HANDOFF-brand-guide-v2-migration.md). Execute via `/new-feature`, **one PR per phase, Phase 0 first**. Locked decisions: multiple accent colors per page now allowed (v2 one-accent rule reversed — brand skill updated to match); eyebrows stay brand-green on light (`tone="brand"`); keep `BeigeSplitHero` inline; keep star-gold as documented exception. Only `/prijzen` is converted today.

(Other open items below remain: OA1 consult product URL, contact-hero placeholder photo swap, National2→WOFF2.)

---

## TL;DR

Marketing site built with Next.js 16 static export, deployed on Cloudflare Pages at `website-letsdog.pages.dev`. GA4 + Cookiebot wired in, analytics fires on every page load regardless of consent (explicit decision). DNS for `letsdog.nl` still points at the old WordPress site at SiteGround — that's the deferred cutover step, runbook at [`docs/CUTOVER.md`](docs/CUTOVER.md).

The 5 legal pages now read their copy from `content/<slug>.md` (gray-matter + react-markdown + remark-gfm) — Jur can edit prose without touching TSX. Marketing/homepage stays TSX; re-evaluate after a month.

Next priority: **two optional/low follow-ups** — (1) swap the contact-hero placeholder photo (`public/images/training.jpeg` → the real mockup photo; update `app/contact/contact-content.tsx` `src`, run `npm run optimize:images`, commit variants); (2) National2→WOFF2 (waiting on owner-supplied subsetted files). The **contact form (PR #17) is merged + verified sending in production**; privacy email → `.nl` ✅ and the 512px image variant ✅ are both done; `*.pages.dev` noindex was **skipped** (owner decision). The big spec-compliance build (PR #15) is **done + merged**.

**Contact form — operational note (PR #17):** the form is the one server-side piece. It POSTs to `functions/api/contact.ts` (Cloudflare Pages Function) → Postmark → `support@letsdog.nl`, Reply-To = visitor. Secret `POSTMARK_SERVER_TOKEN` is set in Cloudflare Pages (Prod + Preview); `CONTACT_FROM`=`noreply@letsdog.nl` (verified sender), `CONTACT_TO`=`support@letsdog.nl` (both overridable via env). The function returns distinct error codes — `server_not_configured` (500, token missing) / `send_failed` (502, Postmark rejected) / `<field>` (400, validation) — so a `curl` of `/api/contact` self-diagnoses. Gotchas captured in `docs/solutions/conventions/cloudflare-pages-preview-functions-gotchas.md` (28-char preview-alias truncation; env-var scope + redeploy-to-apply).

## What was accomplished (2026-05-31, later — website fixes bundle, PR #16 MERGED)

Branch `feature/website-fixes-bundle` → **PR #16**, atomic commit per item, merged via merge commit (plan: [`docs/plans/2026-05-31-001-feat-website-fixes-bundle-plan.md`](docs/plans/2026-05-31-001-feat-website-fixes-bundle-plan.md)). Seven owner-requested polish fixes + review refinements:

1. **Footer copyright spacing** — `© 2026Let's Dog` rendered with **no space**. Root cause: **SWC/Turbopack collapses the space between a `{expr}` and adjacent inline text** (`© {year} Let's`). Fixed with an explicit `{" "}`. Verified in the DOM — a real bug, not a mockup artifact.
2. **Retour §3** scoped to *fysieke producten* (`content/retour.md`).
3. **App-store badges** (`components/sections/how-it-works.tsx`) — reordered **Android (Google Play) left / iOS (App Store) right**; iOS keeps the "Binnenkort beschikbaar" toast. **Made truly equal in visible size by measuring the assets' opaque pixels** (canvas pixel scan): the Google Play PNG's logo fills only **67.2%** of its height (transparent padding) vs the App Store SVG at **100%**, so Google Play renders at `h-[66px]` vs App Store `h-[44px]` → matching ~44px visible boxes. Eyeballing equal heights had left iOS looking bigger twice.
4. **Puppyagenda CTA** → `/prijzen` (internal Link), relabeled "Bekijk de abonnementen".
5. **Footer redesign, sitewide** (`components/layout/footer.tsx`) — `#141414` → dark sage `#162A0E`, `rounded-t-[2.5rem]` + `-mt-10` so the rounded corners reveal the (light) section above → soft section→footer transition. New **3-column layout**: Brand (logo + tagline + Instagram/TikTok as rounded-square icons under the tagline) | **NAVIGATIE** | **BELEID** (legal links in their own column, Retour→Retourbeleid); bottom bar is just the copyright. The transition needs every page to END light: homepage `FinalCta` and over-ons's closing CTA recolored `#162A0E` → `#EFE8E4` (`final-cta.tsx`, `over-ons/page.tsx`); body is already `#EFE8E4`; all other pages already end light (verified).
6. **Prijzen** — removed the "Prijzen · Transparant" pill above the H1.
7. **Rassenkeuze redesign** (`app/rassenkeuze/page.tsx`) to the supplied mockup: beige split hero ("Welk ras past *écht* bij jou?", pills, "Persoonlijk rasadvies" badge, new `public/images/rassenkeuze.jpeg` via `OptimizedImage`) → "Van vraag naar advies in drie stappen" 3 steps → "Doe de test" keeping the **live `keuzehulp.letsdog.nl` iframe** → "Nog geen hond?" 3 text-only cross-link cards. (Hero eyebrow removed per review.)

**Security model:** unchanged — static export, client-only, no auth-adjacent data; presentational/content + one committed image.

---

## ⚡ Next session — open items (post PR #15 merge)

PR #15 is merged + deployed. **None of the below were touched this session** (owner: "we'll do that next session"). Owner answers are baked in — just execute. Use `/new-feature` for the code ones.

1. ✅ **DONE 2026-05-31 (contact-redesign PR).** **Privacy contact email → `.nl`** *(owner confirmed)*. In `content/privacybeleid.md`, section "11. Contact en klachten", change `privacy@letsdog.com` → **`privacy@letsdog.nl`** (both the link text and the `mailto:`). It was copied verbatim from the live site, which has the `.com` typo. Pure-content edit.

2. **National2 → WOFF2** *(GO — owner is supplying subsetted files)*. Today National2 ships as two **unsubsetted OTFs** (`public/fonts/National2-Bold.otf`, `-Medium.otf`); the Bold (~66 KB) sits in the LCP critical chain. When the WOFF2 files arrive: drop them in `public/fonts/`, change the two `@font-face` `src:` rules in `app/globals.css` from `…format("opentype")` to the `.woff2 …format("woff2")` (keep `font-display: swap`), rebuild, and confirm via Lighthouse that the font no longer dominates the network-dependency chain.

3. ✅ **DONE 2026-05-31 (contact-redesign PR)** — added `512` to `WIDTHS` in `scripts/optimize-images.mjs`, regenerated + committed the `*-512.avif/.webp` variants. **512 px image variant** *(no owner action; it is NOT an SVG)*. Lighthouse flagged ~28 KB of mobile over-delivery because the smallest hero variant (384 px) is below the ~412 px mobile viewport, so the browser jumps to 768 px. Fix = **one line in `scripts/optimize-images.mjs`**: add `512` to `VARIANT_WIDTHS` (→ `[384, 512, 768, 1280]`), run `npm run optimize:images`, commit the new `*-512.avif/.webp`. The `<picture>` srcset picks it up automatically. **No new source files needed** — variants are generated from the existing `public/images/*.jpeg`.

4. ⏭️ **SKIPPED — owner decision 2026-05-31 (do not implement).** **`*.pages.dev` noindex — corrected guidance.** Earlier "dashboard Transform Rule" advice was **wrong**: Transform Rules are zone-scoped and can't be added to Cloudflare's `pages.dev` zone. **Mostly already handled:** every page has a self-referential `<link rel="canonical" href="https://letsdog.nl/…">`, so Google won't index the `website-letsdog.pages.dev` duplicate (it honours canonical). For explicit belt-and-suspenders noindex, the in-repo way is a tiny **Pages Function** (host-aware, cutover-safe — `letsdog.nl` never matches `.pages.dev`, so nothing to remove later). **Low priority.** Code — create `functions/_middleware.js`:
   ```js
   export async function onRequest(context) {
     const response = await context.next();
     if (new URL(context.request.url).hostname.endsWith(".pages.dev")) {
       const r = new Response(response.body, response);
       r.headers.set("X-Robots-Tag", "noindex");
       return r;
     }
     return response;
   }
   ```
   Verify: `curl -sI https://website-letsdog.pages.dev/ | grep -i x-robots` → present; on `letsdog.nl` (post-cutover) → absent. (Adding `functions/` turns on Pages Functions — every request flows through this passthrough; trivial overhead.)

5. **Brand-green contrast — leave as-is** *(owner decision, recorded)*. Body/small text on `#75876D` maxes at 3.86:1; large headings pass 3:1. Revisit only if the brand palette changes.

### Merge convention (decided 2026-05-31): merge commit, not squash
Default to **merge commits** going forward — preserve per-unit commits on `main` for granular `git revert`, keeping commits atomic so `main` history + `git bisect` stay useful. Squash only small/throwaway PRs. **To codify next session:** update the Conventions line below, `CLAUDE.md`, and `~/.claude/skills/new-feature/project-ci-rules.md`.

---

The original spec plan + how-to-build notes are kept below for reference — **all implemented + merged** in PR #15; read them only for context on *why* something is the way it is.

**Source of truth → read it first:** [`docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`](docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md). It's the **actual build plan** (work to do): Phases A–G, units U1–U15, a per-page on-page-SEO spec, risks, and verification. Owner decisions are locked in its "Decisions locked (2026-05-30 review)" section — **do not re-litigate them.**

**Not a build artifact:** `docs/2026-05-30-current-vs-new-site-spec-audit.{md,html}` is a stakeholder old-vs-new comparison (new site shown in its complete state) for the **Maarten** conversation. Don't confuse it with the plan.

**How to build:** `/new-feature` per unit/batch — branch → implement → verify on the Cloudflare **preview** URL → PR → merge. Owner approved building; this is execution, not re-planning.

**Suggested first PR batch — U1, U2, U15, U14:**
- **U1** — fix the broken `/algemene-voorwaarden/` footer link (404 sitewide) in `components/layout/footer.tsx`.
- **U2** — `metadataBase = https://letsdog.nl` (apex) + per-page **self-referencing** canonical + per-page `og:url` (fixes "og:url = homepage on every page") + unique title/description for `/contact/` and `/veelgestelde-vragen/` (split a thin server `page.tsx` from the client component).
- **U15** — delete `app/card-styles/` entirely (live, crawlable design demo).
- **U14** — add TikTok `https://www.tiktok.com/@letsdogworld6` + Instagram `https://www.instagram.com/letsdogworld/` to the footer **and** the `Organization` JSON-LD `sameAs`.

Then **Phase B** (robots.ts, sitemap.ts, JSON-LD, og:image), **Phase C** (all security headers + security.txt), then D (favicons/manifest/theme-color + Dutch 404), E (images route B + a11y verify), F (llms.txt + link headers), G (CUTOVER.md update).

**Locked decisions (recap):** canonical host = apex `letsdog.nl` (`www`→apex 301 via a Cloudflare Redirect Rule **at cutover**, not in code); security headers = add **all** in `public/_headers` (HSTS basic, `frame-ancestors`, Permissions-Policy, security.txt; keep Cloudflare's `nosniff` + `referrer-policy`); CSP = `frame-ancestors` only (full content-CSP **de-scoped**); image optimization = **route B** (build-time AVIF/WebP, in-repo `sharp`/export-optimizer); cookie-consent = **keep as-is** (no gating); agent-readiness = **include**.

**Apply as docs during the work:** the two `CLAUDE.md` conventions in the plan's "Proposed CLAUDE.md additions" (image-optimization guardrail + post-cutover checklist discipline), and tick `docs/CUTOVER.md`'s post-cutover checklist after each PR.

**Constraints:** static export (no SSR/API); **preview-first** (verify on `<branch>.website-letsdog.pages.dev` before merge); don't touch DNS/cutover; bake the apex `https://letsdog.nl` into absolute URLs; **no test suite** — verify via `npm run build` + `curl` + Lighthouse + axe + the spec MCP (`audit_url` / `get_checklist`). The `specification-website` skill + MCP are installed for re-auditing.

**Housekeeping:** if `.compound-engineering/config.local.yaml` still doesn't exist, run `/ce-setup` once (<1 min). The CE skills (`/ce-work` etc.) are available alongside `/new-feature` — see CLAUDE.md for which to pick when.

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

## What was accomplished in this session (2026-05-30 — spec-compliance build)

**Single PR `feature/website-spec-compliance`, one commit per unit** (rollback-friendly). All 15 units of the plan shipped:

- **U1** broken `/algemene-voorwaarden` footer link → points to the real terms page `app.letsdog.nl/algemene-voorwaarden/` (external).
- **U2** `metadataBase` = apex `letsdog.nl` + per-page canonical/og:url via new `lib/seo.ts` `pageMetadata()`; split server wrappers for `/contact/` + `/veelgestelde-vragen/` (client UI → `*-content.tsx`). Fixes the homepage-og:url-everywhere bug.
- **U3/U4** `app/robots.ts` + `app/sitemap.ts` (12 canonical apex URLs).
- **U5** JSON-LD (`lib/structured-data.ts` + `components/shared/json-ld.tsx`): Organization+WebSite sitewide, FAQPage, Product/Offer, Person.
- **U6** 1200×630 og:image (`public/og/og-default.jpg`, `scripts/generate-og-image.mjs`) + twitter `summary_large_image`.
- **U7** security headers in `public/_headers` `/*` (HSTS basic, `frame-ancestors`, `X-Frame-Options`, `Permissions-Policy`) + `public/.well-known/security.txt`.
- **U8** favicons/apple-touch/maskable + `app/manifest.ts` + theme-color/color-scheme (`scripts/generate-icons.mjs`).
- **U9** branded Dutch 404 (`app/not-found.tsx`).
- **U10** build-time AVIF/WebP via `OptimizedImage` `<picture>` drop-in + `scripts/optimize-images.mjs` (`sharp` devDep); hero 375 KB → ~100 KB. Variants committed; not wired into CI build.
- **U11** global `:focus-visible` ring + footer link touch targets (≥24px) + footer legal-link contrast (white/40 → white/60).
- **U12** `public/llms.txt` + RFC 8288 `Link` headers.
- **U14** TikTok + Instagram in the footer (+ JSON-LD `sameAs`).
- **U15** deleted the live `/card-styles/` demo page.
- **U13** `docs/CUTOVER.md` "Spec compliance — post-cutover" section + 2 `CLAUDE.md` conventions + this handover.

**Security model:** unchanged from prior — static export, client-only, no auth-adjacent data; the new code is presentational metadata/markup + build-time asset generation + Cloudflare header config. No server logic, no secrets. Verification = `npm run build` + `out/`/`curl` checks + dev-server preview + (pending) Cloudflare preview header curl.

**Session log:** 2026-05-31 — over-ons + FAQ redesign (`feat/over-ons-faq-redesign`) — security model: unchanged — static export, client-only, no auth-adjacent data; presentational JSX/Tailwind + one global `scroll-padding-top: 6rem` line. Both pages moved from legacy green-band hero to beige split-hero; over-ons gains "Onze methode" 4-card grid, peach pull-quote, horizontal cert cards, 2-button closing CTA; FAQ gains category-overview jump-nav card, continuous 01–12 numbering, a11y upgrade. OA1 (consult URL) interim-wired; owner action required (see open items).

**Session log:** 2026-05-31 — contact page redesign + working contact form (PR #17) — security model: first server-side code in the repo, a Cloudflare Pages Function (`functions/api/contact.ts`) relays the form to Postmark; token in `POSTMARK_SERVER_TOKEN` (Function env, never client-exposed); honeypot + length-capped validation; no auth-adjacent data. Bundled: privacy email →`.nl`, 512px responsive image variant. `*.pages.dev` noindex deliberately skipped. **Browser verification caught two real bugs** (fixed in-PR): the modal `AnimatePresence` child needed a stable `key` to unmount on close, and `OptimizedImage` had its own `VARIANT_WIDTHS` that also needed `512` added (the script alone wasn't enough). **Owner setup before the form works:** set `POSTMARK_SERVER_TOKEN` in Cloudflare Pages (Production + Preview) and verify the `CONTACT_FROM` sender in Postmark.

**Session log:** 2026-05-31 — spec-compliance verified (Lighthouse: Perf ~89, CWV green) + review follow-ups (real Algemene Voorwaarden page, privacy/AI verbatim from live, icon recolor to black-on-white, all "Start vandaag" → /prijzen, maintenance docs, a11y label-in-name fix) + **PR #15 merged via merge commit** + obsolete Firebase CI failures purged — security model unchanged (static export, client-only, no auth-adjacent data).

**Session log:** 2026-05-30 — spec-compliance build (U1–U15) — security model: static export, client-only, no auth-adjacent data; metadata/markup + sharp asset generation + `_headers` config only.

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
| ⚠ before merging PR #13 | **Pricing CTAs — staging → prod URL swap + remaining tier wiring** | Early Member ("Claim Early Member Prijs") now points at SiteGround staging WP: `https://maartend8.sg-host.com/checkout/?add-to-cart=592&quantity=1`. Before merging to main, decide whether to swap to a prod-equivalent (likely `https://app.letsdog.nl/checkout/?add-to-cart=592&quantity=1`) or leave it on staging for now. Flexibel ("Start Maandelijks") and Jaar + Consult ("Kies Jaar + Consult") still fall back to the generic `https://app.letsdog.nl` — wire each to its own WooCommerce product when Jur supplies the SKU. Defined in [`components/sections/pricing.tsx`](components/sections/pricing.tsx) under the `tiers` array (`ctaHref` field per tier). |
| ⚠ owner action (OA1) | **"Plan een consult" CTA (over-ons) — confirm final URL** | Ships in `feat/over-ons-faq-redesign` wired to interim `https://app.letsdog.nl/consult/` (same as the contact page "Boek een consult"). Needs the real purchasable consult product/checkout URL (likely `…/checkout/?add-to-cart=<consult-SKU>`) — same family as the pricing-tier WooCommerce-SKU item above. One-line swap in [`app/over-ons/page.tsx`](app/over-ons/page.tsx) closing CTA `href`. Owner action. |
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
- **Merge convention (decided 2026-05-31): merge commit, not squash.** Preserve per-unit commits on `main` for granular `git revert`; keep commits atomic so history + `git bisect` stay useful. Squash only small/throwaway PRs. Delete the branch after merge. (Historical PRs #6/#7 were squash-merged; the rationale is in the "Merge convention" note up top.) *Still to codify in CLAUDE.md + project-ci-rules.md.*
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
8. **SWC/Turbopack drops the space in `{expr} text` JSX.** `© {year} Let's` renders as `2026Let's` — the whitespace between a `{}` expression and adjacent inline text is collapsed. Use an explicit `{" "}` between them. (Bit the footer copyright; fixed 2026-05-31.)
9. **macOS `com.apple.macl` xattr breaks the local static-export build.** A photo dropped into `public/images/` via Finder/Shortcuts can carry a sticky `com.apple.macl` extended attribute; `next build`'s public→`out/` copy then fails with `EPERM: copyfile`. `xattr -c` can't remove `macl`. Fix: recreate the file without xattrs — `ditto --noextattr --norsrc src tmp && mv tmp src`. Git never stores xattrs, so Cloudflare's Linux build is unaffected (local-only).
10. **App-store badge assets have different built-in padding — equal CSS height ≠ equal visible size.** The Google Play PNG's logo fills only ~67% of its height (transparent padding); the App Store SVG fills 100%. Setting both to the same `h-[..]` makes iOS look bigger. To match the *visible* boxes, measure each asset's opaque-pixel bounds (draw to a canvas, scan alpha) and scale by the inverse fill ratio — Google Play `h-[66px]` vs App Store `h-[44px]` gives ~44px visible on both. Don't eyeball it.

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
