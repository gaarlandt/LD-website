import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for metadata routes under `output: export` (static export).
export const dynamic = "force-static";

// Emitted as a real /robots.txt static asset at build time: allow full
// crawling + point at the sitemap.
//
// NOTE: this file does NOT silently override Cloudflare's "managed robots.txt"
// (AI Crawl Control / Security bot settings). When that setting is ON,
// Cloudflare PREPENDS a managed block (Content-Signal + AI-crawler Disallow
// rules) to this file at the edge. It was turned OFF at cutover (2026-07-02)
// so this file is the sole robots.txt source and LLM crawlers are welcome — if
// AI-bot Disallow rules reappear in the live robots.txt, re-check that toggle.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
