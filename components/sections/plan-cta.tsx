"use client";

import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import type { Tier } from "./pricing";

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
            value: tier.priceValue,
            billing_period: tier.billingPeriod,
            items: [
              {
                item_id: String(tier.productId),
                item_name: tier.name,
                item_category: "membership",
                price: tier.priceValue,
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
