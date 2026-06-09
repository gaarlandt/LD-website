# Website-spec maintenance — when you change X, do Y

This site is compliant with [The Website Specification](https://specification.website) (the build is documented in `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`). Compliance is **not** a one-time thing: a handful of in-repo "systems" silently drift when content or structure changes. This file is the deterministic checklist so you — or an agent — keep them in sync **without re-auditing on every edit**.

> **Golden rule:** the matrix below is the routine path. The `specification-website` MCP audit is for *periodic* re-checks (see "When to re-run the audit"), not every change.

## Trigger → action → verify

| When you change… | Do this | Verify |
|---|---|---|
| **Add or swap a photo** | `npm run optimize:images` → commit `public/images/optimized/*` → render with `<OptimizedImage src="/images/x.jpeg" … />` (raw path, no `asset()`). **Filename must have no spaces** (breaks `srcset`). | `npm run build`; open the page on the preview |
| **Change the hero photo** | also run `npm run generate:og` → commit `public/og/og-default.jpg` (the share image is built from the hero) | share-debugger, or `curl … \| grep og:image` |
| **Add a new page / route** | `export const metadata = pageMetadata({title, description, path})` in its `page.tsx`; add the path to **`app/sitemap.ts`** *and* **`public/llms.txt`**; add it to `components/layout/navbar.tsx` + `footer.tsx`; add page-specific JSON-LD in `lib/structured-data.ts` only if it's a rich type (FAQ/Product/Person/etc.) | `curl …/sitemap.xml`; canonical is self-referential apex |
| **Rename / remove a route** | add a 301 in `public/_redirects`; remove it from `app/sitemap.ts` + `public/llms.txt` + nav/footer | `curl -I` old path → 301; sitemap has no dead/redirecting URLs |
| **Add a legal page** | `content/<slug>.md` + a 15-line `app/<slug>/page.tsx` (copy an existing one) + sitemap + llms.txt + footer link | page renders; in sitemap |
| **Edit the FAQ** | edit **`app/veelgestelde-vragen/faq-data.ts`** only — the FAQPage JSON-LD reads the same array | Google Rich Results test |
| **Edit pricing** | edit the **`tiers`** array in `components/sections/pricing-data.ts` — the Product/Offer JSON-LD reads it; derived figures (per-year, savings %, per-month) recompute from `priceValue` in `pricing-toggle-card.tsx` | Google Rich Results test |
| **Add a social profile** | add it to `components/layout/footer.tsx` **and** `SAME_AS` in `lib/structured-data.ts` | both reflect the new URL |
| **Change the brand icon / colors** | `npm run generate:icons`; update `theme_color` in `app/manifest.ts` + `viewport.themeColor` in `app/layout.tsx` if the brand color changed | Lighthouse → PWA/installable |
| **Add a 3rd-party script / embed** | nothing today — the CSP is `frame-ancestors` only (no `script-src` allowlist to maintain). *If* a full content-CSP is ever added, this becomes an allowlist edit in `public/_headers` | — |
| **Touch `_headers` / security / canonical / `metadataBase`** | re-verify on the Cloudflare preview with `curl -I` (headers are Cloudflare-applied, not visible in a local build); tick the post-cutover checklist in `docs/CUTOVER.md` | preview `curl -I` |

## What auto-syncs (don't hand-edit twice)

- **Canonical / OG / Twitter** come from `lib/seo.ts` → `pageMetadata()`. Any page that calls it is correct by construction.
- **FAQ JSON-LD** reads `app/veelgestelde-vragen/faq-data.ts`. Edit the data; the markup follows.
- **Pricing JSON-LD** reads the `tiers` array in `components/sections/pricing-data.ts`.
- **og:image** is generated from the hero photo; only regenerate when the hero changes.

## The verification toolbox

- **`npm run build`** — TypeScript + static export. The first gate; run it before every commit.
- **`curl` the preview** — `_headers` behaviour is **Cloudflare-only** and can't be checked locally: security headers, `Link` headers, **no duplicated `Cache-Control`** on assets, and 200s for `robots.txt` / `sitemap.xml` / `.well-known/security.txt` / `manifest.webmanifest` / `llms.txt`.
- **Lighthouse** (Chrome DevTools → Lighthouse tab) — Performance / SEO / PWA / Accessibility scores + concrete fixes.
- **axe DevTools** (Chrome extension) — deeper accessibility (contrast, labels, ARIA).
- **`specification-website` MCP** — `audit_url("<preview-url>")` + `get_checklist({ status: "required" })` to confirm required items pass.

## When to re-run the spec MCP audit

- **Before cutover.**
- After adding a **new page type** or a **new content system**.
- **Quarterly** as a drift check.

NOT on every routine edit — the matrix already encodes the per-change steps.

## The 90% case

Swapping an image is the most common change: **`npm run assets`** (optimize images + regenerate icons + og) → commit the generated files → done.

---

*Known follow-up (brand decision, not yet resolved): body/small text on brand-green `#75876D` can't reach WCAG AA 4.5:1 (caps at 3.86:1 even in pure white). Large headings pass the 3:1 large-text bar. Revisit by darkening the green sections or using dark text — see `docs/CUTOVER.md`.*
