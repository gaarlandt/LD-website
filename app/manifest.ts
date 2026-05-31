import type { MetadataRoute } from "next";

// Required for metadata routes under `output: export`.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Let's Dog — Puppytraining die werkt",
    short_name: "Let's Dog",
    description:
      "Puppytraining die werkt: een dagelijks plan, videolessen van gecertificeerde trainers en een community die je begrijpt.",
    start_url: "/",
    display: "standalone",
    background_color: "#EFE8E4",
    theme_color: "#75876D",
    lang: "nl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
