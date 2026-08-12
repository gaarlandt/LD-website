import { describe, expect, it } from "vitest";

import { resolveCtaDestination } from "./cta-destination";
import { tiers } from "@/components/sections/pricing-data";

// Extracted from components/analytics/cta-tracker.tsx so the attribution rules
// are testable off the DOM (same move as lib/prod-hosts.ts). These tests pin the
// four pre-existing destinations, so the extraction is provably behaviour-
// preserving, and add the mailto branch the tracker previously missed.
const SITE = "letsdog.nl";
const resolve = (href: string, current = SITE) =>
  resolveCtaDestination(new URL(href), current);

describe("resolveCtaDestination", () => {
  it("app host outside /checkout → app", () => {
    expect(resolve("https://app.letsdog.nl/dashboard")).toBe("app");
  });

  it("app host under /checkout → checkout, not app", () => {
    expect(resolve("https://app.letsdog.nl/checkout/2234")).toBe("checkout");
  });

  it("the platform host attributes like the app host, on both sides of the split", () => {
    // mijn.letsdog.nl replaced app.letsdog.nl at the 2026-08-12 cutover. Missing
    // it here is not a gap in coverage but a silent loss of attribution on every
    // checkout click, because the live pricing CTAs now point at this host only.
    expect(resolve("https://mijn.letsdog.nl/")).toBe("app");
    expect(resolve("https://mijn.letsdog.nl/checkout")).toBe("checkout");
  });

  it("every live pricing CTA href resolves to checkout, query string and all", () => {
    // Reads the REAL hrefs rather than copies of them. A literal here would keep
    // passing while someone edited pricing-data.ts, which is precisely the drift
    // that silently kills checkout attribution. The plan parameter lives in the
    // QUERY, not the path, so this also pins that the path-based split survives
    // a query string — the part most likely to break quietly.
    expect(tiers.length).toBeGreaterThan(0);
    for (const tier of tiers) {
      expect(resolve(tier.ctaHref)).toBe("checkout");
    }
  });

  it("keuzehulp and agenda hosts keep their own attribution", () => {
    expect(resolve("https://keuzehulp.letsdog.nl/")).toBe("keuzehulp");
    expect(resolve("https://agenda.letsdog.nl/")).toBe("agenda");
  });

  it("the checkout split is scoped to the app host, not any /checkout path", () => {
    // Pins the `destination === "app" &&` conjunct: without it, both of these
    // would be misattributed as "checkout".
    expect(resolve("https://keuzehulp.letsdog.nl/checkout")).toBe("keuzehulp");
    expect(resolve("https://letsdog.nl/checkout")).toBeUndefined();
  });

  it("same-site pricing links → pricing, with or without trailing slash", () => {
    expect(resolve("https://letsdog.nl/prijzen")).toBe("pricing");
    expect(resolve("https://letsdog.nl/prijzen/")).toBe("pricing");
  });

  it("same-site #prijzen anchor → pricing", () => {
    expect(resolve("https://letsdog.nl/#prijzen")).toBe("pricing");
  });

  it("mailto → email", () => {
    expect(resolve("mailto:creators@letsdog.nl")).toBe("email");
  });

  it("mailto resolves even though its hostname is empty", () => {
    // A mailto URL has no hostname under the WHATWG parser, so the branch has
    // to run before the host lookup — this is exactly what the tracker missed.
    const url = new URL("mailto:creators@letsdog.nl");
    expect(url.hostname).toBe("");
    expect(resolveCtaDestination(url, SITE)).toBe("email");
  });

  it("untracked same-site paths, foreign hosts and tel: stay silent", () => {
    expect(resolve("https://letsdog.nl/over-ons/")).toBeUndefined();
    expect(resolve("https://example.com/prijzen")).toBeUndefined();
    expect(resolve("tel:+31612345678")).toBeUndefined();
  });

  it("a pricing path on another host is not ours to attribute", () => {
    expect(resolve("https://someoneelse.nl/prijzen")).toBeUndefined();
  });
});
