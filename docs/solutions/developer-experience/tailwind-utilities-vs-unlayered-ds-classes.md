---
title: Tailwind utilities can't override unlayered design-system (.ld-*) classes
date: 2026-06-01
category: developer-experience
module: Marketing site — design system styling (components/ui, app/ld-components.css)
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - Restyling a vendored DS component (Card/Badge/Button/Eyebrow/etc.) with a Tailwind utility in className
  - A Tailwind utility (padding, font-weight, bg, font-size) silently has no visible effect on a DS component
  - Deciding whether to override a DS component via className vs its variant props or the .ld-* CSS
tags: [tailwind-v4, cascade-layers, design-system, specificity, ld-components, css-layers]
---

# Tailwind utilities can't override unlayered design-system (.ld-*) classes

## Context

The DS token + component CSS is wired into the app like this:

- `app/globals.css` starts with `@import "tailwindcss";` — which registers Tailwind's cascade layers (`@layer theme, base, components, utilities`). All Tailwind utilities (`p-10`, `font-bold`, `bg-white`, `text-sm`, …) live in `@layer utilities`.
- `app/layout.tsx` then imports the DS CSS **after** globals and **without any `@layer` wrapper**:
  ```ts
  import "./globals.css";
  import "./ld-tokens.css";
  import "./ld-components.css";   // .ld-card, .ld-chip, .ld-btn … — all UNLAYERED
  ```

Because `.ld-*` rules are unlayered, they win the cascade against Tailwind utilities even though both are single-class selectors with equal specificity. So a utility you add in `className` to override a property the `.ld-*` class already sets does **nothing** — no error, no warning, it just silently keeps the DS value. This bit during the brand-guide v2 migration when sizing a `<Card>`'s padding and a `<Badge>`'s font-weight.

## Guidance

**A Tailwind utility cannot override a property a `.ld-*` class already sets.** It *can* set properties the `.ld-*` class leaves untouched.

To change a DS component's look, in order of preference:
1. Use the component's **variant props** (`<Card variant="beige">`, `<Button variant="ghost" pill>`, `<Badge tone="lime">`).
2. **Edit the `.ld-*` CSS** in `app/ld-components.css` (or the token in `app/ld-tokens.css`) if the change should apply everywhere.
3. Add utilities only for properties the `.ld-*` class does **not** set (layout, margins, `uppercase`, `tracking-*`, `shadow-[...]`, `whitespace-nowrap` — all fine).
4. Last resort: `!`-important utility (`!p-10`) — `!important` beats an unlayered normal declaration. Avoid; it's a smell.

## Why This Matters

This is the CSS cascade-layers spec, not a bug: **unlayered declarations always beat layered ones** when specificity is equal (the unlayered "context" is the highest-priority layer). Tailwind v4 puts utilities in `@layer utilities`; the DS CSS is unlayered, so the DS always wins. Source order is irrelevant here — even though `ld-components.css` is imported after Tailwind, that's not why it wins; the layer/no-layer distinction is. (Wrapping the DS import in its own `@layer` would flip this — but the DS layer is intentionally additive and left unlayered, so don't.)

The trap is that it fails **silently**: the build is green, TypeScript is happy, the className is "valid" — the utility just loses the cascade. You only catch it by inspecting computed styles.

## When to Apply

- Any time you reach for `className="p-…/font-…/bg-…/text-[size]"` on a `components/ui/*` DS component and expect it to win.
- When a DS component looks "stuck" at its default and your utility seems ignored — confirm with computed styles (`getComputedStyle(el).padding`) rather than assuming the class didn't apply.

## Examples

```tsx
// ❌ Silently ignored — .ld-card sets padding: var(--ld-s-5) (24px), unlayered → wins
<Card className="p-10">…</Card>          // still renders 24px
<Badge className="font-bold">…</Badge>   // .ld-chip sets font-weight:500 → stays 500

// ✅ Works — these properties are NOT set by .ld-chip, so the utility applies
<Badge tone="lime" className="uppercase tracking-widest shadow-[var(--ld-sh-3)]">…</Badge>

// ✅ Right way to change a DS-owned property: variant prop, or edit the .ld-* CSS
<Card variant="beige">…</Card>
```

Verify an override actually took effect:
```js
getComputedStyle(document.querySelector('.ld-card')).padding   // "24px" → your utility lost
```

## Related
- `docs/solutions/integration-issues/design-system-into-nextjs-static-export.md` — the broader DS-into-Next wiring (Radix Slot single-child, Phosphor `/dist/ssr`, next/font token binding, the additive-layer decision that this gotcha is a direct consequence of).
- `docs/solutions/developer-experience/react-markdown-needs-remark-gfm-for-tables.md` — another "build-green, silently-wrong" gotcha in the same codebase.
