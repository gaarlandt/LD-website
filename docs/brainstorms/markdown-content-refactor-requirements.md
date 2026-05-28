---
date: 2026-05-28
topic: markdown-content-refactor
---

# Markdown Content Refactor — Legal Pages

## Summary

Extract per-page visible text from the five legal/long-form Next.js pages into `content/<slug>.md` files. Each page reads its content from markdown at build time so copy edits don't touch React. Marketing pages (homepage, over-ons, prijzen, contact, faq, puppyagenda) stay in TSX — reassess after a month of real editing.

---

## Problem Frame

The site just shipped (Cloudflare Pages migration completed 2026-05-28) with an initial AI-drafted copy pass. Jur is about to do a copy-tweak pass across the whole site. Today, every visible string lives inside a `sections: [{ title, content, items? }]` data array inside each `page.tsx`. To change a typo or rephrase a sentence, Jur either edits TSX directly or asks Claude — both have friction during a high-volume tweak pass.

Legal pages are 95% prose and ~120 lines of data each; marketing pages are 30% prose with tightly-styled JSX where text and structure are co-designed. Markdown earns its keep at the first ratio and fights the second. So scope is the 5 legal pages where the workflow win is real, not all pages where consistency-for-its-own-sake would pay carrying cost on every section schema.

---

## Actors

- A1. **Jur** (site owner / sole content editor): edits Dutch-language copy across the site. Currently the only editor.

---

## Key Flows

- F1. **Copy edit on a legal page**
  - **Trigger:** Jur spots a typo or wants to rephrase
  - **Actors:** A1
  - **Steps:** open `content/<slug>.md` in any editor → edit prose / list item / link → commit → Cloudflare preview builds in ~90s → verify on preview URL → merge
  - **Outcome:** Site copy updated without touching `.tsx`
  - **Covered by:** R1, R2, R6

---

## Requirements

**Content extraction (5 pages in scope)**
- R1. Each of these pages reads body content from `content/<slug>.md` at build time: `privacybeleid`, `ai-gebruiksvoorwaarden`, `cookieverklaring`, `retour`, `ip-overdrachtsverklaring`.
- R2. Frontmatter holds the page-shell fields a render needs: `title`, `description`, `eyebrow` (defaults to "Juridisch"), and optional `lead` (subhead in the green hero band).
- R3. Markdown body uses standard syntax: `##` for section headings, `-` for bullets, `[text](url)` for links. Anything that requires HTML is a signal to leave that block in `.tsx`, not to invent a markdown extension.

**Visual parity with current TSX**
- R4. Each refactored page renders visually equivalent to its current TSX version on the live preview: same green hero band, same H1 / H2 typography (National2 + DM Sans), same body color (`#141414` at 70% opacity), same brand-green (`#75876D`) bullet dots and link underlines, same vertical rhythm (`space-y-12` between sections).
- R5. The shared "Vragen?" / contact block at the bottom of each page is part of the markdown body (one block per page, not a hardcoded component) so editors can revise the contact wording without changing code.

**Edge cases inside the 5 pages**
- R6. `ip-overdrachtsverklaring` keeps its printable signature form (3 input lines: Naam / Datum / Handtekening) as a TSX block rendered after the markdown body — frontmatter flag `signature_form: true` opts in.
- R7. `cookieverklaring`'s "Cookiegeschiedenis & bewaartermijnen" card (beige rounded box with 2-column grid) renders as a markdown table; the renderer styles `<table>` to approximate the original card. Small visual delta is acceptable.
- R8. `privacybeleid`'s "Profilering" section internal links and the styled single-link CTAs (currently `link: { href, label }`) become inline markdown links in prose.

**Editor experience**
- R9. Editing a `content/<slug>.md` file does not require any TSX changes for typical copy changes: rewording, adding/removing list items, adding sections, updating internal links, updating contact info.
- R10. Adding a new legal page is documented as: drop `content/<new-slug>.md` + create a 10-line `app/<new-slug>/page.tsx` that re-uses the shared legal-page layout component.

---

## Acceptance Examples

- AE1. **Covers R1, R4.** Given the refactor is shipped, when I diff a screenshot of `/privacybeleid` on the preview URL against the current production, the visible content layout matches (same hero band, same section spacing, same brand-green bullets); only the rendering source differs.
- AE2. **Covers R6.** Given I open `/ip-overdrachtsverklaring`, when I scroll past the markdown body, the printable signature form (Naam / Datum / Handtekening on three underlined lines) is still present.
- AE3. **Covers R9.** Given I want to rephrase "Wij verkopen je gegevens nooit aan derden" to "Wij verkopen je persoonsgegevens onder geen enkele voorwaarde aan derden", when I edit only `content/privacybeleid.md` and push, the next preview build shows the new copy with no `.tsx` change in the diff.
- AE4. **Covers R7.** Given the refactor is shipped, when I view `/cookieverklaring`, the bewaartermijn information is still visible and grouped (table-as-card delta is acceptable); the content of the two-column grid is preserved.

---

## Success Criteria

- A month after merge, Jur reports he made at least one copy edit by editing `.md` (not via Claude / not via TSX) for at least one of the 5 pages.
- Zero visual regressions reported on the 5 refactored pages after the preview verify.
- Per-page `page.tsx` shrinks to ≤ ~15 lines of orchestration (load content + pass to shared layout).

---

## Scope Boundaries

- **In scope:** the 5 legal pages listed in R1, the markdown content layer, a shared legal-page layout component, build-time markdown read via `gray-matter` + `react-markdown` (or equivalent).
- **Out of scope (deferred for later):** homepage (`app/page.tsx`), over-ons, prijzen, contact, veelgestelde-vragen, puppyagenda. Re-evaluate after one month of editing usage on the legal pages.
- **Out of scope (won't do):** a CMS layer (Decap, Tina, Notion source), live editing UI / admin route, multi-language content (the site is Dutch-only and there is no i18n need on the horizon), MDX (markdown-with-JSX-components — overkill for one card and one signature form).

---

## Key Decisions

- **Hybrid scope, not all-pages.** Legal pages have the prose-to-structure ratio where markdown wins; marketing pages have tightly-styled JSX where extracting flat text loses design intent and extracting with structure means inventing a schema per section. Picked hybrid to deliver the real editing win without paying carrying cost on heterogeneous content types.
- **Build-time read, not runtime.** Preserves Next.js static export (`output: "export"`), no SSR/API routes added, no runtime dependency surface for production.
- **Standardized typography via component-override renderer, not Tailwind `prose`.** `@tailwindcss/typography` is not yet officially v4-stable; mapping markdown nodes to the existing per-page Tailwind classes via react-markdown's `components` prop keeps brand parity without a new plugin dependency.
- **`Vragen?` block lives in markdown, not in a shared component.** Each page can have its own contact wording, and the block is a natural part of the page's content. Avoids a shared component that would need to grow optional props per page.

---

## Dependencies / Assumptions

- `gray-matter` for frontmatter parsing (build-time only, no runtime cost). MIT.
- `react-markdown` for body rendering with component overrides. MIT. Assumed compatible with React 19 + Next 16 — verify during /ce-plan.
- Tailwind v4 already in place, brand colors are inline literals (no config file), so component overrides will reference the same hex codes the current TSX uses.
- Cloudflare Pages auto-builds the branch on push; preview URL at `chore-markdown-content-refactor.website-letsdog.pages.dev` (or similar slug).

---

## Outstanding Questions

- None blocking. The bewaartermijn-card visual delta is acceptable per R7; if Jur wants pixel-parity later, the table renderer can grow card styling.
