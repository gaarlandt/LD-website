"use client";

import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import type { Tier } from "./pricing-data";

// Client leaf so the <Pricing> cards stay server-rendered. Fires the GA4-native
// begin_checkout (dual-fired to PostHog) with the plan distinction (monthly vs
// yearly) before the click navigates to the external checkout.
export function PlanCTA({ tier }: { tier: Tier }) {
  return (
    <Button asChild variant={tier.highlighted ? "peach" : "secondary"} block pill>
      <a
        href={tier.ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackEvent("begin_checkout", {
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
          })
        }
      >
        {tier.ctaLabel}
      </a>
    </Button>
  );
}
