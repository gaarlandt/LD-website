import { describe, expect, it } from "vitest";

import { parsePrice } from "./structured-data";

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
