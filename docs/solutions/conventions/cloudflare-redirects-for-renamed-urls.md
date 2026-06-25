---
title: Cloudflare Pages _redirects pattern for renamed URLs
date: 2026-05-29
category: conventions
module: routing
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Renaming a published URL on the Let's Dog marketing site
  - Replacing one route with another while keeping the old slug crawlable
  - Any future page rename now that the site is on Cloudflare Pages
tags: [cloudflare-pages, redirects, url-rename, seo, static-export, next-trailing-slash]
---

# Cloudflare Pages _redirects pattern for renamed URLs

## Context

During the pricing-refresh + UX sweep (PR #13, 2026-05-29) the route `/hondenkeuze/` was renamed to `/rassenkeuze/`. The page already existed on the live site and the old slug was indexed by search engines, linked from past social/email content, and bookmarked. A bare rename of the `app/hondenkeuze/` directory would have produced a hard 404 on every old link.

The fix is `public/_redirects` — a one-file Cloudflare-Pages-specific config that's copied to `out/` during `npm run build` and consumed by Cloudflare's edge. Two things were non-obvious enough to be worth capturing:

1. Whether one `_redirects` line covers both `/hondenkeuze` and `/hondenkeuze/`.
2. Whether you can verify the redirect locally before pushing.

## Guidance

**Write two lines per renamed URL — one with trailing slash, one without.** `next.config.ts` on this project sets `trailingSlash: true`, so internal links and the static export emit `/path/`. External links from the wild (old emails, social posts, hand-typed) frequently arrive without the slash. Each form is a distinct match in Cloudflare's `_redirects` table, so cover both:

```
# public/_redirects
/hondenkeuze/                /rassenkeuze/      301
/hondenkeuze                 /rassenkeuze/      301
```

Format is whitespace-separated: `<source> <dest> <status>`. 301 = permanent (correct for renames — search engines transfer ranking signal). Use 302 only for temporary swaps.

**Do not test the redirect in `npm run dev`.** Next.js's dev server doesn't read `public/_redirects` — it'll just 404 on the old URL. The redirect only activates after Cloudflare Pages builds and deploys from `out/`. Verify on the `<branch-slug>.website-letsdog.pages.dev` preview URL (or the prod URL after merge), not locally.

`curl` is the fastest verification:

```bash
curl -sI https://<branch-slug>.website-letsdog.pages.dev/hondenkeuze/
# expect: HTTP/2 301 + location: /rassenkeuze/

curl -sI https://<branch-slug>.website-letsdog.pages.dev/hondenkeuze
# expect: HTTP/2 301 + location: /rassenkeuze/
```

## Why This Matters

- **SEO**: a 301 preserves Google's accumulated ranking signal on the old URL. A 404 (or no redirect at all) drops it.
- **Inbound links don't get fixed retroactively**: old emails, social posts, partner pages, and bookmarks will keep arriving on `/hondenkeuze/` forever. Without the redirect they hit a 404.
- **Trailing-slash mismatch is silent**: if you only write the `/hondenkeuze/` form and a user types `/hondenkeuze` (no slash), the redirect misses and you get a 404. The duplicate line is cheap insurance.
- **Verification window is short**: the Cloudflare preview URL is the only place to confirm before merge. Skipping the `curl` check means you're trusting the redirect blindly until prod traffic hits it.

## When to Apply

- Every time a published URL on this site changes shape (rename, restructure, locale-swap, etc.).
- Whenever you delete a route that used to be published — redirect it to the nearest sensible page instead of leaving a 404.
- Re-check `_redirects` after any large path-restructure PR; renames sneak in.

## Examples

**Two-line rename pattern**, as shipped in PR #13:

```
/test/                       /                  301
/privacy-policy/             /privacybeleid/    301
/hondenkeuze/                /rassenkeuze/      301
/hondenkeuze                 /rassenkeuze/      301
/puppyagenda/                /puppycursus/      301
/puppyagenda                 /puppycursus/      301
```

The `/puppyagenda/ → /puppycursus/` pair (route renamed 2026-06) is the dual-form pattern reused exactly as prescribed. Note the existing `/test/` and `/privacy-policy/` entries follow the same shape — slash-included form only, because those legacy WP URLs always shipped with the trailing slash. The dual-form pattern is only required when the old URL might exist without a slash in the wild.

**What the working tree looks like post-rename:**

```
app/rassenkeuze/page.tsx           # new directory (renamed via `git mv`)
public/_redirects                  # +2 lines for the old slug
components/{navbar,footer,…}.tsx   # every `href="/hondenkeuze"` → `href="/rassenkeuze"`
```

The `git mv` matters — it preserves blame history on the page file across the rename.

## Related

- [`public/_redirects`](../../../public/_redirects) — live redirect table for this project
- [`public/_headers`](../../../public/_headers) — sibling Cloudflare Pages config (overlap rules differ — see CLAUDE.md gotcha)
- [CLAUDE.md "Important Notes"](../../../CLAUDE.md) — Cloudflare Pages config files note
- [HANDOFF.md common gotcha #1](../../../HANDOFF.md) — `_headers` overlap pitfall (different file, similar lesson about Cloudflare-Pages-specific behavior)
- PR #13 (merged 2026-05-29) — the rename that prompted this doc
