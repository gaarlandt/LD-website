import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for metadata routes under `output: export` (static export).
export const dynamic = "force-static";

// Canonical, indexable public + legal routes only — absolute apex URLs
// with trailing slash (trailingSlash: true). No redirects, no /card-styles
// (deleted), no 404. lastmod = the build/deploy date: the site rebuilds from
// main only when content changes, so this self-maintains instead of going
// stale like the prior hand-bumped constant did (it sat at 2026-05-30).
const LAST_MODIFIED = new Date().toISOString().slice(0, 10);

const ROUTES = [
  "/",
  "/rassenkeuze/",
  "/puppycursus/",
  "/prijzen/",
  "/over-ons/",
  "/veelgestelde-vragen/",
  "/contact/",
  "/algemene-voorwaarden/",
  "/privacybeleid/",
  "/ai-gebruiksvoorwaarden/",
  "/cookieverklaring/",
  "/retour/",
  "/modelformulier-herroeping/",
  "/veiligheidsdisclaimer/",
  "/ip-overdrachtsverklaring/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
