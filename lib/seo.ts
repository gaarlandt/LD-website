import type { Metadata } from "next";

// Canonical host = apex letsdog.nl (decided 2026-05-30; matches current
// indexing). The site uses trailingSlash: true, so every `path` passed
// here MUST end in a trailing slash ("/prijzen/", "/" for the homepage).
// Relative canonical/og URLs resolve against metadataBase (set in the
// root layout) to absolute apex URLs.
export const SITE_URL = "https://letsdog.nl";
export const SITE_NAME = "Let's Dog";

// Default social-share image (1200×630). Lives in /public/og/. Wired into
// every page's openGraph + twitter so shares never fall back to nothing.
export const OG_IMAGE = {
  url: "/og/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "Let's Dog — puppytraining die werkt",
};

/**
 * Build a complete per-page Metadata object: title, description, a
 * self-referential canonical, and a full openGraph + twitter block
 * (image included). Returning everything each page needs avoids relying
 * on Next's layout→page metadata merge for openGraph/twitter, which is
 * what produced the "og:url = homepage on every page" bug.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "nl_NL",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
