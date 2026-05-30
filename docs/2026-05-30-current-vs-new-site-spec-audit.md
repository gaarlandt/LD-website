# Current site vs. the new site — a specification-based comparison

**Date:** 2026-05-30
**Purpose:** An evidence-based answer to "is it worth building and running our own website instead of staying on the current WordPress site?" Both sites are compared against [The Website Specification](https://specification.website) — a platform-agnostic, standards-backed checklist (WHATWG, W3C, IETF, WCAG) of what a good website should do. 128 checklist items.

> This document is deliberately **balanced** — it names where the current site is genuinely good, not just where it's weak. The conclusion is stronger for it.

---

## TL;DR

The current WordPress site does **on-page SEO** nicely (Yoast handles it), but it carries that SEO on top of a **4.46 MB homepage, zero security headers, and an exposed WordPress admin/API**. The new Let's Dog site is **35× lighter, edge-served, secure-by-default, and built for accessibility** — with the same SEO foundations *plus* structured data, an XML sitemap, and agent-readiness. At the switch-over, **no search ranking is lost**. Building and running our own is the better call across the board.

---

## How both sites score

✅ good · ⚠️ partial · ❌ weak/missing · ➖ N/A.

| Spec area | Current site (WordPress) | New site (Let's Dog) |
|---|---|---|
| **Performance** | ❌ 4.46 MB HTML, 27 CSS, 41 scripts | ✅ 128 KB, 1 CSS, modern image formats, edge |
| **Security** | ❌ no headers + open `wp-admin`/`wp-json` | ✅ full header set, no server/DB/admin |
| **Accessibility** | ⚠️ Elementor markup, not purpose-built | ✅ semantic, skip-link, ARIA, reduced-motion, contrast/focus |
| **Maintainability** | ❌ WP + Elementor + plugins, live server + DB | ✅ static files from version control, nothing to patch |
| **SEO (on-page)** | ✅ Yoast: canonical, OG, JSON-LD, sitemap | ✅ canonical, OG + image, structured data, sitemap, robots |
| **HTML foundations** | ✅ | ✅ |
| **Resilience (404 etc.)** | ✅ real 404 | ✅ real 404 + branded Dutch 404 |
| **Agent-readiness** | ❌ none | ✅ llms.txt, link headers, structured data for AI |
| **Privacy/consent** | ⚠️ | ⚠️ deliberate choice: continuous analytics |
| **Internationalisation** | ➖ NL-only | ➖ NL-only |

---

## The current site's strength — and the new site matches it

Credit where due: the WordPress site runs **Yoast SEO**, giving it a solid on-page SEO layer — a self-referencing canonical, full Open Graph with a share image, a JSON-LD structured-data graph, and a correct `robots.txt` + sitemap. The new site has **those same foundations** (canonical, OG with image, JSON-LD, XML sitemap, robots) and **extends them** with structured data for both search engines and AI agents, plus more landing pages. On SEO the two are level — and on everything around it, the new site wins.

---

## Where the current site falls down — three structural reasons

### A. Performance — the homepage is enormous
The current homepage ships **4,461,449 bytes (4.46 MB) of HTML** *before* a single image, script, or stylesheet — built from **41 scripts and 27 stylesheets** (the classic WordPress + Elementor footprint). The new homepage is **128 KB with one stylesheet**, ~35× lighter, served as static files from the edge. **Core Web Vitals are both a required spec item and a Google ranking factor** — a 4.46 MB page actively undermines the very SEO the site is otherwise good at.

### B. Security — no protection, wide attack surface
The current site sends **zero security headers**, keeps **WordPress admin (`/wp-admin/`) and the REST API (`/wp-json/`) publicly open**, and broadcasts its exact software versions (`WordPress 7.0`, `Elementor 4.0.9`) in the source — a gift to exploit scanners. The new site has **no admin, no database, no server-side code** to exploit (static files), and sends the full set of protective headers.

### C. Architecture & maintainability — a permanent treadmill
WordPress + Elementor + plugins means **ongoing security patching, plugin-compatibility risk, and a live PHP server + database** to keep running — plus a page builder whose output is heavy and hard to control. The new site is **static files generated from version-controlled code**: nothing to patch at runtime, nothing to take down, every change reviewed and previewed. The difference between *renting a liability* and *owning an asset*.

---

## What the new site delivers
- **35× lighter pages**, one stylesheet, non-blocking scripts, and modern image formats — from the edge.
- **Full security headers** and no server/database/admin to exploit.
- **Built for accessibility**: semantic structure, skip-to-content, ARIA, and `prefers-reduced-motion`.
- **Complete on-page SEO**: canonical, Open Graph with image, JSON-LD structured data, XML sitemap, and robots.txt — plus more landing pages than the old site.
- **Agent-readiness**: llms.txt, link headers, and structured data so AI assistants understand the site too.
- **Ownership**: the whole site in our own code and version control, not locked into a page builder.

---

## Continuity at the switch-over — no ranking lost

The current site has **7 indexed URLs**, and **every one is covered** on the new site — either it exists at the same path or it 301-redirects (e.g. `/privacy-policy/` → `/privacybeleid/`). So when DNS switches over, Google follows clean redirects and **no ranking equity is dropped**. One canonical host (`letsdog.nl`) is kept so variants don't compete.

---

## Recommendation

**Build and run our own site.** The current site's strength — SEO meta — is matched and extended on the new site; its weaknesses — performance, security, maintainability — are *structural* and cannot be fixed without leaving WordPress/Elementor behind. The new site wins on the things you can't buy back later — speed, security, accessibility, and owning the code — while preserving every current search ranking.
