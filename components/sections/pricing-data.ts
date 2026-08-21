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
  // struck-through above the intro price on the yearly view. Purely visual, so
  // it stays inclusive of VAT.
  listPriceValue?: number;
  // Analytics (begin_checkout) — the shared item contract with the platform,
  // owned by docs/plans/2026-08-06-001-feat-ga4-platform-cutover-plan.md. GA4's
  // item-scoped reports join begin_checkout → purchase on `item_id`, so both
  // hosts must send these exact values. Kept beside ctaHref so a checkout swap
  // updates the tracked item in the same gesture (that coupling is why the SKU
  // change and the platform checkout link ship in one commit).
  itemId: "ld_maand" | "ld_jaar";
  itemName: string;
  itemVariant: string;
  // The consumer price, inclusive of VAT — display only.
  priceValue: number;
  // The same plan excluding 21% VAT: the revenue figure GA4 reports and Google
  // Ads bids on. Deliberately an explicit value rather than a division in the
  // component, so a reviewer sees both numbers side by side and the displayed
  // price can never move because an analytics value changed.
  priceValueExVat: number;
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
      "Weekplan op de leeftijd van je pup",
    ],
    ctaLabel: "Start Maandelijks",
    ctaHref: "https://mijn.letsdog.nl/checkout?plan=monthly",
    footerNote: "Maandelijks opzegbaar · geen restitutie",
    itemId: "ld_maand",
    itemName: "Maandabonnement",
    itemVariant: "Maand",
    priceValue: 19.99,
    priceValueExVat: 16.52,
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
      "Weekplan op de leeftijd van je pup",
      "Early Member status",
    ],
    ctaLabel: "Start Early Member Jaar",
    ctaHref: "https://mijn.letsdog.nl/checkout?plan=yearly",
    footerNote: "Pas na 7 dagen betalen · eerste jaar €59",
    highlighted: true,
    topBadge: "Meest gekozen",
    listPriceValue: 119,
    itemId: "ld_jaar",
    itemName: "Jaarabonnement",
    itemVariant: "Jaar",
    priceValue: 59,
    priceValueExVat: 48.76,
    billingPeriod: "yearly",
  },
];
