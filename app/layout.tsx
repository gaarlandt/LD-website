import type { Metadata } from "next";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { Cookiebot } from "@/components/analytics/cookiebot";
import { GA4 } from "@/components/analytics/ga4";
import { CTATracker } from "@/components/analytics/cta-tracker";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  // Canonical host = apex letsdog.nl. metadataBase makes every relative
  // canonical / og:url resolve to an absolute apex URL. (www → apex 301
  // is a Cloudflare Redirect Rule added at cutover, not in code.)
  metadataBase: new URL(SITE_URL),
  title: "Let's Dog — Puppytraining die werkt",
  description:
    "Nieuwe pup thuis en totaal de kluts kwijt? Let's Dog geeft je een dagelijks plan, videolessen van gecertificeerde trainers en een community die je begrijpt.",
  keywords: ["puppytraining", "hondentraining", "puppy opvoeding", "hond training", "puppycursus"],
  // Fallback OG/Twitter block. Real pages set their own complete openGraph
  // (incl. a self-referential og:url) via lib/seo.ts → pageMetadata(); this
  // only applies to routes without their own metadata export (e.g. 404).
  openGraph: {
    title: "Let's Dog — Puppytraining die werkt",
    description:
      "Jouw pup begrijpen. Samen groeien. Videolessen, puppyagenda en community.",
    siteName: "Let's Dog",
    locale: "nl_NL",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={dmSans.variable}>
      <head suppressHydrationWarning>
        <Cookiebot />
      </head>
      <body className="bg-[#EFE8E4] text-[#141414] antialiased">
        <GA4 />
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
      </body>
    </html>
  );
}
