// Build-time image optimization (in-repo, route B). Generates AVIF + WebP
// variants at responsive widths for the photographic sources in
// public/images/, into public/images/optimized/. Idempotent: skips outputs
// that already exist (pass --force to rebuild). Run after adding/changing a
// photo, then commit the generated variants:
//   npm run optimize:images
//
// The generated variants are committed so the Cloudflare static build never
// depends on sharp running in CI. The <picture> drop-in (OptimizedImage)
// serves these; the original JPEG stays as the universal <img> fallback.
import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "public", "images");
const OUT_DIR = path.join(SRC_DIR, "optimized");
mkdirSync(OUT_DIR, { recursive: true });

const WIDTHS = [384, 512, 768, 1280];
const FORMATS = [
  ["avif", { quality: 50 }],
  ["webp", { quality: 78 }],
];
const force = process.argv.includes("--force");

// Photographic JPEGs only. Skip filenames with spaces — a space breaks the
// srcset grammar (e.g. "NVGH Logo.jpeg" stays on next/image).
const sources = readdirSync(SRC_DIR).filter(
  (f) => /\.jpe?g$/i.test(f) && !/\s/.test(f),
);

let made = 0;
let skipped = 0;
for (const file of sources) {
  const name = file.replace(/\.[^.]+$/, "");
  const input = path.join(SRC_DIR, file);
  for (const w of WIDTHS) {
    for (const [ext, opts] of FORMATS) {
      const out = path.join(OUT_DIR, `${name}-${w}.${ext}`);
      if (!force && existsSync(out)) {
        skipped++;
        continue;
      }
      await sharp(input).resize({ width: w, withoutEnlargement: true })[ext](opts).toFile(out);
      made++;
    }
  }
}

console.log(
  `optimize-images: ${made} generated, ${skipped} skipped across ${sources.length} sources (--force to rebuild).`,
);
