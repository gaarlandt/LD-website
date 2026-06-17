// Pricing tiers — the single source of truth for both the homepage pricing
// section and the /prijzen hero. Display strings live here; every *derived*
// figure (per-year total, savings %, per-month equivalent) is computed from
// `priceValue` in pricing-toggle-card.tsx so the numbers can never drift out
// of sync with the headline price. Pure data (no "use client") so it can be
// imported by both the server section and the client toggle card.

export type Tier = {
  key: "flex" | "early";
  name: string;
  cornerBadge: string;
  description: string;
  priceMain: string;
  priceUnit: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
  highlighted?: boolean;
  topBadge?: string;
  // Annual list price (the post-launch "Daarna €119/jaar" figure), rendered
  // struck-through above the intro price on the yearly view.
  listPriceValue?: number;
  // Analytics (begin_checkout) — kept beside ctaHref so a cutover product-ID
  // swap updates the tracked id in lockstep with the checkout link.
  productId: number;
  priceValue: number;
  billingPeriod: "monthly" | "yearly";
};

export const tiers: Tier[] = [
  {
    key: "flex",
    name: "Flexibel",
    cornerBadge: "Flexibel",
    description: "Maandelijks opzegbaar, geen jaarcontract, geen verplichting.",
    priceMain: "€19,99",
    priceUnit: "/maand",
    features: [
      "Volledige puppycursus",
      "Alle video's & checklists",
      "Let's dog Community",
    ],
    ctaLabel: "Start Maandelijks",
    ctaHref: "https://app.letsdog.nl/checkout/?add-to-cart=2109&quantity=1",
    footerNote: "Geen geld-terug-garantie · opzegbaar per maand",
    productId: 2109,
    priceValue: 19.99,
    billingPeriod: "monthly",
  },
  {
    key: "early",
    name: "Early Member",
    cornerBadge: "Best deal",
    description: "Volledige toegang, Early Member prijs zolang we lanceren.",
    priceMain: "€59",
    priceUnit: "/eerste jaar",
    features: [
      "Volledige puppycursus",
      "Alle video's & checklists",
      "Let's dog Community",
      "Early Member status",
    ],
    ctaLabel: "Claim Early Member Prijs",
    ctaHref: "https://app.letsdog.nl/checkout/?add-to-cart=2107&quantity=1",
    footerNote: "7 dagen geld-terug-garantie · eerste jaar €59",
    highlighted: true,
    topBadge: "Meest gekozen",
    listPriceValue: 119,
    productId: 2107,
    priceValue: 59,
    billingPeriod: "yearly",
  },
];
