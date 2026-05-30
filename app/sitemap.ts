import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for metadata routes under `output: export` (static export).
export const dynamic = "force-static";

// Canonical, indexable public + legal routes only — absolute apex URLs
// with trailing slash (trailingSlash: true). No redirects, no /card-styles
// (deleted), no 404. A single honest lastmod avoids churning the file on
// every build; bump it when site content materially changes.
const LAST_MODIFIED = "2026-05-30";

const ROUTES = [
  "/",
  "/rassenkeuze/",
  "/puppyagenda/",
  "/prijzen/",
  "/over-ons/",
  "/veelgestelde-vragen/",
  "/contact/",
  "/privacybeleid/",
  "/ai-gebruiksvoorwaarden/",
  "/cookieverklaring/",
  "/retour/",
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
