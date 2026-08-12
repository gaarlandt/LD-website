import type { MetadataRoute } from "next";

// Required for metadata routes under `output: export`.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Let's dog — Rust en vertrouwen met je pup",
    short_name: "Let's dog",
    description:
      "Rust en vertrouwen met je pup: week voor week een plan, videolessen van gecertificeerde trainers en een agenda die meeloopt met zijn leeftijd.",
    start_url: "/",
    display: "standalone",
    background_color: "#EFE8E4",
    theme_color: "#75876D",
    lang: "nl",
    // icon-512.png deliberately serves both `any` and `maskable`: generate-icons.mjs
    // composites the brand mark at markRatio 0.6 on a full-bleed opaque white field,
    // so the mark stays inside the maskable safe zone (no separate maskable asset needed).
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
