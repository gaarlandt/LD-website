---
title: "RFC 9727 /.well-known/api-catalog on Cloudflare Pages — extensionless files need an explicit Content-Type"
date: 2026-06-10
category: conventions
module: deployment / Cloudflare Pages
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Shipping a /.well-known/ resource or any extensionless static file that requires a specific media type
  - Adding an RFC 9727 api-catalog (RFC 9264 Linkset) to a static-export site on Cloudflare Pages
  - A static file serves as application/octet-stream instead of the media type you expected
  - Verifying _headers, Link, or Content-Type behavior that next dev does not reproduce
tags: [cloudflare-pages, _headers, well-known, api-catalog, content-type, rfc-9727, agent-readiness, linkset]
---

# RFC 9727 /.well-known/api-catalog on Cloudflare Pages — extensionless files need an explicit Content-Type

## Context

The 2026-06-10 Website-Specification re-audit found `/.well-known/api-catalog` returning 404 (a recommended-tier agent-readiness gap). Shipping it on this static-export Cloudflare Pages site surfaced a non-obvious gotcha: the file RFC 9727 expects is **extensionless** (`/.well-known/api-catalog`, no `.json`), and Cloudflare Pages serves extensionless static files as `application/octet-stream` by default. RFC 9727 requires `application/linkset+json` (an RFC 9264 Linkset); strict agents type-check the response and skip a catalog served with the wrong media type. Dropping the file into `public/.well-known/` is necessary but **not sufficient**.

## Guidance

Ship two things, and verify on the Cloudflare preview (not `next dev`).

**1. The Linkset file** at `public/.well-known/api-catalog` (copied verbatim into `out/` by the static export):

```json
{
  "linkset": [
    {
      "anchor": "https://letsdog.nl/",
      "describedby": [
        { "href": "https://letsdog.nl/llms.txt", "type": "text/markdown", "title": "Site index for LLMs" }
      ],
      "sitemap": [
        { "href": "https://letsdog.nl/sitemap.xml", "type": "application/xml" }
      ],
      "terms-of-service": [
        { "href": "https://letsdog.nl/algemene-voorwaarden/", "type": "text/html" }
      ]
    }
  ]
}
```

**2. Two `public/_headers` edits** — set the media type, and advertise the catalog:

```
/*
  …existing security + Link headers…
  Link: </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"

# Extensionless file → Cloudflare would serve application/octet-stream without this.
/.well-known/api-catalog
  Content-Type: application/linkset+json; charset=utf-8
```

Both stay within the repo's documented `_headers` **merge invariant** (CLAUDE.md → "Important Notes"): the `/*` block sets only security + `Link` headers (never `Cache-Control`); per-directory blocks set only `Cache-Control`. The new `Content-Type` block is safe precisely because `Content-Type` is set by no other matching rule, so no single header is ever emitted by two matching rules.

Use only **registered IANA link relations** (`describedby`, `sitemap`, `terms-of-service`, `service-desc`, `alternate`, `license`, …) — inventing relation names makes strict agents skip them. The anchor and every `href` use the canonical apex `https://letsdog.nl` (matching `sitemap.xml`), not the `*.pages.dev` host.

## Why This Matters

- **Media type is load-bearing for RFC 9727.** `application/octet-stream` ≠ `application/linkset+json`; agents that strictly type-check ignore the catalog, defeating the whole point (unauthenticated discovery of `llms.txt` / `sitemap.xml` / terms-of-service). The fix is invisible in source and in the built `out/` file — it lives entirely in `_headers`.
- **`_headers` is not honored by `next dev`.** You cannot verify `Content-Type`, `Link`, or new `.well-known` responses locally. A local `npm run build` + `grep out/` only proves the file is emitted and the JSON parses — it cannot prove the served media type. The only real check is `curl -sI` against the Cloudflare branch preview (mind the 28-char alias truncation — see related doc).

## When to Apply

- Adding any extensionless static file that needs a specific `Content-Type` on Cloudflare Pages.
- Adding `/.well-known/` resources, `api-catalog`, or other agent-readiness surfaces to this site.
- Any time you change `_headers` and need to confirm the live header behavior.

## Examples

Verified live on the branch preview (`feat-spec-compliance-fixes.website-letsdog.pages.dev`):

```
$ curl -sI <preview>/.well-known/api-catalog
HTTP/2 200
content-type: application/linkset+json; charset=utf-8

$ curl -sI <preview>/          # /* Link header now advertises 4 resources
link: …, </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"
```

Local build confirms emission only — necessary, not sufficient (cannot prove media type):

```
$ ls out/.well-known/api-catalog                                          # file copied
$ node -e "JSON.parse(require('fs').readFileSync('out/.well-known/api-catalog'))"   # parses
```

## Related

- [`conventions/cloudflare-pages-preview-functions-gotchas.md`](cloudflare-pages-preview-functions-gotchas.md) — the 28-char preview-alias truncation and the "verify on the preview, not `next dev`" discipline this builds on.
- [`conventions/cloudflare-redirects-for-renamed-urls.md`](cloudflare-redirects-for-renamed-urls.md) — sibling Cloudflare-Pages edge-config convention (`_redirects`), also invisible to `next dev`.
- [`developer-experience/react-markdown-needs-remark-gfm-for-tables.md`](../developer-experience/react-markdown-needs-remark-gfm-for-tables.md) — adjacent to the secondary fix shipped in the same PR: legal-page GFM tables now render `<th scope="col">` (added to the existing `th` override in `components/shared/legal-page-layout.tsx`) to satisfy the spec's required-tier data-tables rule. GFM only emits a header row, so every `<th>` is unambiguously a column header.
- CLAUDE.md → "On-page SEO, metadata & spec compliance" (Agent-readiness bullet) and "Important Notes" (`_headers` merge invariant).
- PR: [gaarlandt/LD-website#38](https://github.com/gaarlandt/LD-website/pull/38).
