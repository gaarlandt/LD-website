import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_EVENT_PARAMS,
  buildCtaEventParams,
  type CtaLinkParams,
} from "./cta-event-params";
import {
  MARKETING_PARAMS,
  STATISTICS_PARAMS,
  type AttributionParamName,
  type AttributionPayload,
} from "./attribution";

// The four params the tracker has always sent. Every case below asserts these
// come through untouched: `link_location` and `link_destination` are registered
// GA4 custom dimensions, so the campaign params are only safe to add if they
// provably cannot disturb them.
const LINK: CtaLinkParams = {
  link_url: "https://mijn.letsdog.nl/checkout?plan=ld_maand",
  link_text: "Start vandaag",
  link_location: "navbar",
  link_destination: "checkout",
};

/** A stored ld_attribution record, as readAttributionCookie() returns one. */
const stored = (params: Partial<Record<AttributionParamName, string>>): AttributionPayload => ({
  v: 1,
  t: "2026-08-12T09:00:00.000Z",
  ...params,
});

function expectLinkParamsIntact(result: Record<string, unknown>) {
  expect(result.link_url).toBe(LINK.link_url);
  expect(result.link_text).toBe(LINK.link_text);
  expect(result.link_location).toBe("navbar");
  expect(result.link_destination).toBe("checkout");
}

describe("buildCtaEventParams", () => {
  it("carries all three utm params from a full record", () => {
    const result = buildCtaEventParams(
      LINK,
      stored({ utm_source: "facebook", utm_medium: "cpc", utm_campaign: "puppy-zomer" }),
    );

    expect(result).toEqual({
      ...LINK,
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "puppy-zomer",
    });
    expectLinkParamsIntact(result);
  });

  it("carries only what the record holds — absent keys are omitted, not blank", () => {
    // The half-tagged link is the normal case, not an edge case: plenty of ads
    // carry a source and a campaign and no medium. An empty string here would be
    // a GA4 dimension value of "" on the busiest event on the site.
    const result = buildCtaEventParams(
      LINK,
      stored({ utm_source: "google", utm_campaign: "merk" }),
    );

    expect(result).toEqual({ ...LINK, utm_source: "google", utm_campaign: "merk" });
    expect(result).not.toHaveProperty("utm_medium");
    expectLinkParamsIntact(result);
  });

  it("sends the four link params and nothing else when there is no record", () => {
    // null is what readAttributionCookie() returns for the majority of visits:
    // no campaign, or consent already withdrew the record.
    const result = buildCtaEventParams(LINK, null);

    expect(result).toEqual(LINK);
    for (const name of CAMPAIGN_EVENT_PARAMS) expect(result).not.toHaveProperty(name);
    expectLinkParamsIntact(result);
  });

  it("sends no campaign when consent narrowed the utm params out of the record", () => {
    // A visitor who refused STATISTICS but allows marketing: narrowStoredToConsent
    // has stripped the utm set and left the Meta click id. The event must not
    // reintroduce campaign attribution for someone who refused to be measured —
    // this is the case the whole "read the cookie, not the URL" rule exists for.
    const result = buildCtaEventParams(LINK, stored({ fbclid: "IwAR-abc123" }));

    expect(result).toEqual(LINK);
    expectLinkParamsIntact(result);
  });

  it("sends no campaign for a bare envelope", () => {
    // {v,t} with nothing in it — the shape a record takes on its way to deletion.
    const result = buildCtaEventParams(LINK, stored({}));

    expect(result).toEqual(LINK);
    expectLinkParamsIntact(result);
  });

  it("never widens past the three names, whatever else the record carries", () => {
    // The record holds all seven; this event takes three. utm_term/utm_content
    // are a cardinality decision nobody has taken, and fbclid would cross a gate
    // — it rides on MARKETING, not statistics.
    const result = buildCtaEventParams(
      LINK,
      stored({
        utm_source: "facebook",
        utm_medium: "cpc",
        utm_campaign: "puppy-zomer",
        utm_term: "puppy training",
        utm_content: "variant-b",
        gclid: "Cj0KCQ",
        fbclid: "IwAR-abc123",
      }),
    );

    expect(Object.keys(result).sort()).toEqual(
      [...Object.keys(LINK), ...CAMPAIGN_EVENT_PARAMS].sort(),
    );
    for (const name of ["utm_term", "utm_content", "gclid", "fbclid"]) {
      expect(result).not.toHaveProperty(name);
    }
    expectLinkParamsIntact(result);
  });

  it("drops a value that is present but empty", () => {
    const result = buildCtaEventParams(LINK, stored({ utm_source: "facebook", utm_medium: "" }));

    expect(result).toEqual({ ...LINK, utm_source: "facebook" });
    expect(result).not.toHaveProperty("utm_medium");
  });

  it("leaves a body/pricing click's own dimensions alone too", () => {
    // Same assertion from the other end of both registered dimensions, so a
    // merge that clobbered them could not pass by only ever being tested against
    // one value.
    const body: CtaLinkParams = {
      link_url: "https://letsdog.nl/prijzen",
      link_text: "Bekijk prijzen",
      link_location: "body",
      link_destination: "pricing",
    };
    const result = buildCtaEventParams(body, stored({ utm_source: "nieuwsbrief" }));

    expect(result).toEqual({ ...body, utm_source: "nieuwsbrief" });
  });
});

describe("the campaign params on cta_clicked", () => {
  it("are exactly utm_source, utm_medium and utm_campaign", () => {
    // Pinned so widening the payload has to be a deliberate edit here, with the
    // GA4 custom-dimension registration that goes with it.
    expect([...CAMPAIGN_EVENT_PARAMS]).toEqual(["utm_source", "utm_medium", "utm_campaign"]);
  });

  it("all ride on STATISTICS consent, none on MARKETING", () => {
    // The reason reading the stored record is enough: everything on this list is
    // removed from that record when the statistics gate closes. A name that rode
    // on marketing would need its own gate and could not be sourced this way.
    for (const name of CAMPAIGN_EVENT_PARAMS) {
      expect(STATISTICS_PARAMS).toContain(name);
      expect(MARKETING_PARAMS).not.toContain(name);
    }
  });
});
