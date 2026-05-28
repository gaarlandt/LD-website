---
date: 2026-05-28
type: refactor
status: active
topic: legal-pages-to-markdown
origin: docs/brainstorms/markdown-content-refactor-requirements.md
---

# refactor: Extract legal page content to markdown

## Summary

Convert the five legal/long-form pages (`privacybeleid`, `ai-gebruiksvoorwaarden`, `cookieverklaring`, `retour`, `ip-overdrachtsverklaring`) from inline `sections[]` arrays in `.tsx` to `content/<slug>.md` files. Each page reads its markdown at build time via a shared `LegalPageLayout` component that preserves the existing green hero band + white body design.

---

## Problem Frame

The site just shipped with AI-drafted copy. Jur is about to do a copy-tweak pass and wants to edit prose without touching React. The five legal pages are 95% prose, low design density — markdown earns its keep here. Marketing pages stay TSX (deferred, see origin: [`docs/brainstorms/markdown-content-refactor-requirements.md`](../brainstorms/markdown-content-refactor-requirements.md)).

---

## Output Structure

```
content/
  privacybeleid.md
  ai-gebruiksvoorwaarden.md
  cookieverklaring.md
  retour.md
  ip-overdrachtsverklaring.md

lib/
  content.ts                       # NEW: loadLegalContent(slug)

components/shared/
  legal-page-layout.tsx            # NEW: green hero + react-markdown render
  signature-form.tsx               # NEW: ip-overdracht-only printable form

app/
  privacybeleid/page.tsx           # REWRITTEN (~15 lines)
  ai-gebruiksvoorwaarden/page.tsx  # REWRITTEN
  cookieverklaring/page.tsx        # REWRITTEN
  retour/page.tsx                  # REWRITTEN
  ip-overdrachtsverklaring/page.tsx# REWRITTEN
```

The tree shows the expected shape; per-unit `**Files:**` are authoritative.

---

## Key Technical Decisions

- **Renderer: `react-markdown` with component overrides, not `@tailwindcss/typography` prose.** Each markdown node (`h2`, `p`, `ul`, `li`, `a`, `strong`, `table`, `td`) maps to the exact Tailwind classes the current TSX uses (`#141414`, `#75876D`, `font-heading`, `space-y-12`). Keeps brand-color and font parity tight; avoids a v4-stability question on the typography plugin.
- **Frontmatter schema (minimal, page-shell only).** `title` (string), `description` (string, meta), `eyebrow` (string, default `"Juridisch"`), `lead` (string, optional subhead under H1 in green hero band), `signature_form` (boolean, default false, only `ip-overdracht` sets true). No content lives in frontmatter — only what the page-shell needs to know.
- **Shared `LegalPageLayout` component.** All 5 pages render via the same component (`green hero band` + `react-markdown` body in `SectionWrapper`). Per-page `page.tsx` becomes ~15 lines of orchestration. (See origin Key Decisions: "Vragen? lives in markdown".)
- **`## Vragen?` block in markdown body.** Each page writes its own contact block as ordinary markdown so wording is editable without code change. No shared `<ContactBlock>` component.
- **Build-time fs read.** `fs.readFileSync` at module scope (server component); Next 16 static export resolves at build time. No runtime markdown parsing.
- **`cookieverklaring` bewaartermijn-card → markdown table.** Render as `| Cookie-type | Bewaartermijn |` table; `<table>` override gives it beige `#EFE8E4` background and rounded card styling. Small visual delta acceptable per origin R7.
- **`ip-overdrachtsverklaring` signature form stays TSX.** One-off printable form (3 underline-input rows). Imported by that page only, rendered after the markdown body when `data.signature_form === true`.

---

## Patterns to Follow

- `components/shared/section-wrapper.tsx` — existing pattern for `<section>` boundaries with consistent padding. `LegalPageLayout` will wrap content in `SectionWrapper`.
- `lib/utils.ts` — existing helper module pattern (small, named exports, no default export). `lib/content.ts` follows the same shape.
- Brand-color literals inline (no Tailwind config in v4): `#75876D` (brand green), `#141414` (black), `#EFE8E4` (beige), `#FFA580` (peach), `#162A0E` (dark green). Component overrides reference these directly via `text-[#...]` / `bg-[#...]` arbitrary values.
- Server components by default; no `"use client"` needed for any of the new code (markdown is parsed and rendered server-side, hydrated as static HTML).
- Existing per-page metadata pattern (`export const metadata: Metadata = {...}`) is preserved — populated from frontmatter `data.title` + `data.description`.

---

## Implementation Units

### U1. Add markdown dependencies and scaffold foundation

**Goal:** Install `gray-matter` + `react-markdown`, create the content directory, and build the shared `LegalPageLayout` + `SignatureForm` + `loadLegalContent` helper. After this unit, the infrastructure exists but no page has been migrated yet.

**Requirements:** R2, R4 (visual parity rules baked into the layout), R6 (signature form), R10 (new-page documentation)

**Dependencies:** none

**Files:**
- `package.json` (add deps)
- `package-lock.json` (lockfile)
- `content/.gitkeep` or first `.md` file lands in U2 — directory creation is implicit
- `lib/content.ts` (new) — exports `loadLegalContent(slug: string)`
- `components/shared/legal-page-layout.tsx` (new) — green hero band + markdown body
- `components/shared/signature-form.tsx` (new) — 3 underline-input rows

**Approach:**
- `loadLegalContent(slug)` reads `content/<slug>.md` synchronously via `fs.readFileSync(path.join(process.cwd(), "content", slug + ".md"), "utf8")`, runs through `gray-matter`, returns `{ data, content }`.
- `LegalPageLayout` accepts `{ data, content, children? }` props. Renders the green hero band (`bg-[#75876D]`, padded, with eyebrow + H1 + optional lead), then a white `SectionWrapper` with `max-w-3xl mx-auto space-y-12` body containing `<ReactMarkdown components={...}>{content}</ReactMarkdown>`, then optional `children` slot for page-specific TSX (used by `ip-overdrachtsverklaring` for `SignatureForm`).
- Component overrides in `LegalPageLayout` map every markdown node used across the 5 pages to the existing Tailwind classes. Full mapping below in Technical Design.
- `SignatureForm` is a leaf component — three `<p>` rows with `<span>` underlines using `border-b border-[#141414]/30`. Exact markup copied from the current `app/ip-overdrachtsverklaring/page.tsx` signature block.

**Technical design** (directional):
```tsx
// lib/content.ts
export function loadLegalContent(slug: string) {
  const filePath = path.join(process.cwd(), "content", `${slug}.md`);
  const file = fs.readFileSync(filePath, "utf8");
  return matter(file);  // { data, content }
}

// components/shared/legal-page-layout.tsx — component override map (sketch)
{
  h2: ({children}) => <h2 className="font-heading font-bold text-2xl text-[#141414] mb-4">{children}</h2>,
  h3: ({children}) => <h3 className="font-semibold text-[#141414] mb-2 mt-6">{children}</h3>,
  p:  ({children}) => <p className="text-[#141414]/70 text-[16px] leading-relaxed">{children}</p>,
  ul: ({children}) => <ul className="mt-4 space-y-2 list-none">{children}</ul>,
  li: ({children}) => <li className="flex items-start gap-2 text-[#141414]/70 text-[15px]"><span className="text-[#75876D] mt-1">•</span><span>{children}</span></li>,
  a:  ({href, children}) => <a href={href} className="text-[#75876D] underline hover:text-[#65775D]">{children}</a>,
  strong: ({children}) => <strong className="font-semibold text-[#141414]">{children}</strong>,
  table:  ({children}) => <div className="bg-[#EFE8E4] rounded-xl p-6 my-4"><table className="w-full text-[15px]">{children}</table></div>,
  td:     ({children}) => <td className="text-[#141414]/70 py-1 pr-4">{children}</td>,
  th:     ({children}) => <th className="font-semibold text-[#141414] text-left py-1 pr-4">{children}</th>,
}
```
This is directional guidance, not implementation specification — the implementer adjusts during execution.

**Test scenarios:**
- Verify `npm run build` succeeds with new deps installed and no page importing the new layout yet (no regression on existing pages).
- After installing deps and creating layout + helper + signature-form, run `npm run lint` — should pass (config-broken pre-existing issue notwithstanding; verify no NEW lint errors are introduced).
- Build-time: `LegalPageLayout` rendered with a one-line stub `.md` (placeholder if needed for verification only — does not get committed) produces the green hero + body without console warnings.
- No tests added — this is scaffolding with no behavior to exercise yet. Test expectation: behavioral validation is deferred to U2 via the privacybeleid migration, which exercises the full render path on real content.

**Verification:**
- `npm run build` exits 0
- `node_modules/{gray-matter,react-markdown}` present
- New files exist at listed paths

---

### U2. Migrate `privacybeleid` (template page)

**Goal:** First real migration. Uses every feature except H3 subheadings, table-as-card, and signature form. Validates the pattern.

**Requirements:** R1, R3, R4, R5, R8, R9, AE1, AE3

**Dependencies:** U1

**Files:**
- `content/privacybeleid.md` (new)
- `app/privacybeleid/page.tsx` (rewritten, ~15 lines)

**Approach:**
- Extract all 10 sections from the current `sections[]` array into `content/privacybeleid.md` body.
- Sections with `items[]` become markdown bullets (`- item`).
- The "Profilering" section's prose links become inline markdown links.
- The single styled "Lees onze cookieverklaring" CTA (the `link: { href, label }` block) becomes an inline link: `[Lees onze cookieverklaring](/cookieverklaring)` — visual delta: standardized link styling vs. the previous block-style link. Acceptable per origin R8.
- The "Contact en klachten" section's `contact: true` block becomes a markdown list:
  ```markdown
  ## Contact en klachten

  Heb je vragen over deze privacyverklaring of wil je gebruik maken van je rechten? Neem dan contact met ons op.

  - E-mail: [mail@letsdog.nl](mailto:mail@letsdog.nl)
  - Privacy: [privacy@letsdog.com](mailto:privacy@letsdog.com)
  - Telefoon: [085 744 4161](tel:0857444161)
  ```
- `app/privacybeleid/page.tsx` becomes:
  ```tsx
  import type { Metadata } from "next";
  import { LegalPageLayout } from "@/components/shared/legal-page-layout";
  import { loadLegalContent } from "@/lib/content";

  const { data, content } = loadLegalContent("privacybeleid");

  export const metadata: Metadata = {
    title: `${data.title} — Let's Dog`,
    description: data.description,
  };

  export default function Page() {
    return <LegalPageLayout data={data} content={content} />;
  }
  ```

**Test scenarios:**
- Covers AE1. Visual diff on `/privacybeleid` preview build matches current production for the green hero, the 10 H2 sections in order, bullet styling with green dots, and contact block links — only the source-of-truth differs.
- Covers AE3. Edit one line in `content/privacybeleid.md` (e.g., reword the "Wij verkopen je gegevens nooit aan derden" sentence). Build and check the rendered page reflects the edit. No `.tsx` change in the diff.
- Internal link to `/cookieverklaring` resolves and renders with brand-green underline.
- `mailto:` and `tel:` links in the contact block render correctly and clicking them invokes the OS handler.

**Verification:**
- Preview at `<branch>.website-letsdog.pages.dev/privacybeleid` renders without console errors
- Visual screenshot diff against current production is within the acceptable delta (link CTA standardized, otherwise identical)
- All section titles + body text + bullets + links preserved verbatim from the current `sections[]` array

---

### U3. Migrate `ai-gebruiksvoorwaarden` and `retour`

**Goal:** Two prose-and-bullets pages with very similar shape — batched into one unit since they exercise the same patterns U2 already proved.

**Requirements:** R1, R4, R5, R9

**Dependencies:** U1, U2

**Files:**
- `content/ai-gebruiksvoorwaarden.md` (new)
- `content/retour.md` (new)
- `app/ai-gebruiksvoorwaarden/page.tsx` (rewritten)
- `app/retour/page.tsx` (rewritten)

**Approach:**
- `ai-gebruiksvoorwaarden`: 7 H2 sections from the current `sections[]` array; the hardcoded "Vragen?" block at the end of the current `page.tsx` becomes the last `## Vragen?` markdown section. Frontmatter `lead: "Deze voorwaarden zijn van toepassing op het gebruik van de AI-gedragstrainer van Let's Dog."`.
- `retour`: similar to `privacybeleid` — sections with optional `items[]` become markdown bullets; the `contact: true` block becomes a markdown list. No `link` blocks. Frontmatter `lead:` set from current hero subhead if present.
- Both `page.tsx` files use the identical 15-line orchestration shape from U2.

**Test scenarios:**
- Preview render of `/ai-gebruiksvoorwaarden` matches current visual: green hero with eyebrow + H1 + lead, 7 H2 sections + Vragen? block.
- Preview render of `/retour` matches current visual including bullet list sections and contact block.
- Frontmatter `lead` value populates the white subhead under the H1 in the hero band.

**Verification:**
- `<branch>.website-letsdog.pages.dev/ai-gebruiksvoorwaarden` and `/retour` build and render without console errors
- Section text matches the current TSX `sections[]` content for both pages
- Contact info (mail / tel) in retour resolves to the same `mail@letsdog.nl` and `085 744 4161`

---

### U4. Migrate `cookieverklaring` (H3 subheadings + bewaartermijn table-as-card)

**Goal:** Migrate the page that exercises H3 subheadings (under "Welke cookies gebruiken we?") and the styled bewaartermijn card (rendered as a markdown table).

**Requirements:** R1, R3, R4, R7, R9, AE4

**Dependencies:** U1

**Files:**
- `content/cookieverklaring.md` (new)
- `app/cookieverklaring/page.tsx` (rewritten)

**Approach:**
- "Welke cookies gebruiken we?" H2 section contains three H3 subsections (Functionele / Analytische / Tracking cookies) in markdown body. The `h3` component override renders `font-semibold text-[#141414] mb-2 mt-6`.
- "Cookiegeschiedenis & bewaartermijnen" H2 section contains a markdown table:
  ```markdown
  | Cookie-type            | Bewaartermijn   |
  |------------------------|-----------------|
  | Functionele cookies    | Maximaal 1 jaar |
  | Analytische cookies    | Maximaal 2 jaar |
  ```
  The `table` component override wraps it in a `<div className="bg-[#EFE8E4] rounded-xl p-6">` and styles the table cells to look like the original card. Visual delta is acceptable per R7.
- "Cookies van derden" bullet list maps to standard markdown bullets.
- "Vragen?" block becomes the last `## Vragen?` markdown section.

**Test scenarios:**
- Covers AE4. Preview `/cookieverklaring` shows the bewaartermijn information grouped in a beige rounded box (matching the original card's `bg-[#EFE8E4]` styling). Content of the two-column grid is preserved.
- H3 subsections "Functionele cookies", "Analytische cookies", "Tracking cookies" render in the correct H2 parent group.
- "Cookies van derden" list shows 4 items with green-dot bullets.

**Verification:**
- `<branch>.website-letsdog.pages.dev/cookieverklaring` builds and renders without console errors
- Bewaartermijn content visible inside the beige card
- All 6 H2 sections present and ordered identically to current production

---

### U5. Migrate `ip-overdrachtsverklaring` (signature form edge case)

**Goal:** Migrate the page that needs the `SignatureForm` TSX component rendered after the markdown body.

**Requirements:** R1, R4, R6, AE2

**Dependencies:** U1

**Files:**
- `content/ip-overdrachtsverklaring.md` (new) — frontmatter includes `signature_form: true`
- `app/ip-overdrachtsverklaring/page.tsx` (rewritten)

**Approach:**
- All 7-or-so sections (including section 3 "Ondertekening" with `signature: true`) move to `content/ip-overdrachtsverklaring.md`. The body text of section 3 stays in markdown ("Vul onderstaande gegevens in en onderteken om de overdracht te bekrachtigen."); the form lines (Naam / Datum / Handtekening) are rendered by `SignatureForm` placed *after* the markdown body via `<LegalPageLayout>`'s `children` slot.
- `app/ip-overdrachtsverklaring/page.tsx`:
  ```tsx
  // ... standard imports + loadLegalContent ...
  import { SignatureForm } from "@/components/shared/signature-form";

  export default function Page() {
    return (
      <LegalPageLayout data={data} content={content}>
        {data.signature_form ? <SignatureForm /> : null}
      </LegalPageLayout>
    );
  }
  ```
- The signature form appears below all H2 sections (visual change: in the current TSX the form is *inside* section 3; in the new layout it's after the entire body). This is an acceptable visual delta — flag in PR description so Jur can decide on preview whether to keep it or move the section content around.

**Test scenarios:**
- Covers AE2. Preview `/ip-overdrachtsverklaring` shows the markdown body followed by the 3-line signature form (Naam / Datum / Handtekening, each with a ~12rem underlined input area).
- Section 3 ("Ondertekening") H2 + body text still renders in the markdown sequence.
- Form does not appear on the other 4 legal pages (no `signature_form` frontmatter).

**Verification:**
- `<branch>.website-letsdog.pages.dev/ip-overdrachtsverklaring` renders the signature form
- Visual diff vs. current production — form is positioned at the end of the page rather than inline with section 3 (call out in PR for Jur to review)
- All other 4 pages still build and do NOT render a signature form

---

## Acceptance Examples (Verification Mapping)

Tracing origin acceptance examples to plan coverage:

| Origin AE | Covered by |
|---|---|
| AE1 (visual parity diff) | U2 test scenarios; PR preview screenshot |
| AE2 (signature form present) | U5 test scenarios |
| AE3 (edit MD → preview reflects) | U2 test scenarios — explicit edit-and-rebuild verification |
| AE4 (bewaartermijn card preserved) | U4 test scenarios |

---

## Success Criteria

- All 5 pages render on the preview URL with content sourced from `content/*.md`
- Each migrated `page.tsx` is ≤ ~15 lines of orchestration
- Editing a line in any `content/<slug>.md` and rebuilding shows the change with zero `.tsx` diff
- No new ESLint errors introduced (existing lint config is broken on `main` — pre-existing issue, do not block on it per HANDOFF gotcha #6)
- `npm run build` exits 0 with all 5 pages statically generated

---

## Scope Boundaries

**In scope:**
- The 5 legal pages: `privacybeleid`, `ai-gebruiksvoorwaarden`, `cookieverklaring`, `retour`, `ip-overdrachtsverklaring`
- `gray-matter` + `react-markdown` dependency additions
- `content/`, `lib/content.ts`, `components/shared/legal-page-layout.tsx`, `components/shared/signature-form.tsx`
- Component-override styling that targets visual parity with current TSX

**Deferred for later** (per origin scope boundaries):
- Homepage (`app/page.tsx`) and the 6 marketing pages (`over-ons`, `prijzen`, `contact`, `veelgestelde-vragen`, `puppyagenda`, `hondenkeuze`)
- Re-evaluation of expansion after one month of actual editing usage

**Outside this product's identity** (per origin scope boundaries):
- CMS layer (Decap, Tina, Notion source)
- Live editing UI / admin route
- Multi-language content
- MDX (markdown-with-JSX-components)

**Deferred to Follow-Up Work:**
- ESLint v9 flat-config fix (pre-existing broken state per HANDOFF gotcha #6 — separate concern)
- Markdown lint / prettier config for `content/*.md` (nice-to-have, not blocking)

---

## Dependencies / Assumptions

- `gray-matter ^4.0.3` — MIT, no runtime cost, build-time only
- `react-markdown ^9.x` — MIT, React 19-compatible (verify exact version range during install)
- Tailwind v4 brand-color hex literals continue to work as `text-[#...]` arbitrary values (no Tailwind config change)
- Next 16 static export (`output: "export"`) tolerates `fs.readFileSync` at module scope in server components (standard Next pattern for static content)
- Cloudflare Pages preview build on `chore/markdown-content-refactor` branch will produce a working preview at `chore-markdown-content-refactor.website-letsdog.pages.dev` (or similar slug per the `branch.replace("/", "-")` rule)

---

## System-Wide Impact

- **Build process**: adds ~5 small `.md` reads at build time. Negligible build-time cost (sub-100ms).
- **Bundle size**: `react-markdown` is server-only (no client component imports it); no client bundle impact.
- **SEO**: `metadata` still populated via `next/Metadata` from frontmatter `title` + `description`. No change to crawl behavior or rendered HTML structure beyond the visual deltas noted in U2/U4/U5.
- **Analytics**: no impact — GA4 fires per-page on load; the rendered page structure preserves the same heading hierarchy.
- **Future-extensibility**: documented in U1/U2/U3 — adding a new legal page is `content/<slug>.md` + 15-line `app/<slug>/page.tsx` using the shared layout.

---

## Outstanding Questions

- None blocking. The `ip-overdrachtsverklaring` signature-form-position visual delta (form moves from inline-with-section-3 to bottom-of-page) is flagged in U5 for Jur to confirm on preview; if he wants the inline position back, the fix is to keep section 3 entirely in the page TSX rather than markdown — small follow-up, not a planning blocker.
