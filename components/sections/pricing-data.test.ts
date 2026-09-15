import { describe, it, expect } from "vitest";
import { tiers } from "./pricing-data";

// THE OTHER HALF OF A WATCHER THAT LIVES IN TWO REPOS (T-74 here, D-127 there).
// `ld_maand` / `ld_jaar` are a cross-repo contract with no single owner: this
// site sends them on AddToCart and add_to_cart, the platform on InitiateCheckout,
// begin_checkout and the server-side Purchase (`ITEM_ID_BY_PLAN` in its
// packages/core/src/pricing.ts), and Meta and GA4 join the funnel on them. Neither
// repo can import the other, so a rename on one side cuts the ladder in two
// without an error — only a report that stops adding up.
//
// The platform pins the same map in packages/core/src/pricing.test.ts, in the
// same shape as below ({ monthly, yearly }), so the two assertions read alike
// and a rename on either side goes red on that side. Whoever adds a third
// consumer (a Meta catalogue, a product set) counts again.
describe("the shared article ids (T-74, LDplatform D-127)", () => {
  it("pins ld_maand / ld_jaar per billing period, as the platform does", () => {
    const byPlan = Object.fromEntries(tiers.map((tier) => [tier.billingPeriod, tier.itemId]));
    expect(byPlan).toEqual({ monthly: "ld_maand", yearly: "ld_jaar" });
  });

  it("covers every tier, so a third tier cannot ship without an article id", () => {
    for (const tier of tiers) {
      expect(tier.itemId).toMatch(/^ld_[a-z]+$/);
    }
    expect(new Set(tiers.map((tier) => tier.billingPeriod)).size).toBe(tiers.length);
  });
});
