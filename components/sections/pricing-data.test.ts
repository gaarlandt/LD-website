import { describe, it, expect } from "vitest";
import { parsePrice } from "@/lib/structured-data";
import { tiers } from "./pricing-data";

// One price lives in four fields per tier: the string the visitor reads
// (priceMain), the number the card derives its figures from (priceValue), the
// ex-VAT number GA4 and Meta receive (priceValueExVat), and — on both tiers —
// the footer note that repeats the amount. They are typed out separately on
// purpose (see the Tier type), so a price change that misses one of them ships
// a card that contradicts itself. That is what T-85 did to four fields at once.
describe("one price per tier, four fields that must agree (T-85)", () => {
  it("the visible price and the number the card calculates with are the same", () => {
    for (const tier of tiers) {
      expect(parsePrice(tier.priceMain)).toBe(tier.priceValue.toFixed(2));
    }
  });

  it("the measured value is the visible price excluding 21% VAT, to the cent", () => {
    for (const tier of tiers) {
      expect(tier.priceValueExVat).toBe(Math.round((tier.priceValue / 1.21) * 100) / 100);
    }
  });

  it("a footer note that names an amount names this tier's own price", () => {
    for (const tier of tiers) {
      if (tier.footerNote.includes("€")) {
        expect(tier.footerNote).toContain(tier.priceMain);
      }
    }
  });

  it("pins the month plan at €14,99 (LDplatform D-471, merged on the platform's switch day)", () => {
    const monthly = tiers.find((tier) => tier.billingPeriod === "monthly");
    expect(monthly?.priceMain).toBe("€14,99");
    expect(monthly?.priceValueExVat).toBe(12.39);
  });
});

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
