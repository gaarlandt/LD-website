---
title: "Subsetting National2 (OTF/TTF) to WOFF2 — recipe and coverage-verification method"
date: 2026-07-03
category: developer-experience
module: Typography / public/fonts
problem_type: performance_issue
component: build-tooling
symptoms:
  - "National2 loads as unsubset OTF/TTF — 3 preloaded weights totaling ~515KB on every page, blocking body-text render"
  - "No fonttools/brotli in the project or on a fresh machine — nothing to run `pyftsubset` with"
severity: medium
tags: [fonts, woff2, subsetting, fonttools, performance, national2, preload, self-hosted-fonts]
---

# Subsetting National2 to WOFF2

## Problem

National2 ships as unsubset OTF (Bold, Medium) and TTF (Regular) — the full glyph set the type
foundry delivered, not just the characters this site actually uses. Once National2 became the
sitewide body font (not just headings), all three weights are preloaded on every page load:
Regular 119KB + Medium 179KB + Bold 217KB ≈ 515KB, entirely blocking for first paint of visible
text. This was a known, already-flagged gap (`docs/plans/2026-05-30-...-spec-compliance-plan.md`
noted "National2 is unsubset OTF ⚠️" for headings-only, before body text made it sitewide).

## Solution

### 1. Get `fonttools` with WOFF2 support — isolated venv, no system Python pollution

```bash
python3 -m venv /path/to/scratch/fonttools-venv
/path/to/scratch/fonttools-venv/bin/pip install --quiet "fonttools[woff]" brotli
```

`brotli` (the Python module, not just the CLI — `brew install brotli` alone is not enough) is
required for WOFF2 output; without it `pyftsubset --flavor=woff2` fails. A throwaway venv avoids
fighting Homebrew Python's PEP 668 "externally-managed-environment" guard and needs no cleanup
beyond deleting the venv dir — this is a one-shot build tool, not a project dependency.

### 2. Determine the Unicode range — don't guess, extract from real content

Google Fonts' standard `latin` + `latin-ext` ranges cover all Western/Central European languages
including Dutch diacritics (ë, ï, ö, é, ...):

```
U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,
U+2122,U+2190-21FF,U+2200-22FF,U+FEFF,U+FFFD,U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,
U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF
```

(This already widens the stock `latin` set's Arrows/Math coverage from single codepoints — U+2191,
U+2193, U+2212 — to the full U+2190-21FF / U+2200-22FF blocks, so a future → or ≈ in copy doesn't
require another subsetting pass.)

**But don't stop at a "standard" range — verify against what the site actually renders.** Extract
every real non-ASCII codepoint from the live content first:

```python
import glob, os
chars = set()
for pattern in ["app/**/*.tsx", "app/**/*.ts", "components/**/*.tsx", "content/**/*.md"]:
    for p in glob.glob(pattern, recursive=True):
        if "node_modules" in p or "/.next/" in p: continue
        with open(p, encoding="utf-8") as f:
            chars |= {ord(c) for c in f.read() if ord(c) > 0x7E}
```

This is how the arrow (→, U+2192) gap surfaced here: it's outside the standard `latin` range's
single-codepoint arrow allowance, and grepping for it directly (`grep -rn "→" app/ components/`)
found 14 hits — which on inspection were **all inside `//` code comments**, never rendered. The
extraction step is what tells you whether a gap is real (renders on the page) or noise (only in
source comments) — don't trust a raw grep count alone.

### 3. Subset each weight to WOFF2

```bash
pyftsubset National2-Bold.otf \
  --output-file=National2-Bold.woff2 \
  --flavor=woff2 --unicodes="<range above>" --layout-features='*' \
  --recalc-bounds --recalc-timestamp
```

Repeat per weight, subsetting from whichever source file is already `@font-face`-registered (here:
Bold/Medium from `.otf`, Regular from `.ttf` — there's no Regular `.otf`). Results on this font:

| Weight | Original | WOFF2 | Reduction |
|---|---|---|---|
| Regular | 119 KB (TTF) | 31 KB | ~74% |
| Medium | 179 KB (OTF) | 29 KB | ~84% |
| Bold | 217 KB (OTF) | 31 KB | ~86% |

Total preloaded payload: ~515KB → ~92KB (~82% reduction).

### 4. Verify coverage — against the ORIGINAL font, not just your requested range

`pyftsubset` can only select glyphs that exist in the source font — it cannot invent ones. A
"missing glyph" after subsetting might mean your Unicode range excluded it, **or** it might mean
the original, unsubset font never had that glyph at all (common for bespoke display typefaces —
arrows/math symbols are often not part of the delivered glyph set). Distinguish the two before
"fixing" anything:

```python
from fontTools.ttLib import TTFont
original = TTFont("National2-Bold.otf").getBestCmap()
subset = TTFont("National2-Bold.woff2").getBestCmap()
# codepoint present in original but missing from subset → your range excluded it, widen it
# codepoint absent from BOTH → not a regression, the font never had it; CSS's fallback stack
# (font-family: "National2", ...,  sans-serif) already handles this per-glyph, silently,
# with or without subsetting
```

On this font: ±, →, ⇄, ≈ were absent from the **original** OTF/TTF too — subsetting changed
nothing about their (lack of) availability, and since none of them turned out to be rendered
outside code comments anyway, there was no user-visible gap to begin with.

### 5. Wire in as a fallback pair, not a replacement

```css
@font-face {
  font-family: "National2";
  src: url("/fonts/National2-Bold.woff2") format("woff2"),
       url("/fonts/National2-Bold.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

WOFF2 first (what every modern browser requests), OTF/TTF second as a fallback `src` for the rare
browser without WOFF2 — costs nothing extra since browsers only fetch the first format they
support, not every listed one. Keep the original OTF/TTF files on disk; they're both the fallback
target and the resubsetting source if content ever needs wider coverage.

**Update `preload()` to match** — preload the WOFF2 URL, not the OTF/TTF. Preloading a format the
browser won't actually request wastes the preload hint entirely (confirmed via
`performance.getEntriesByType('resource')` in the browser — only the WOFF2 files were fetched
after this change, zero fallback requests).

## Why This Matters

Subsetting-without-verification is exactly how a font ships broken for one specific character that
happens not to be in whatever "standard" range you picked — and the fix isn't "trust the standard
range," it's "extract what's actually used, and check the subsetted output against the *original*
font's own coverage before assuming a gap is a regression you introduced."

## When to Apply

- Any self-hosted, locally-registered `@font-face` (OTF/TTF) serving live user-facing text —
  especially once a display-only font (headings) becomes a body font too, since the payload now
  blocks first paint of most of the page's text, not just headings.
- Before adding a new weight or before content that might use a wider character set (a language
  other than Dutch/English, heavier symbol usage) — rerun the extraction step in §2, not just the
  existing Unicode range, since new content can introduce genuinely new gaps.

## Related

- `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md` — originally flagged unsubset
  OTF as a spec-compliance gap for headings only.
- CLAUDE.md "Fonts" line — documents the current National2-everywhere setup this subsetting builds
  on top of.
