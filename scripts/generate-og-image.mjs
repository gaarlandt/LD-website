// Generates the default social-share image: public/og/og-default.jpg
// (1200×630). Brand hero photo, cover-cropped, with a bottom legibility
// gradient and the white Let's Dog wordmark. Re-run when the hero changes:
//   node scripts/generate-og-image.mjs
//
// HERO_SRC MOET hetzelfde bestand zijn als `components/sections/hero.tsx`
// rendert. Die koppeling is niet afdwingbaar vanuit een .mjs-script en is dan
// ook al een keer stilletjes gebroken: de hero ging naar family.jpeg terwijl
// dit script op hero.jpeg bleef staan, waardoor iedereen die de site deelde
// maandenlang een foto kreeg die nergens meer op de site voorkwam. Verander je
// de hero, verander dan deze regel en draai het script opnieuw.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "og");
mkdirSync(OUT_DIR, { recursive: true });

const W = 1200;
const H = 630;
const HERO_SRC = "family.jpeg"; // spiegelt components/sections/hero.tsx
const heroPath = path.join(ROOT, "public", "images", HERO_SRC);
const logoPath = path.join(ROOT, "public", "images", "logo-white.svg");
const outPath = path.join(OUT_DIR, "og-default.jpg");

// Transparent at the top, dark at the bottom — keeps the wordmark legible
// without hiding the photo.
const gradient = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="#141414" stop-opacity="0.12"/>
         <stop offset="55%" stop-color="#141414" stop-opacity="0.08"/>
         <stop offset="100%" stop-color="#141414" stop-opacity="0.72"/>
       </linearGradient>
     </defs>
     <rect width="${W}" height="${H}" fill="url(#g)"/>
   </svg>`,
);

const logo = await sharp(logoPath).resize({ width: 380 }).png().toBuffer();
const logoMeta = await sharp(logo).metadata();
const logoH = logoMeta.height ?? 110;

await sharp(heroPath)
  .resize(W, H, { fit: "cover", position: "centre" })
  .composite([
    { input: gradient, top: 0, left: 0 },
    { input: logo, top: H - logoH - 56, left: 64 },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(outPath);

console.log(`Wrote ${outPath} (${W}x${H})`);
