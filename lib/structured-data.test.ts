import { describe, expect, it } from "vitest";

import { faqPageLd, parsePrice } from "./structured-data";
import { partnersFaqs } from "../components/sections/partners/partners-faq-data";

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
