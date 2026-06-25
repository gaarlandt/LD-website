import { describe, expect, it } from "vitest";

import { buildEmbedUrl, KEUZEHULP_ORIGIN } from "./embed-url";

// U16 — the keuzehulp iframe URL builder (extracted from the rassenkeuze embed so
// it's unit-testable off the DOM). Mirrors app/rassenkeuze/rassenkeuze-embed.tsx.
describe("buildEmbedUrl", () => {
  it("empty search → fresh-quiz URL forcing source=website", () => {
    expect(buildEmbedUrl("")).toBe(`${KEUZEHULP_ORIGIN}/?source=website`);
  });

  it("strips an incoming source and forces source=website", () => {
    expect(buildEmbedUrl("?source=email")).toBe(`${KEUZEHULP_ORIGIN}/?source=website`);
  });

  it("forwards deep-link result params with source=website appended", () => {
    const url = new URL(buildEmbedUrl("?q1=a&q2=b"));
    expect(url.origin + url.pathname).toBe(`${KEUZEHULP_ORIGIN}/`);
    expect(url.searchParams.get("q1")).toBe("a");
    expect(url.searchParams.get("q2")).toBe("b");
    expect(url.searchParams.get("source")).toBe("website");
  });

  it("treats a leading '?' and no '?' identically", () => {
    expect(buildEmbedUrl("q1=a")).toBe(buildEmbedUrl("?q1=a"));
  });

  it("overrides (not duplicates) an incoming source among other params", () => {
    const url = new URL(buildEmbedUrl("?source=foo&q1=a"));
    expect(url.searchParams.getAll("source")).toEqual(["website"]);
    expect(url.searchParams.get("q1")).toBe("a");
  });
});
