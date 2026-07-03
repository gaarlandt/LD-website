import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";
import "./globals.css";
import "./ld-tokens.css";
import "./ld-components.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { Cookiebot } from "@/components/analytics/cookiebot";
import { GA4 } from "@/components/analytics/ga4";
import { CTATracker } from "@/components/analytics/cta-tracker";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { JsonLd } from "@/components/shared/json-ld";
import { siteGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  // Canonical host = apex letsdog.nl. metadataBase makes every relative
  // canonical / og:url resolve to an absolute apex URL. (www → apex 301
  // is a Cloudflare Redirect Rule added at cutover, not in code.)
  metadataBase: new URL(SITE_URL),
  title: "Let's dog — Rust en vertrouwen met je pup",
  description:
    "Nieuwe pup in huis en even de kluts kwijt? Let's dog geeft je week voor week een plan, videolessen van gecertificeerde trainers en een community die je begrijpt.",
  keywords: ["puppytraining", "hondentraining", "puppy opvoeding", "hond training", "puppycursus"],
  // Fallback OG/Twitter block. Real pages set their own complete openGraph
  // (incl. a self-referential og:url) via lib/seo.ts → pageMetadata(); this
  // only applies to routes without their own metadata export (e.g. 404).
  openGraph: {
    title: "Let's dog — Rust en vertrouwen met je pup",
    description:
      "Meer rust en vertrouwen, samen met je pup. Videolessen, puppyagenda en community.",
    siteName: "Let's dog",
    locale: "nl_NL",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#75876D",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Preload National2 (local OTF/TTF — next/font doesn't manage it, it's the
  // one typeface for both headings and body) so first paint doesn't FOUT.
  // Served at a stable /fonts/ URL the @font-face rules in globals.css match,
  // so each is one fetch. preload() (React 19) injects a single deduped
  // <link> into <head> — a raw <link> in <head> here gets double-emitted by
  // the App Router. All three weights are preloaded: Regular (400, body
  // copy) and Bold (700, headings + emphasis) are the two the design leans
  // on; Medium (500) also renders above the fold via `font-medium` on the
  // desktop nav links, so it's preloaded too rather than fetched on demand.
  preload("/fonts/National2-Regular.ttf", {
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  });
  preload("/fonts/National2-Medium.otf", {
    as: "font",
    type: "font/otf",
    crossOrigin: "anonymous",
  });
  preload("/fonts/National2-Bold.otf", {
    as: "font",
    type: "font/otf",
    crossOrigin: "anonymous",
  });

  return (
    <html lang="nl">
      <head suppressHydrationWarning>
        <Cookiebot />
      </head>
      <body className="bg-[#EFE8E4] text-[#141414] antialiased">
        <PostHogProvider>
          <GA4 />
          <JsonLd data={siteGraph} />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#75876D] focus:text-white focus:rounded-lg"
          >
            Ga naar inhoud
          </a>
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer />
          <WhatsAppButton />
          <CTATracker />
        </PostHogProvider>
      </body>
    </html>
  );
}
