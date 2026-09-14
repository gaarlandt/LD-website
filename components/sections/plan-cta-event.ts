// The event a pricing tier CTA fires, as [name, params] — the only place the
// NAME lives. Split out of plan-cta.tsx for the same reason lib/cta-event-params.ts
// was split out of the CTA tracker: this repo's Vitest runs in the Node
// environment, so an onClick body is unreachable from a test, and a name that
// can only be read inside a click handler is a name nothing guards.
//
// WHY add_to_cart AND NOT begin_checkout (LDplatform D-473, 2026-09-14).
// Until then this click sent begin_checkout, and the platform sent it again on
// arrival at its checkout — so Google counted two begin_checkouts for everyone
// who came through letsdog.nl. The click is intent, not arrival: the platform
// is the only host that can see a real checkout, for every way in, so it keeps
// begin_checkout and this host renamed. Meta already drew the line in the same
// place (AddToCart here, InitiateCheckout there — D-101), so Google and Meta
// now describe this click the same way.
//
// THE META SINK KEYS ON THIS NAME. trackEvent fans out through toMetaEvent(name)
// in lib/meta-events.ts, and an unknown name returns null there without a
// sound — rename the event here without renaming its MAPPINGS key and the site
// stops sending AddToCart, with every gate still green. The test beside this
// file runs the real tuple through the real mapper for exactly that reason.
import type { Tier } from "./pricing-data";

export function planCtaEvent(tier: Tier) {
  return [
    "add_to_cart",
    {
      currency: "EUR",
      // Revenue excluding VAT, not the consumer price: Google Ads bids on
      // this number, and the platform's `purchase` reports the same basis.
      value: tier.priceValueExVat,
      // Event-level, and NOT replaced by item_variant — the two live side
      // by side and `billing_period` is the older registered dimension.
      billing_period: tier.billingPeriod,
      items: [
        {
          item_id: tier.itemId,
          item_name: tier.itemName,
          item_variant: tier.itemVariant,
          item_category: "abonnement",
          price: tier.priceValueExVat,
          quantity: 1,
        },
      ],
    },
  ] as const;
}
