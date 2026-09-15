"use client";

import { Button } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import { planCtaEvent } from "./plan-cta-event";
import type { Tier } from "./pricing-data";

// Client leaf so the <Pricing> cards stay server-rendered. Fires the GA4-native
// add_to_cart (dual-fired to PostHog, mapped to Meta's AddToCart) with the plan
// distinction (monthly vs yearly) before the click navigates to the external
// checkout. The name and payload live in plan-cta-event.ts, which says why this
// is add_to_cart and not begin_checkout.
export function PlanCTA({ tier }: { tier: Tier }) {
  return (
    <Button asChild variant={tier.highlighted ? "peach" : "secondary"} block pill>
      <a
        href={tier.ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent(...planCtaEvent(tier))}
      >
        {tier.ctaLabel}
      </a>
    </Button>
  );
}
