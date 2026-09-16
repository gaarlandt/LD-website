import { describe, expect, it } from "vitest";

import { faqPageLd, parsePrice, productLd } from "./structured-data";
import { partnersFaqs } from "../components/sections/partners/partners-faq-data";
import { tiers } from "../components/sections/pricing-data";

// U16 — parsePrice normalizes the visible pricing strings into schema.org
// Offer.price decimals (mirrors the Product/Offers JSON-LD on /prijzen).
describe("parsePrice", () => {
  it("parses a comma-decimal euro price", () => {
    expect(parsePrice("€19,99")).toBe("19.99");
  });

  it("pads a whole-euro price to two decimals", () => {
    expect(parsePrice("€59")).toBe("59.00");
  });

  it("non-numeric (e.g. 'Gratis') → 0.00", () => {
    expect(parsePrice("Gratis")).toBe("0.00");
  });
});

// The Product/Offer markup on /prijzen is built from the REAL tiers, so Google
// reads the same prices the card shows. Offer.price is what a search result can
// quote, so it is pinned per plan (T-85: the month plan went to €14,99).
describe("productLd (prijzen)", () => {
  it("offers exactly the visible tiers, at their visible prices", () => {
    const ld = productLd(tiers);
    expect(ld.offers.map((o) => [o.name, o.price])).toEqual([
      ["Flexibel", "14.99"],
      ["Early Member", "59.00"],
    ]);
  });
});

// U5 — the /partners FAQPage markup is built from the same array the visible
// accordion renders. These tests are what makes that contract enforceable:
// edit one side only and the suite fails.
describe("faqPageLd (partners)", () => {
  it("emits one Question per partners FAQ entry", () => {
    const ld = faqPageLd([{ faqs: partnersFaqs }]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(partnersFaqs.length);
  });

  it("mirrors each visible question and answer verbatim", () => {
    const ld = faqPageLd([{ faqs: partnersFaqs }]);
    partnersFaqs.forEach(({ q, a }, i) => {
      expect(ld.mainEntity[i].name).toBe(q);
      expect(ld.mainEntity[i].acceptedAnswer.text).toBe(a);
    });
  });

  it("no categories → empty mainEntity rather than a throw", () => {
    expect(faqPageLd([]).mainEntity).toEqual([]);
  });
});
