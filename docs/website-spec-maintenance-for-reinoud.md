# Website-spec maintenance — a reusable pattern (for Reinoud)

Hi Reinoud 👋 — you installed the **[The Website Specification](https://specification.website) MCP server**, which is great for *auditing* a site. But an audit is a snapshot: the moment someone adds a page or swaps an image, the site can quietly drift back out of compliance. The trick we found is to pair the MCP with a small **maintenance doc + a one-line pointer in your `CLAUDE.md`** so your coding agent keeps things compliant *as it works*, instead of only when you remember to re-audit.

This file is meant to be **handed straight to your coding agent.** It contains (a) setup instructions for the agent and (b) the maintenance discipline itself, written generically so it maps onto whatever stack you use.

---

## 📋 Instructions for the coding agent (do these first)

1. **Save this file in the repo** at `docs/website-spec-maintenance.md` (rename it from the `-for-reinoud` copy).
2. **Add a reference line to `CLAUDE.md`** (or `AGENTS.md` — whatever your project uses as agent instructions). Put it in or near the SEO/spec section. Use wording like:

   > **Maintenance — when you change content/images/routes:** follow the trigger→action→verify matrix in `docs/website-spec-maintenance.md` so the website-spec systems (canonical, sitemap, structured data, image optimization, llms.txt, headers) stay in sync. Re-run the spec MCP `audit_url` only periodically (before launch, after a new page type, quarterly) — not on every edit.

   **What that line is for:** `CLAUDE.md` is loaded into the agent's context on every session. The pointer guarantees the agent *discovers* this maintenance doc and applies it during routine work — without it, the doc is just a file nobody reads. The pointer is the load-bearing part; the doc is the detail.
3. **Adapt the matrix below to this project's real names.** The rows are generic ("your per-page metadata helper", "your sitemap source"). Replace each with the actual file/function in this repo (e.g. the component that renders `<head>`, the sitemap generator, the structured-data builder). If a system doesn't exist yet, that's a gap — flag it or build it.
4. **Run the spec MCP once** (`audit_url("<this site's URL>")` + `get_checklist({ status: "required" })`) to establish the baseline and confirm which systems exist, then fill in the matrix accordingly.

---

## Why this exists

A compliant site has a handful of "systems" that **drift** when content or structure changes:

- per-page metadata (title / description / canonical / Open Graph / Twitter)
- the XML sitemap and `robots.txt`
- structured data (JSON-LD: Organization, WebSite, FAQPage, Product, Person, …)
- image optimization (modern formats + responsive sizes)
- the social-share image (`og:image`)
- security + discovery headers (`_headers` / edge config) and `llms.txt`

Re-auditing the whole site after every tiny edit is wasteful, and relying on memory fails. So: **encode the per-change steps once** (the matrix), and reserve the MCP audit for periodic verification.

## Trigger → action → verify (adapt the middle column to your stack)

| When you change… | Do this (map to your repo) | Verify |
|---|---|---|
| **Add or swap a photo** | run your image-optimization step to (re)generate modern-format + responsive variants; render through your `<picture>`/optimized-image component, not a raw `<img>`/full-size file | build; eyeball the page; check the served format is AVIF/WebP |
| **Change the hero / share image** | regenerate the `og:image` (often built from the hero) | a share-preview debugger; `curl \| grep og:image` |
| **Add a new page / route** | give it your per-page metadata helper (self-referential canonical + OG); add the path to the **sitemap source** *and* **`llms.txt`**; link it from nav/footer; add page-specific JSON-LD only if it's a rich type | sitemap contains it; canonical points to itself |
| **Rename / remove a route** | add a 301 redirect; remove it from sitemap + llms.txt + nav | old URL → 301; sitemap has no dead/redirecting URLs |
| **Edit FAQ / pricing / people** | edit the **single source of truth** the JSON-LD reads from (don't duplicate the data into the markup) | Rich Results test |
| **Add a social profile** | update the footer **and** the `sameAs` array in your Organization JSON-LD | both reflect it |
| **Change brand icon / colors** | regenerate the favicon/apple-touch/maskable/manifest icon set; update `theme_color` / `<meta theme-color>` | Lighthouse → installable/PWA |
| **Add a 3rd-party script / embed** | if you enforce a content-CSP, add the source to the allowlist (`script-src`/`connect-src`/`frame-src`) | nothing blocked in console; CSP report clean |
| **Touch headers / canonical / redirects** | re-verify on a deployed preview (`curl -I`) — header/edge behaviour usually can't be seen in a local build; watch for **duplicated `Cache-Control`** if your header rules can overlap | preview `curl -I` |

## What should auto-sync (build it this way if you can)

Wherever possible, make the markup **derive** from one source so it can't drift:

- canonical/OG/Twitter from **one metadata helper** every page calls;
- FAQ/Product/Person JSON-LD read from the **same data** the page renders;
- `og:image` generated from the hero at build time.

If your structured data is hand-written separately from the visible content, that's the #1 source of drift (and Google penalises out-of-sync FAQ/Product markup).

## Verification toolbox

- **Your build command** — first gate (types + generation).
- **`curl -I` a deployed preview** — headers/edge config are usually not visible locally.
- **Lighthouse** (Chrome DevTools) — Performance / SEO / PWA / Accessibility.
- **axe DevTools** — deeper accessibility.
- **The `specification-website` MCP** — `audit_url(<url>)` + `get_checklist({ status: "required" })`.

## When to re-run the MCP audit

Before launch · after adding a new page type or content system · quarterly. **Not** on every routine edit — the matrix already covers those.

---

*This pattern came out of a Let's Dog website project (Next.js static export on Cloudflare Pages). The systems are universal; only the file names change. — shared by Jur*
