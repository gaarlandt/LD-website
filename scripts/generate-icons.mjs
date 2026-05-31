// Generates the app-icon set from the square brand dog-mark
// (public/images/icon-black.svg) on a white field. Re-run with:
//   node scripts/generate-icons.mjs
//
// Outputs:
//   app/apple-icon.png        180x180 apple-touch-icon (Next auto-wires)
//   public/favicon.ico        32x32 legacy favicon (PNG-in-ICO)
//   public/icons/icon-192.png 192x192 PWA icon (any + maskable safe zone)
//   public/icons/icon-512.png 512x512 PWA icon (any + maskable safe zone)
//
// The wordmark app/icon.svg stays the primary tab favicon (HANDOFF #5).
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MARK = path.join(ROOT, "public", "images", "icon-black.svg");
const BG = "#FFFFFF";

mkdirSync(path.join(ROOT, "public", "icons"), { recursive: true });

// Black mark centered on a full-bleed white square. markRatio leaves a
// safe-zone margin so the same image works as a maskable icon.
async function iconPng(size, markRatio) {
  const mark = await sharp(MARK, { density: 512 })
    .resize({ width: Math.round(size * markRatio) })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

// Minimal single-image ICO container wrapping a PNG (valid since Vista).
function pngToIco(pngBuf, w, h) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(w >= 256 ? 0 : w, 0);
  entry.writeUInt8(h >= 256 ? 0 : h, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, pngBuf]);
}

writeFileSync(path.join(ROOT, "public", "icons", "icon-192.png"), await iconPng(192, 0.6));
writeFileSync(path.join(ROOT, "public", "icons", "icon-512.png"), await iconPng(512, 0.6));
writeFileSync(path.join(ROOT, "app", "apple-icon.png"), await iconPng(180, 0.66));
writeFileSync(path.join(ROOT, "public", "favicon.ico"), pngToIco(await iconPng(32, 0.74), 32, 32));

console.log("Icons written: apple-icon.png, favicon.ico, icon-192.png, icon-512.png");
