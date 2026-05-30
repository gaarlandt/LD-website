---
title: "feat: Bring the Let's Dog site up to The Website Specification"
date: 2026-05-30
status: active
type: feat
depth: deep
source: "The Website Specification — https://specification.website (skill: ~/.claude/skills/specification-website, MCP: https://mcp.specification.website/mcp)"
audited: "https://website-letsdog.pages.dev (new site) + https://letsdog.nl (current WordPress site) + repo codebase"
related: "docs/CUTOVER.md · docs/2026-05-30-current-vs-new-site-spec-audit.md (stakeholder comparison)"
---

# feat: Bring the Let's Dog site up to The Website Specification

## Context — why this plan exists

A friend pointed us at **[The Website Specification](https://specification.website)** — a platform-agnostic, source-backed spec of what a good website should have. It has 10 categories and **128 items**, each tagged `required` (35), `recommended` (64), `optional` (25), or `avoid` (4), each cited to a primary standard (WHATWG, W3C, IETF RFC, WCAG, etc.).

The ask was a *serious investigation*: does this apply to us, what should we actually do, and **when** — can we do it now, or does it belong on the post-cutover list (the site is mid-migration, see `docs/CUTOVER.md`)?

**Bottom line up front:** Most of it applies and is worth doing, the site is already in decent shape (all foundational + most accessibility `required` items pass), and **the large majority should be done NOW, before cutover** — because it's all in-repo code/config that ships through the normal preview→main flow, and because you want the new `www.letsdog.nl` to launch *clean* the moment search engines re-crawl it at DNS flip. A small set of items is genuinely cutover-gated (HSTS subdomain scope, CAA DNS records, GSC submission), and two items are **decisions for you** (cookie-consent compliance; how far to push CSP / agent-readiness).

This plan is an **audit + remediation plan**. Implementing it changes the website; this document does not. Nothing here touches DNS or the cutover sequence itself.

---

## Decisions locked (2026-05-30 review)

Owner decisions from the first review pass. These supersede the original "Open decisions" where they conflict.

1. **Cookie-consent — keep as-is, now *and* post-cutover.** GA4 continues to fire without consent gating (deliberate, documented trade-off). We will **not** implement consent gating, and the "consider restoring consent gating" line in `docs/CUTOVER.md` is **decided against** (revisit only if the legal position changes). GPC is moot while ungated. *(Note for the record: this is the one knowingly non-compliant spec/legal item; the decision is the owner's to make.)*
2. **CSP — required piece only; full content-CSP de-scoped.** Ship `Content-Security-Policy: frame-ancestors 'self'` + legacy `X-Frame-Options: SAMEORIGIN` now — the spec-*required* anti-clickjacking control, which does **not** touch script loading. The full content-CSP (`script-src`/`connect-src`/`frame-src` allow-listing GTM/Cookiebot/the keuzehulp iframe/inline-gtag) is **consciously out of scope** at the owner's request: it's only *recommended* by the spec and carries ongoing allow-list maintenance every time a script or tag changes. Revisit only if priorities change.
3. **Agent-readiness — YES, include now.** Phase F (`/llms.txt` + `Link` headers) is promoted from optional to **in-scope**.
4. **Social links — add TikTok + Instagram (restore, not invent).** Confirmed: **TikTok `https://www.tiktok.com/@letsdogworld6`** + **Instagram `https://www.instagram.com/letsdogworld/`** (owner confirmed `@letsdogworld6` is primary; the old site's stray `@letsdogworld` is ignored). Add to the footer **and** the `Organization` JSON-LD `sameAs`. → **new unit U14**.
5. *(Instagram handled with #4.)*
6. **Security headers — manage them ourselves in `public/_headers` (in-repo).** Better than relying on Cloudflare dashboard injection because it's version-controlled, reviewable, identical across preview + prod, and can't be silently changed in a dashboard. We keep Cloudflare's two auto-injected headers (`nosniff`, `referrer-policy`) and add the rest in `_headers`. **HSTS nuance:** basic `max-age` can go in `_headers` now; the zone-wide `includeSubDomains; preload` commitment is best set via the **Cloudflare dashboard HSTS toggle** at cutover (after the subdomain HTTPS audit), since it's effectively irreversible (RFC 6797). → U7.
7. **Image optimization — route B: build-time, in-repo** (owner choice). Generate AVIF/WebP + responsive widths at build (a `sharp`-based step / export-optimizer) — no Cloudflare-plan dependency, all in-repo. Concrete target: the hero is a **375 KB JPEG at one size** → ~80–150 KB modern + right-sized = the biggest Core-Web-Vitals lever. **Ongoing guardrail (owner request):** every newly added image must be optimized — automated by the build step, reinforced by a `CLAUDE.md` convention + an optional CI check. → U10.
8. **SEO — clarified scope.** What we're doing is **technical/on-page SEO**: a bounded, one-time engineering task (sitemap, canonical, structured data, robots, OG image, clean meta). That is "easily done" in the sense of being a known checklist with low risk — it's Phase B. **Content/keyword SEO** (writing for search terms, backlinks, topical authority) is *ongoing marketing work*, not a one-time task, and is **out of scope** here. We also **reuse the current site's SEO** (#12).
9. **Bugs — fix as many as possible now.** Confirmed bug list to clear in the first pass: (a) **broken `/algemene-voorwaarden/` footer link → 404 sitewide** (U1); (b) **`og:url` = homepage on every page** (U2); (c) **`/card-styles/` design-demo page is live and crawlable in production** → **delete it entirely** (owner confirmed) → **new unit U15**.
10. **Post-cutover checklist — keep it living.** The canonical post-cutover checklist stays in **`docs/CUTOVER.md`** (its home). Process: **after each spec-compliance PR merges, tick/update that checklist.** We'll add a one-line pointer to `CLAUDE.md` so the habit is codified (proposed text below — applied on go, since we're in planning mode).
11. **Stakeholder comparison doc created:** `docs/2026-05-30-current-vs-new-site-spec-audit.md` + a styled, on-brand **HTML** version (`docs/2026-05-30-current-vs-new-site-spec-audit.html`) for the **Maarten** conversation.
12. **Reuse the current site's SEO assets.** Harvest from `letsdog.nl` (Yoast): page descriptions, the hero `og:image` concept, the JSON-LD shape (`WebSite` + `SearchAction` + `Organization`/`Person`), and the indexed-URL set. **Redirect coverage is already complete** — all 7 currently-indexed URLs resolve on the new site (directly or via existing 301s), so no ranking is lost at cutover.

### Canonical host — DECIDED: apex `letsdog.nl` (matches current indexing, least churn)
**Two parts, two timings:**
- **Now (code, U2):** set `metadataBase: new URL("https://letsdog.nl")` so every canonical + `og:url` resolves to the apex, **with trailing slash** (the site uses `trailingSlash: true`, so canonicals must end in `/`). This is also the fix for the homepage-`og:url`-everywhere bug.
- **At cutover (Cloudflare dashboard, no code):** add a zone-level **Redirect Rule** — *if `http.host == "www.letsdog.nl"`, 301 → `https://letsdog.nl/$1`* (preserve path + query). This is the clean way to do a host-level redirect on Pages; the path-based `public/_redirects` can't match on hostname. Both hosts already bind to the Pages project per `docs/CUTOVER.md`; the rule makes `www` bounce to apex so they never compete. Register both as Search Console properties. → folded into **U2** (code) + **cutover checklist** (redirect rule).

### New / changed implementation units
- **U14 — Social links (Phase A).** Add TikTok (`@letsdogworld6`) + Instagram (`letsdogworld`) to `components/layout/footer.tsx` (inline SVG icons per the project's WhatsApp/TikTok convention), `target="_blank" rel="noopener noreferrer"`, `aria-label` each. Feed the same URLs into the `Organization` JSON-LD `sameAs` (U5). *Verify:* icons render, links resolve 200, axe shows accessible names.
- **U15 — Delete the `/card-styles/` demo (Phase A).** Remove the `app/card-styles/` directory entirely (owner confirmed — internal design demo, no production purpose). *Verify:* `curl -I .../card-styles/` → 404; directory gone from the repo; not in `sitemap.xml`.
- **U2 (updated)** now also resolves the **canonical-host** choice and sets `metadataBase` accordingly.
- **U5 (updated)** `Organization` JSON-LD `sameAs` includes the TikTok + Instagram URLs; mirror the old site's `WebSite`+`SearchAction` shape with correct brand data (not the WP author "nefeli").
- **Phase F is now in-scope** (was optional).

### Proposed `CLAUDE.md` additions (apply on go)
Two short conventions:
> **Image optimization:** All raster images must be optimized before they ship — modern format (AVIF/WebP) + responsive sizes. The build step does this automatically; never commit a raw full-size JPEG/PNG as the served asset. When adding or swapping images, confirm the optimized variants are generated (add new source images to the optimization input, not straight into a page).

> **Post-cutover checklist discipline:** `docs/CUTOVER.md` holds a "Spec compliance — post-cutover" checklist. After each spec-compliance PR merges, update it (tick done items, add any new DNS/live-domain follow-ups). Source of the work: `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`.

---

## What was audited, and how

Three independent passes, cross-referenced:

1. **Codebase audit** — `app/`, `components/`, `next.config.ts`, `public/_headers`, `public/_redirects`, fonts, analytics.
2. **Live production probe** — `curl` against `https://website-letsdog.pages.dev` for real response headers, `robots.txt`, `sitemap.xml`, `.well-known/*`, 404 behaviour, and the rendered `<head>` of `/` and `/prijzen/`. This corrected several codebase-only assumptions (see "production-truth corrections" below).
3. **The spec itself** — pulled status tags + primary sources for all 128 items via the spec's HTTP markdown endpoints (`llms.txt` / `llms-full.txt` / per-page `.md`).

**Production-truth corrections** (things the code doesn't show but production does):
- Cloudflare **already injects** `referrer-policy: strict-origin-when-cross-origin` and `x-content-type-options: nosniff` → two security items already pass.
- Cloudflare **already serves a managed `robots.txt`** (a "content-signals" policy for AI crawlers) — but it has **no `Sitemap:` line and no crawl directives**, so it doesn't substitute for a real robots.txt.
- 404s return a **correct HTTP 404 status** (not a soft-404) — good — but the body is the **default unstyled English Next.js 404**, not branded or Dutch.
- Basic **Twitter card** tags *are* present (`summary`), contrary to the code-only read — but there is **no OG/Twitter image**.

---

## Investigation — compliance matrix

Legend: ✅ compliant · ⚠️ partial / needs verification · ❌ gap · ➖ not applicable. Status = the spec's own tag (we never upgrade `recommended`→`required`).

### 1. Foundations — strong
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| doctype, html-lang (`nl`), meta-charset, meta-viewport, title | required | All present, titles unique per page | ✅ |
| meta-description | recommended | Present; **`/contact/` & FAQ are client components with no metadata export** → inherit root description | ⚠️ |
| canonical-url | recommended | **None anywhere** | ❌ |
| open-graph | recommended | og:title/desc/site_name/locale/type ✅; **no `og:image`**; **`og:url` = homepage on every page** (bug) | ⚠️/❌ |
| favicons | recommended | SVG icon only; **no `favicon.ico`, no apple-touch-icon, no maskable icon** | ⚠️ |
| theme-color, color-scheme | recommended | **Both missing** | ❌ |
| feed-discovery/hygiene, popover-api | recommended | No feed (marketing site) | ➖ |

### 2. SEO — biggest gap cluster
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| redirects (301/308) | required | Clean 301s in `public/_redirects` | ✅ |
| meta-robots | required | Public pages index,follow; 404 noindex. **But `pages.dev` host is indexable** (duplicate-content risk at cutover) | ⚠️ |
| heading-hierarchy | required | One `<h1>`/page, no skips | ✅ |
| robots-txt | recommended | Only Cloudflare's content-signals file; **no site robots.txt, no `Sitemap:`** | ❌ |
| xml-sitemaps | recommended | **`/sitemap.xml` → 404** | ❌ |
| structured-data (JSON-LD) | recommended | **Zero JSON-LD** (no Organization/WebSite/FAQPage/Product) | ❌ |
| url-structure, internal-linking | recommended | Lowercase/hyphenated/shallow; nav+footer cross-link | ✅ |
| breadcrumbs | recommended | None (site is shallow — low value) | ⚠️ low-pri |
| soft-404 | avoid | 404 returns real 404 status | ✅ |

### 3. Accessibility — mostly strong, 3 required items to verify
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| image-alt-text, form-labels, form-errors, semantic-html, link-text, document-language, reduced-motion, keyboard-navigation | required | All implemented well (skip-link, ARIA, `useReducedMotion`, `role=alert`, landmarks) | ✅ |
| color-contrast | required | **Verify**: light-green `#DFF0C3` on green `#75876D` ≈ **3.1:1** (ok for large/graphic, fails 4.5:1 body); `text-white/70` on green needs checking | ⚠️ |
| focus-indicators | required | Form inputs styled; **nav links/buttons rely on default outline, no `:focus-visible`** — verify nothing removes the ring | ⚠️ |
| touch-target-size (≥24px) | required | Most large; **footer legal links (`text-xs`) and some icons may be <24px** | ⚠️ |
| captions-and-transcripts | required | No video/audio currently | ➖ (re-evaluate if testimonials added) |
| data-tables | required | Legal markdown tables render as `<table>` w/o caption/scope | ⚠️ low-pri |
| skip-links, aria-usage | recommended | Present / good | ✅ |

### 4. Security — 2 required gaps, several recommended
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| https-tls | required | Cloudflare TLS 1.3, HTTP→HTTPS | ✅ |
| x-content-type-options | required | Cloudflare injects `nosniff` | ✅ |
| **hsts** | **required** | **ABSENT** | ❌ |
| **frame-ancestors** | **required** | **No `frame-ancestors` / `X-Frame-Options`** | ❌ |
| cookie-attributes | required | Static site sets no first-party cookies (GA/Cookiebot manage their own) | ➖ |
| content-security-policy | recommended | **None** (highest-effort item — GA4/GTM/Cookiebot/WhatsApp/iframe/inline gtag) | ❌ |
| referrer-policy | recommended | Cloudflare injects `strict-origin-when-cross-origin` | ✅ |
| permissions-policy | recommended | **None** | ❌ |
| security-txt | recommended | **`/.well-known/security.txt` → 404** | ❌ |
| subresource-integrity | recommended | GTM/Cookiebot are versionless vendor scripts — SRI impractical | ⚠️ skip |
| caa-records | recommended | DNS-level, not set | ❌ (cutover) |

### 5. Well-Known — minimal surface
`security.txt` (above) is the one actionable item. `api-catalog`, `change-password`, OIDC, WebFinger, app-site-association, etc. are all ➖ N/A (no API, accounts live on `app.letsdog.nl`).

### 6. Agent-readiness — mostly optional/emerging
| Spec item | Status | Verdict |
|---|---|---|
| stable-urls | required | ✅ (redirects preserve old URLs) |
| llms-txt | recommended | ❌ gap — nice-to-have, on-brand for you (optional) |
| structured-data-for-agents | recommended | ❌ — same work as SEO structured-data |
| link-headers | recommended | ❌ — easy once sitemap/llms.txt exist |
| robots-for-ai-crawlers | recommended | ⚠️ partially covered by Cloudflare content-signals |
| markdown-source-endpoints, MCP, a2a, nlweb, web-bot-auth, schemamap … | recommended/optional | ➖ defer (emerging, heavy for a static marketing site) |

### 7. Performance — 1 required gap, rest framework-handled
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| cache-control | required | `immutable` for static/images/fonts; short HTML | ✅ |
| compression | required | Cloudflare brotli/gzip | ✅ |
| core-web-vitals | required | **Measure** (PSI/Lighthouse) — likely fine, but hero `.jpeg` + fonts are the risk | ⚠️ |
| **image-optimization** | **required** | **`images.unoptimized: true`** (static export) → raw `.jpeg/.png`, **no WebP/AVIF, no responsive resizing** | ❌ |
| lazy-loading | recommended | `next/image` lazy + `priority` on LCP | ✅ |
| font-loading | recommended | DM Sans self-hosted WOFF2 + swap ✅; **National2 is unsubset OTF** | ⚠️ |
| preload/preconnect | recommended | Hero+font preloaded ✅; no preconnect to GTM/Cookiebot | ⚠️ low-pri |
| http3, bfcache, script-loading, etc. | recommended | Cloudflare h3; GA/Cookiebot async | ✅ |

### 8. Privacy — the headline decision
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| privacy-policy | required | `/privacybeleid/` exists | ✅ |
| **cookie-consent** | **required** | **GA4 fires immediately regardless of consent** ("consent theater" — Cookiebot is display-only). Deliberate, documented trade-off | ❌ **DECISION** |
| global-privacy-control | recommended | GPC not honoured | ❌ (tied to consent decision) |
| third-party-scripts, analytics-privacy, data-minimization | recommended | GA4 (not cookieless/EU-hosted); scripts known but not locked down | ⚠️ |

### 9. Resilience
| Spec item | Status | Current state | Verdict |
|---|---|---|---|
| error-pages | required | 404 status correct ✅; **body is default English Next.js 404** (not branded/Dutch, no way forward) | ⚠️ |
| pwa-manifest | recommended | **No web app manifest** | ❌ |
| maintenance-pages, monitoring-uptime, offline-support | recommended/optional | N/A static / ops task | ➖/⚠️ |

### 10. Internationalisation — effectively done
Monolingual Dutch site: `lang-attribute` ✅; hreflang / url-structure / localised-metadata / language-switcher / rtl / locale-content all ➖ N/A. `avoid-auto-geo-redirects` ✅ (not done). **Whole category is compliant or N/A.**

---

## Headline findings (the few that actually matter)

1. **Cookie-consent is the one `required` item with legal teeth** (GDPR/ePrivacy). GA4 currently fires before consent by deliberate choice. The spec + EU law say opt-in first. This is a **product/legal decision**, not a silent fix — and it's already on the post-cutover cleanup list in `docs/CUTOVER.md`.
2. **Two `required` security headers missing**: `HSTS` and `frame-ancestors`. Both fixable in `public/_headers`. (Note: `x-content-type-options` and `referrer-policy` already pass via Cloudflare.)
3. **`image-optimization` is `required` and genuinely gapped** because static export runs `unoptimized: true` — no WebP/AVIF or responsive sizing. Biggest perf lever and the main Core-Web-Vitals risk.
4. **SEO foundation is absent**: no sitemap, no canonical, no structured data. High-value, low-risk, and best in place *before* the cutover re-crawl.
5. **Two concrete bugs** worth fixing regardless of the spec: the **broken `/algemene-voorwaarden/` footer link (404 sitewide)** and **`og:url` pointing at the homepage on every page**.

---

## The "When" — now vs. cutover (direct answer)

**Thesis: do ~85% now, pre-cutover.** Everything here is in-repo code/config that deploys through the normal preview→main pipeline — fully decoupled from DNS. `docs/CUTOVER.md` explicitly lists "routes, content, styling" as safe to change now. The only reason to wait would be if a change depended on the live custom domain — and almost none do, because **all absolute URLs can be baked to `https://www.letsdog.nl` now** (the code already does this for `og:url`). Shipping the SEO + security + perf work *before* the DNS flip means `www.letsdog.nl` launches clean the moment Google re-crawls it.

| Bucket | Items | Rationale |
|---|---|---|
| **DO NOW** (pre-cutover PRs) | canonical + `metadataBase` + per-page og:url fix; sitemap.xml; site robots.txt (+Sitemap ref); JSON-LD; og:image; HSTS (basic) + frame-ancestors + permissions-policy; security.txt; favicons + apple-touch-icon + manifest + theme-color/color-scheme; branded Dutch 404; image-optimization (WebP/AVIF); a11y verification (contrast/focus/touch); fix broken footer link; unique contact/FAQ metadata | In-repo, DNS-independent, and you want them live at re-crawl. Bake `www.letsdog.nl` into absolute URLs. |
| **NOW — staging hygiene** | `noindex` the `*.pages.dev` host (so the staging domain doesn't get indexed and compete with `www.letsdog.nl`) | Cheap SEO hygiene; remove the noindex at cutover. |
| **CUTOVER LIST** (add to `docs/CUTOVER.md`) | HSTS `includeSubDomains`+`preload` **after** auditing app/keuzehulp/agenda are HTTPS-only; CAA DNS records; submit sitemap to Search Console; verify headers/robots/sitemap/canonical on the real domain; drop the pages.dev noindex | These depend on the live domain, DNS access, or an irreversible subdomain-wide commitment. |
| **DECISIONS (your call)** | (a) restore cookie-consent gating (legal vs. analytics-continuity — already slated post-cutover); (b) full CSP scope (report-only → enforce); (c) agent-readiness appetite (llms.txt etc.) | Material trade-offs; see "Open decisions". |

---

## Scope boundaries

**In scope (this plan):** the "DO NOW" + "NOW staging hygiene" buckets, plus documenting the cutover-gated items into `docs/CUTOVER.md`.

**Deferred to follow-up work:** full enforced CSP (start report-only); National2 WOFF2 subsetting + preconnect tuning; breadcrumbs; legal-table caption/scope; agent-readiness beyond llms.txt; external uptime monitoring.

**Not applicable (judgment applied — we are not chasing all 128):** entire i18n category (monolingual Dutch); feeds; most well-known URIs (no API/OIDC/Fediverse); cookie-attributes (no first-party cookies); SRI for versionless vendor scripts; offline service worker.

**Out of scope:** DNS cutover itself; `app.letsdog.nl` / `keuzehulp.letsdog.nl` (separate properties); switching analytics vendor.

---

## Implementation plan

> No automated test suite exists (`package.json` has `dev/build/start/lint` only). "Verification" throughout means: `npm run build` succeeds → push branch → **verify on the Cloudflare preview URL** via `curl`, Lighthouse/PSI, and axe DevTools, then re-audit with the spec's `audit_url` MCP tool. Each unit is an atomic PR via `/new-feature`.

### Phase A — Bugs & metadata correctness (do now)

#### U1. Fix the broken `/algemene-voorwaarden/` footer link
- **Goal:** No 404 from a sitewide footer link.
- **Files:** `components/layout/footer.tsx` (+ optionally `public/_redirects` or a new `app/algemene-voorwaarden/page.tsx`).
- **Approach:** Decide — does an "Algemene voorwaarden" page exist elsewhere? If yes, point the link there (or 301 in `_redirects`). If the content lives inside another legal page, remove the link. Do **not** ship a 404-linked page.
- **Verify:** `curl -sI .../algemene-voorwaarden/` → 200 or link removed; click-through on preview.
- **Test scenarios:** every footer link resolves 200 (loop the footer hrefs through `curl -o /dev/null -w %{http_code}`).

#### U2. metadataBase + per-page canonical + correct per-page og:url + unique contact/FAQ metadata
- **Goal:** Each page declares its **own** canonical + og:url (kills the "homepage og:url everywhere" bug); `/contact/` and FAQ get unique title/description.
- **Files:** `app/layout.tsx` (add `metadataBase: new URL("https://www.letsdog.nl")`, default `alternates.canonical`, `openGraph.images`); each `app/**/page.tsx` (per-page `alternates.canonical` + `openGraph.url`); `app/contact/` and `app/veelgestelde-vragen/` — split a server metadata wrapper from the client component so they can export `metadata`.
- **Approach:** With `metadataBase` set, Next resolves relative canonical/OG URLs per route automatically. Pattern: each page exports `alternates: { canonical: "/<route>/" }`.
- **Verify:** `curl .../prijzen/ | grep -E 'canonical|og:url'` → both point to `/prijzen/`, not `/`.
- **Test scenarios:** canonical present & self-referential on 3 sample routes; contact/FAQ titles differ from root.

### Phase B — SEO foundation (do now)

#### U3. Site `robots.txt` via `app/robots.ts` (with sitemap reference + pages.dev noindex)
- **Goal:** A real robots.txt that allows crawling, references the sitemap, and keeps the staging host out of the index.
- **Files:** `app/robots.ts`; coordinate with `public/_headers` for an `X-Robots-Tag: noindex` on the `*.pages.dev` host (Cloudflare header rule or hostname check).
- **Approach:** `robots.ts` returns `Allow: /` + `Sitemap: https://www.letsdog.nl/sitemap.xml`. Verify it doesn't fight Cloudflare's content-signals file (Next's generated `/robots.txt` should win as a real static asset).
- **Verify:** `curl .../robots.txt` shows our directives + Sitemap line.
- **Test scenarios:** robots.txt 200 + contains `Sitemap:`; pages.dev returns `X-Robots-Tag: noindex`, real domain does not.

#### U4. XML sitemap via `app/sitemap.ts`
- **Goal:** `/sitemap.xml` lists all canonical public URLs (absolute `www.letsdog.nl`), excludes legal/noindex as desired, with `lastModified`.
- **Files:** `app/sitemap.ts`.
- **Approach:** Enumerate the known routes (home, rassenkeuze, puppyagenda, prijzen, over-ons, FAQ, contact, + legal). Static export emits `sitemap.xml`.
- **Verify:** `curl .../sitemap.xml` → 200, valid XML, absolute URLs.
- **Test scenarios:** every `<loc>` is `https://www.letsdog.nl/...`; count matches route list; no 404/noindex routes included.

#### U5. Structured data (JSON-LD)
- **Goal:** Typed facts for search + agents.
- **Files:** `app/layout.tsx` (Organization + WebSite, sitewide); `app/veelgestelde-vragen/` (FAQPage); `app/prijzen/` (Product/Offer); optional `BreadcrumbList`.
- **Approach:** Inject `<script type="application/ld+json">` via a small server component. Organization: name, url, logo, sameAs (socials), contactPoint (WhatsApp). FAQPage built from the existing FAQ data. Validate against schema.org / Google Rich Results.
- **Verify:** Google Rich Results Test passes; `curl | grep ld+json` count ≥1 per relevant page.
- **Test scenarios:** Organization + WebSite on every page; FAQPage Q/A count matches rendered FAQ; pricing Offer has price + currency `EUR`.

#### U6. Social share image (og:image + Twitter large card)
- **Goal:** Branded preview on shares.
- **Files:** `public/og/*` (or `app/opengraph-image.*`); `app/layout.tsx` (`openGraph.images`, `twitter.card = "summary_large_image"`).
- **Approach:** One 1200×630 default; per-page override where it adds value. Bump twitter card to `summary_large_image`.
- **Verify:** Facebook/LinkedIn/Twitter validators; `curl | grep og:image`.
- **Test scenarios:** og:image absolute URL resolves 200; twitter:card = summary_large_image.

### Phase C — Security headers (do now)

#### U7. Add HSTS (basic), frame-ancestors, Permissions-Policy, security.txt
- **Goal:** Close the two `required` header gaps + two easy recommended ones.
- **Files:** `public/_headers`; `public/.well-known/security.txt`.
- **Approach:** In `_headers` — `Strict-Transport-Security: max-age=31536000` (basic now; **defer `includeSubDomains; preload`** to cutover — see Risks); `Content-Security-Policy: frame-ancestors 'self'` (or `X-Frame-Options: SAMEORIGIN` legacy fallback); a restrictive `Permissions-Policy` (disable camera/microphone/geolocation/etc.). **Watch the `_headers` merge gotcha** (CLAUDE.md): do not create overlapping path patterns. `security.txt` with a disclosure contact + `Expires`.
- **Verify:** `curl -I .../` shows the three headers; `curl .../.well-known/security.txt` → 200.
- **Test scenarios:** HSTS/frame-ancestors/permissions-policy present on `/` and a deep route; no duplicated `Cache-Control` introduced; the site still embeds the keuzehulp iframe (outbound, unaffected).

### Phase D — Foundations / PWA / resilience (do now)

#### U8. Favicons, apple-touch-icon, maskable icon, web app manifest, theme-color, color-scheme
- **Goal:** Complete icon set + installable manifest + theme metadata.
- **Files:** `app/manifest.ts`; `app/apple-icon.png` + `app/icon.png` (raster fallback alongside existing `icon.svg`); `public/favicon.ico`; `app/layout.tsx` (`themeColor`, `colorScheme`).
- **Approach:** Manifest: name, short_name, icons (incl. 512 maskable), `start_url: "/"`, `display: "standalone"`, `theme_color` (brand green), `background_color` (beige). `themeColor` via Next `viewport` export; `color-scheme: light`.
- **Verify:** `curl .../manifest.webmanifest` → 200; Lighthouse PWA/installability; `curl .../favicon.ico` → 200.
- **Test scenarios:** manifest valid JSON w/ ≥192 & 512 icons + maskable; theme-color meta present; favicon.ico + apple-touch-icon resolve 200.

#### U9. Branded Dutch 404 (`app/not-found.tsx`)
- **Goal:** Keep the correct 404 status but replace the bare English body with branded Dutch copy + a way forward.
- **Files:** `app/not-found.tsx`.
- **Approach:** Dutch heading, short explanation, links to home + key sections, optional WhatsApp. Keep `noindex` (already applied).
- **Verify:** `curl -I .../nope/` still 404; visit on preview shows branded page.
- **Test scenarios:** unknown path → 404 status + Dutch content + working home link; `<meta robots noindex>` present.

### Phase E — Performance & accessibility (do now)

#### U10. Image optimization (required)
- **Goal:** Modern formats + right-sizing without breaking static export.
- **Files:** hero + key images under `public/images/`; possibly a Cloudflare image loader in `next.config.ts`; components using `next/image`.
- **Approach:** Two viable routes — (a) pre-generate AVIF/WebP + responsive widths at build and serve via `<picture>`/`next/image` with a custom loader; or (b) enable **Cloudflare Images / image resizing** as the `next/image` loader (keeps `unoptimized` off the critical path while staying on Pages). Decide in implementation; dimensions are already explicit. Prioritise the LCP hero (`hero.jpeg`).
- **Verify:** PSI/Lighthouse LCP improves; hero served as AVIF/WebP; CLS unaffected.
- **Test scenarios:** hero ships modern format + appropriate width per breakpoint; no layout shift; Lighthouse Performance ≥ target.

#### U11. Accessibility verification & fixes (3 required items)
- **Goal:** Confirm/repair color-contrast, focus-indicators, touch-target-size.
- **Files:** `app/globals.css` (focus-visible + any contrast token tweaks); `components/layout/footer.tsx` (target sizes); component-level color usages.
- **Approach:** Run axe + manual contrast on the flagged combos (`#DFF0C3` on `#75876D` ≈ 3.1:1; `text-white/70` on green). Add a global `:focus-visible` ring in brand green. Bump sub-24px tap targets (footer legal links, small icons) to ≥24px hit area.
- **Verify:** axe DevTools 0 critical; keyboard-tab every interactive element shows a visible ring; targets ≥24px.
- **Test scenarios:** flagged text combos meet 4.5:1 (or are confirmed large/graphic at ≥3:1); every nav/footer/CTA control shows focus ring on Tab; footer legal links ≥24px.

### Phase F — Agent-readiness (included — owner greenlit)

#### U12. `/llms.txt` + Link headers (optional)
- **Goal:** Make the site legible to agents (on-brand given you now run the spec MCP).
- **Files:** `app/llms.txt/route.ts` or `public/llms.txt`; `public/_headers` (`Link:` advertising sitemap + llms.txt).
- **Approach:** A small `llms.txt` index of the key pages with one-line summaries; `Link` headers per agent-readiness spec. Skip the heavier markdown-source-endpoints for now.
- **Verify:** `curl .../llms.txt` → 200; `curl -I` shows `Link:` header.
- **Test expectation:** none beyond fetch checks — static content.

### Phase G — Document the cutover-gated items

#### U13. Append a "Spec compliance — post-cutover" section to `docs/CUTOVER.md`
- **Goal:** Don't lose the DNS-dependent items.
- **Files:** `docs/CUTOVER.md`.
- **Approach:** Add checklist entries — promote HSTS to `includeSubDomains; preload` **after** confirming app/keuzehulp/agenda are HTTPS-only; add CAA DNS records; submit `sitemap.xml` to Search Console; verify all new headers/robots/sitemap/canonical on `www.letsdog.nl`; **remove the `*.pages.dev` noindex**; and the consent-gating decision (already noted there).
- **Verify:** doc review.

---

## On-page SEO — exact specification (Phase B detail)

*Makes U2–U6 concrete. Sourced from the spec (`structured-data`, `xml-sitemaps`, `canonical-url` via MCP) + the current site's Yoast output. Canonical host = apex `letsdog.nl`, trailing slash. The JSON-LD below is **directional** — mirror the actual visible page content and validate before shipping.*

### Per-page meta + canonical + JSON-LD

| Route | `<title>` | canonical / `og:url` (absolute apex, trailing slash) | JSON-LD |
|---|---|---|---|
| `/` | Let's Dog — Puppytraining die werkt | `https://letsdog.nl/` | `Organization` + `WebSite` |
| `/rassenkeuze/` | (existing) | `https://letsdog.nl/rassenkeuze/` | `WebPage` |
| `/puppyagenda/` | (existing) | `https://letsdog.nl/puppyagenda/` | `WebPage` |
| `/prijzen/` | Prijzen — Let's Dog | `https://letsdog.nl/prijzen/` | `Product` + `Offer` |
| `/over-ons/` | Over ons — Let's Dog | `https://letsdog.nl/over-ons/` | `Person` (Elien) + `Organization` |
| `/veelgestelde-vragen/` | Veelgestelde vragen — Let's Dog | `https://letsdog.nl/veelgestelde-vragen/` | `FAQPage` |
| `/contact/` | **add a unique title** | `https://letsdog.nl/contact/` | `ContactPage` (optional) |
| legal pages | (existing) | self, apex, trailing slash | none |

**Canonical rules (from spec):** one self-referencing `<link rel="canonical">` per page, absolute apex URL **with** trailing slash; strip query params; **never** point inner pages at `/` (that de-indexes them — the exact `og:url` bug we found). `/contact/` and `/veelgestelde-vragen/` are client components inheriting root meta today — split a thin server `page.tsx` that exports `metadata` (and a unique title/description).

### Sitewide JSON-LD (`app/layout.tsx`) — directional
- **`Organization`**: `name` "Let's Dog", `url` `https://letsdog.nl/`, absolute `logo`, `sameAs` = [`https://www.instagram.com/letsdogworld/`, `https://www.tiktok.com/@letsdogworld6`], `contactPoint` (WhatsApp / email).
- **`WebSite`**: `name` + `url`. (Skip `SearchAction` — the site has no on-site search.)
- One `@graph`, absolute URLs in `@id`/`url`/`logo`/`sameAs`.

### Page-specific JSON-LD — directional
- **`FAQPage`** (`/veelgestelde-vragen/`): build `mainEntity` Q/A pairs **from the FAQ data already rendered** — mirror the visible text exactly (Google penalises out-of-sync FAQ markup).
- **`Product` + `Offer`** (`/prijzen/`): mirror the visible plans — `price`, `priceCurrency: "EUR"`, `availability`. Do **not** fabricate `aggregateRating`/`Review`.
- **`Person`** (`/over-ons/`): Elien, with `sameAs` if she has public profiles.

### Sitemap (`app/sitemap.ts`)
Absolute apex `<loc>` for every indexable route (8 public pages + indexable legal pages); honest `<lastmod>` in ISO 8601 (don't churn on every build); **exclude** `/card-styles/` (deleted) and the 404; served as `application/xml`, 200; **canonical URLs only** (no redirects/404s — crawlers drop trust in the whole file otherwise).

### robots.txt (`app/robots.ts`)
`Allow: /` + `Sitemap: https://letsdog.nl/sitemap.xml`. The Next-generated file overrides Cloudflare's content-signals file. Keep `*.pages.dev` out of the index via an `X-Robots-Tag: noindex` header scoped to that host (removed at cutover).

### Reuse from the current site (Yoast harvest)
Port the working meta descriptions + the hero `og:image` concept; reuse the proven `WebSite`/`Organization` JSON-LD shape (with correct brand data — **not** the WP author "nefeli"). The old sitemap's 7 URLs are already redirect-covered, so no indexed URL is lost.

### Verification
`validator.schema.org` + Google Rich Results Test (FAQ + Product); `curl` each page → canonical/`og:url` is self-referential and 200; sitemap parses and lists only 200 canonical URLs; post-cutover, Search Console "URL Inspection" shows user-declared = Google-selected canonical.

---

## Key technical decisions

- **Bake `https://www.letsdog.nl` as `metadataBase` now**, not the current pages.dev host — makes canonical/OG/sitemap correct at cutover with zero rework. (`og:url` already follows this convention.)
- **Ship HSTS without `includeSubDomains`/`preload` first.** The basic header is safe; the subdomain-wide + preload commitment is effectively irreversible and must follow a subdomain HTTPS audit (RFC 6797).
- **`frame-ancestors 'self'` is safe** — nothing legitimately embeds the marketing site; it embeds keuzehulp outbound (unaffected).
- **CSP: start report-only.** A full enforced CSP across GA4/GTM/Cookiebot/WhatsApp/iframe/inline-gtag is high-risk; gather reports first, then enforce (deferred).
- **Image optimization stays on Cloudflare Pages** — choose a Cloudflare-native resizing loader or build-time AVIF/WebP rather than re-enabling Next's optimizer (incompatible with `output: export`).

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| **CSP breaks GA4/Cookiebot/WhatsApp/iframe** | Don't ship enforced CSP in this plan; `frame-ancestors`-only now, full CSP report-only later. |
| **HSTS `includeSubDomains`/`preload` locks all `*.letsdog.nl` to HTTPS** (could break a non-TLS subdomain) | Basic HSTS now; subdomain audit gates the preload upgrade at cutover. |
| **`_headers` overlapping patterns duplicate `Cache-Control`** (known Cloudflare gotcha, per CLAUDE.md) | Add new headers without overlapping existing `/_next/static`, `/images`, `/fonts` rules; `curl -I` to confirm no duplicates. |
| **Image pipeline incompatible with `output: export`** | Use Cloudflare image resizing or pre-built AVIF/WebP, not Next's optimizer. |
| **Restoring consent gating drops analytics volume** | It's a deliberate trade-off + already a post-cutover decision; present numbers, let owner choose. |
| **Per-page metadata refactor on client components (contact/FAQ)** | Split a thin server `page.tsx` exporting `metadata` from the existing client component. |

---

## Open decisions for you

**All review decisions resolved (2026-05-30):** cookie-consent (keep as-is), CSP (frame-ancestors only — full content-CSP de-scoped), agent-readiness (include), socials (add `@letsdogworld6` + `letsdogworld`), security headers (add all, in-repo `_headers`), image optimization (route B, build-time), card-styles (delete), **canonical host (apex `letsdog.nl`)**, SEO scope (technical on-page now; content SEO out of scope).

**Only remaining input — your go.** Suggested first PR batch: **U1, U2, U15, U14** (broken-link fix + per-page canonical/`og:url` + delete the demo + social links — fast, visible wins), then **Phase B** (full on-page SEO per the detailed spec above), then **Phase C** (all security headers), then images / a11y / agent-readiness. Say the word (or reorder) and I'll start — nothing changes on the site until then.

---

## Verification strategy (end-to-end)

1. `npm run build` clean → push branch → Cloudflare preview URL.
2. **Headers/files:** `curl -I` + `curl` the preview for HSTS/frame-ancestors/permissions-policy, `robots.txt` (+Sitemap), `sitemap.xml`, `security.txt`, `manifest.webmanifest`, `favicon.ico`, per-page canonical/og:url/og:image, JSON-LD.
3. **Perf/a11y:** Lighthouse/PSI (LCP/INP/CLS) + axe DevTools (0 critical), keyboard focus pass.
4. **Rich results:** Google Rich Results Test on FAQ + pricing.
5. **Re-audit against the spec** with the now-installed MCP: `audit_url("https://<preview>")` and `get_checklist({ status: "required" })` to confirm required items flip to pass.
6. **At cutover:** re-run 2–5 against `https://www.letsdog.nl`, submit sitemap to GSC, then drop the pages.dev noindex.
