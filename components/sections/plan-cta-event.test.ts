import { describe, it, expect } from "vitest";
import { toMetaEvent } from "@/lib/meta-events";
import { planCtaEvent } from "./plan-cta-event";
import { tiers } from "./pricing-data";

// Reads the REAL tiers, not copies: a literal here would keep passing while
// someone edited pricing-data.ts (same reasoning as lib/cta-destination.test.ts).
describe("the pricing CTA click (LDplatform D-473)", () => {
  it("is add_to_cart, never begin_checkout — the platform owns that one", () => {
    expect(tiers.length).toBeGreaterThan(0);
    for (const tier of tiers) {
      const [name] = planCtaEvent(tier);
      expect(name).toBe("add_to_cart");
      expect(name).not.toBe("begin_checkout");
    }
  });

  it("carries value, billing_period and the tier's own line item", () => {
    for (const tier of tiers) {
      const [, params] = planCtaEvent(tier);
      expect(params).toEqual({
        currency: "EUR",
        value: tier.priceValueExVat,
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
      });
    }
  });

  it("still reaches Meta as AddToCart with the shared article id", () => {
    // The failure U15 warns about: rename the call and not the MAPPINGS key, and
    // toMetaEvent returns null — no error, just no AddToCart. Running the real
    // tuple through the real mapper is the only test that sees both ends move.
    for (const tier of tiers) {
      const meta = toMetaEvent(...planCtaEvent(tier));
      expect(meta?.name).toBe("AddToCart");
      expect(meta?.params.content_ids).toEqual([tier.itemId]);
      expect(meta?.params.value).toBe(tier.priceValueExVat);
    }
  });
});
