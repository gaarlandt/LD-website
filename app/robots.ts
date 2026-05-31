import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for metadata routes under `output: export` (static export).
export const dynamic = "force-static";

// Emitted as a real /robots.txt static asset at build time. This overrides
// Cloudflare Pages' managed content-signals robots.txt (which has no
// Sitemap line). Allow full crawling + point at the sitemap.
//
// Note: the *.pages.dev staging host should NOT be indexed pre-cutover.
// A static robots.txt can't vary by hostname, so that noindex is handled
// by a Cloudflare edge Header rule (X-Robots-Tag: noindex on *.pages.dev),
// documented in docs/CUTOVER.md and removed at cutover.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
