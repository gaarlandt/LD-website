---
title: react-markdown silently drops tables without remark-gfm
date: 2026-05-28
category: developer-experience
module: legal-pages-markdown
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - Using react-markdown to render Markdown anywhere in this codebase
  - The Markdown source contains tables, strikethrough, task lists, or autolinks
tags: [react-markdown, remark-gfm, markdown, gfm, tables, silent-failure]
---

# react-markdown silently drops tables without remark-gfm

## Context

While building the markdown content layer for the 5 legal pages, `content/cookieverklaring.md` contained a small markdown table for the bewaartermijn card:

```markdown
| Cookie-type           | Bewaartermijn   |
| --------------------- | --------------- |
| Functionele cookies   | Maximaal 1 jaar |
| Analytische cookies   | Maximaal 2 jaar |
```

The table rendered as nothing on `/cookieverklaring` — no error in the console, no warning at build time, no fallback. The build succeeded, the page rendered, the table was just missing. The H2 above it ("Cookiegeschiedenis & bewaartermijnen") was followed by the next H2, with the table content silently gone.

## Guidance

`react-markdown` follows strict CommonMark by default. Several syntax features that feel like "standard markdown" are actually GitHub-Flavored-Markdown extensions and require the `remark-gfm` plugin:

- **Tables** (`| col | col |`)
- **Strikethrough** (`~~text~~`)
- **Task lists** (`- [x] item`)
- **Autolinks** (bare URLs converted to clickable links)
- **Footnotes**

Install and wire up:

```bash
npm install remark-gfm
```

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

<ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ... }}>
  {content}
</ReactMarkdown>
```

In this project, the wiring lives in [components/shared/legal-page-layout.tsx](../../../components/shared/legal-page-layout.tsx). Any new markdown renderer added elsewhere should mirror the same `remarkPlugins={[remarkGfm]}` line.

## Why This Matters

The failure mode is **silent** — no error, no warning, no build break. The agent or human writing the markdown sees "this is just markdown" and assumes it will render. The cookieverklaring case made it through local build verification and would have shipped to preview if I hadn't specifically inspected the table element. A typo-tier oversight became a content-missing-on-page bug only caught because I happened to inspect that specific element.

For a marketing site, "table content invisible to users" is a real regression that visual screenshots alone may not catch (an empty area between headings looks plausible). The combination of (a) ubiquitous GFM mental model, (b) react-markdown's strict-CommonMark default, and (c) silent omission rather than error makes this the kind of thing every team hits exactly once and should never hit twice.

## When to Apply

- Anywhere `react-markdown` is added to a new component or page
- When extending `content/*.md` with any new syntax — if you reach for a table, task list, strikethrough, or footnote, double-check the renderer has `remarkPlugins={[remarkGfm]}`
- When debugging "my markdown rendered but X is missing" — `remark-gfm` is the first thing to check before suspecting the markdown itself

## Examples

**Before** (table silently missing):

```tsx
<ReactMarkdown components={{ ... }}>{content}</ReactMarkdown>
```

**After** (table renders):

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ... }}>
  {content}
</ReactMarkdown>
```

Component overrides for table elements (`table`, `thead`, `tbody`, `tr`, `th`, `td`) only take effect once `remark-gfm` is enabled — without the plugin, the table tokens are dropped before the override map even sees them.

## Related

- [Markdown-driven legal pages](../../../CLAUDE.md) — CLAUDE.md section documenting the legal-page content layer
- [Brainstorm: markdown content refactor](../../brainstorms/markdown-content-refactor-requirements.md)
- [Plan: refactor legal pages to markdown](../../plans/2026-05-28-001-refactor-legal-pages-to-markdown-plan.md)
- [react-markdown plugins docs](https://github.com/remarkjs/react-markdown#plugins)
