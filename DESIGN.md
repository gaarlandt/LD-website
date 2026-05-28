# DESIGN.md — Let's Dog Marketing Website

## Color

### Strategy
**Committed** — sage brand green carries identity across large surfaces. Beige is the canvas. Dark green grounds key moments. Peach is the only true accent, used sparingly (≤8% of page area) for one job: the primary CTA and Early-Member emphasis.

### Tokens
| Token | Hex | Role |
|---|---|---|
| `sage` | `#75876D` | Brand green. Section grounds, CTA buttons, emphasis. |
| `forest` | `#162A0E` | Dark green. Footer, Final CTA section, grounding. |
| `sage-tint` | `#DFF0C3` | Soft green wash for check icons + small inline highlights. |
| `paper` | `#EFE8E4` | Warm beige canvas — primary page background. |
| `ink` | `#141414` | Body ink. Tinted toward green (use with opacity 0.85–1). |
| `peach` | `#FFA580` | One-job accent: primary CTA + best-deal pricing tier. |
| `peach-soft` | `#FFD9C6` | Peach wash, for hover states or subtle backgrounds only. |
| `cream` | `#FAF6F2` | Slightly-warmer-than-paper alt surface. Use for pricing cards on the beige canvas. |

### Rules
- Never pure white. Cards on beige use `#FAF6F2` (cream) or `#FFFFFF` only when they must read as "lifted" surfaces — and even then, prefer cream.
- Never pure black. Body ink is `#141414`, used at 0.55–1 opacity. Headings always 1.0.
- Peach is reserved. It carries the primary CTA and the "BEST DEAL" tier in pricing. Don't sprinkle it through icon badges, dividers, or decoration.
- Sage-tint (`#DFF0C3`) is *only* for inline check icons and brief inline highlights on dark surfaces. Not a background.

## Typography

### Families
- **Display:** National2 (local OTF). Weights 500 (Medium) and 700 (Bold) only. Used for h1, h2, h3 and large editorial pulls.
- **Body:** DM Sans (Google Fonts variable). Weights 300, 400, 500, 600. Used for everything else.

### Scale (mobile → desktop)
| Token | Mobile | Desktop | Use |
|---|---|---|---|
| `eyebrow` | 12px / 500 / DM Sans / tracking 0.18em uppercase | same | "PRIJZEN · TRANSPARANT" labels above heros |
| `display-xl` | 40px / 700 / National | 72px / 700 / National | Hero h1 |
| `display-lg` | 32px / 700 / National | 56px / 700 / National | Section h2 |
| `display-md` | 24px / 700 / National | 36px / 700 / National | Subsection h3, tier names |
| `lead` | 18px / 400 / DM Sans | 20px / 400 / DM Sans | Subheads under hero h1 |
| `body` | 16px / 400 / DM Sans / line-height 1.6 | 17px | Default running copy |
| `meta` | 14px / 400 / DM Sans / 0.85 opacity | same | Captions, footer text |
| `micro` | 13px / 500 / uppercase / 0.15em tracking | same | Tag pills, tier eyebrows |

### Rules
- Hierarchy through scale + weight contrast. Minimum 1.25 ratio between adjacent steps.
- Cap body line length at 65–72ch. Long-form sections may use 60ch for higher readability.
- No gradient text. No `background-clip: text`. Solid color only.
- Display headlines use `tracking-tight` (-0.015em). Body is normal tracking.

## Layout

### Spacing rhythm
Vary spacing intentionally. Don't apply the same vertical padding to every section.

| Section role | Mobile py | Desktop py |
|---|---|---|
| Hero (visual breathing room) | 96px top / 80px bottom | 140px top / 120px bottom |
| Editorial section | 72px | 112px |
| Compact (cards, lists) | 56px | 88px |
| Grounding (Final CTA, dark sections) | 80px | 128px |

### Container
- Wide editorial content: `max-w-[1180px]` (slightly narrower than the current `max-w-7xl` 1280px — makes display copy feel more deliberate).
- Long-form reading content: `max-w-[680px]`.
- Don't wrap every block in a container. Hero photography may bleed edge-to-edge.

### Cards
- Use only when "lifted surface" is the right affordance. Most sections don't need cards.
- When used: `bg-cream`, `border border-ink/8`, `rounded-3xl` (24px), `shadow-[0_8px_32px_-12px_rgba(20,20,20,0.08)]`.
- No glassmorphism. No `bg-white/60 backdrop-blur`.
- No side-stripe borders. No floating `-top-4` badges as "MOST POPULAR" cliches.

## Components & Patterns

### Buttons
- **Primary:** peach `#FFA580` background, ink `#141414` text, weight 600, py-3.5 px-7, rounded-full. Hover: peach darkens to `#ff9060`.
- **Secondary (light surface):** sage green `#75876D` text, 1.5px sage border, transparent bg. Hover: sage bg, white text.
- **Tertiary (dark surface):** white text, 1.5px white border @ 40% opacity. Hover: white bg, forest text.

### Eyebrow tag
For section-opening eyebrows: small pill, sage at 12% opacity background, sage text, uppercase, 0.15em tracking, py-1 px-3 rounded-full. Replace the current `text-white/60 uppercase` paragraph form.

### Section ground colors
- Default canvas: `paper` (`#EFE8E4`)
- Cream sections (for contrast): `cream` (`#FAF6F2`)
- Sage grounding (key moments): `sage` (`#75876D`) with white text
- Forest grounding (final CTA): `forest` (`#162A0E`) with white text

### Pricing tier card
- `bg-cream`, `border border-ink/8`, `rounded-3xl`, padding `p-8 lg:p-10`
- Tier name in display-md, eyebrow row above (tier label + optional badge)
- Price in 56px / National bold with currency symbol in 32px superscript style
- Feature list uses `space-y-3.5`, sage check icons
- Featured tier ("BEST DEAL"): same card shape, but `bg-sage` with white text + peach CTA. No floating badge. The badge sits inline in the eyebrow row.

## Motion

### Curves
Ease-out exponential only. Never bounce, never elastic.
- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- `--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)`

### Durations
- `--duration-fast: 150ms` — micro hovers (button color shifts)
- `--duration-base: 300ms` — element reveals, card hovers
- `--duration-slow: 600ms` — hero entrance, large-scale reveals

### Rules
- Never animate `layout` properties (width, height, top, left). Use `transform` and `opacity` only.
- Reveal-on-scroll lifts only 16px (not the current 24-32px). Subtler.
- No parallax. No magnetic cursors. No mouse-tracking gradients.

## Elevation
Used sparingly — most of the design is flat surfaces against canvas.
- `--shadow-soft: 0 8px 32px -12px rgba(20,20,20,0.08)` — cream cards
- `--shadow-grounded: 0 12px 48px -16px rgba(20,20,20,0.18)` — sage CTA card lifted off page
- No drop shadows on icons, buttons, or text.

## Imagery
- Real photography of real owners and pups, candid. No stock golden retrievers tilting heads.
- No saturated filters. Natural, slightly warm color grade.
- Composition leaves room for typographic overlay where used. Don't crop pups out of context.
- When a real photo isn't available, prefer a sage-paper texture, an illustrated mark, or empty space over a placeholder stock image.

## Absolute bans (from impeccable shared design laws)
- **No side-stripe borders.** Left/right colored stripes > 1px as accents.
- **No gradient text.**
- **No glassmorphism as default.**
- **No hero-metric template.** Big-number / small-label / supporting-stats / gradient-accent pattern.
- **No identical card grids.** Same-sized cards with icon + heading + text repeated endlessly.
- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses. Never `--` either.
- **Modal as first thought.** Use inline / progressive disclosure before reaching for a modal.

## Sources
- Brand colors and font choices: existing project (`components/sections/*`, `app/layout.tsx`, `public/fonts/`)
- Voice and audience: `CLAUDE.md`, `app/over-ons/page.tsx` (Elien's bio), `brand-guide-letsdog` skill
- Design language for the polish pass: impeccable skill, applied 2026-05-28
