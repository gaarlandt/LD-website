import { SITE_URL, SITE_NAME } from "@/lib/seo";

// Schema.org structured data builders. All @id/url/logo/sameAs use absolute
// apex URLs. Directional but mirrors the real, visible page content — keep
// in sync with what renders (Google penalises out-of-sync markup).

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export const SAME_AS = [
  "https://www.instagram.com/letsdogworld/",
  "https://www.tiktok.com/@letsdogworld6",
];

const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/images/logo-black.svg`,
  sameAs: SAME_AS,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "mail@letsdog.nl",
    telephone: "+31857444161",
    availableLanguage: ["Dutch"],
  },
};

const webSite = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: "nl-NL",
  publisher: { "@id": ORG_ID },
};

// Sitewide @graph (Organization + WebSite) injected from the root layout.
export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [organization, webSite],
};

type FaqEntry = { q: string; a: string };
type FaqCategory = { faqs: FaqEntry[] };

// FAQPage built from the rendered FAQ data — mirror the visible Q/A text.
export function faqPageLd(categories: FaqCategory[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: categories
      .flatMap((c) => c.faqs)
      .map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
  };
}

type PricingTier = { name: string; priceMain: string; description: string };

function parsePrice(s: string): string {
  // "€19,99" -> "19.99", "€59" -> "59.00"
  const n = parseFloat(s.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

// Product + Offers mirroring the visible pricing tiers (intro prices). No
// fabricated aggregateRating/Review.
export function productLd(tiers: PricingTier[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Let's Dog lidmaatschap",
    description:
      "Volledige puppycursus met videolessen, checklists, puppyagenda en de Let's Dog-community. Twee manieren om te starten.",
    brand: { "@type": "Brand", name: SITE_NAME },
    url: `${SITE_URL}/prijzen/`,
    offers: tiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      description: t.description,
      price: parsePrice(t.priceMain),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/prijzen/`,
    })),
  };
}

// Person (founder) for /over-ons/.
export function personLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Elien",
    jobTitle: "Gecertificeerde hondengedragstherapeut",
    description:
      "Oprichtster van Let's Dog en gecertificeerd hondengedragstherapeut.",
    worksFor: { "@id": ORG_ID },
    url: `${SITE_URL}/over-ons/`,
  };
}
