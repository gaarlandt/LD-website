import { describe, it, expect, afterEach, vi } from "vitest";
import { trackEvent, trackMetaPageView } from "./analytics";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  serializeConsentPayload,
  type ConsentPayload,
} from "./consent";

// The Meta sink is verified by STUBBING fbq and asserting on the recorded
// arguments — never by looking for an outgoing request. fbevents.js stops
// emitting on repeat sends within a session, so every network-shaped check
// returns false negatives; the method and the day it cost us are written up in
// docs/solutions/developer-experience/verifying-a-tracking-pixel-fires-stub-fbq-not-network-reads.md.
// Stubbing is also the only half of the claim we own: "did Meta receive it" is
// Events Manager's question, not ours.

const EARLIER = "2026-08-12T10:00:00.000Z";
const LATER = "2026-08-12T10:30:00.000Z";

const cookieFor = (t: string, m: boolean): ConsentPayload => ({
  v: CONSENT_COOKIE_VERSION,
  t,
  p: false,
  s: true,
  m,
});

type Stubs = {
  /** what Cookiebot reports here; null = no response (never answered, or withdrawn) */
  cookiebot?: { t: string; m: boolean } | null;
  /** what the ld_consent handover cookie holds; null = no cookie */
  cookie?: ConsentPayload | null;
  gtag?: (...args: unknown[]) => void;
};

/** Returns the recorded fbq calls. */
function stubBrowser({ cookiebot = null, cookie = null, gtag }: Stubs): unknown[][] {
  const calls: unknown[][] = [];
  vi.stubGlobal("window", {
    Cookiebot: cookiebot
      ? {
          hasResponse: true,
          consent: {
            necessary: true,
            preferences: false,
            statistics: true,
            marketing: cookiebot.m,
          },
          consentUTC: cookiebot.t,
        }
      : undefined,
    fbq: (...args: unknown[]) => {
      calls.push(args);
    },
    gtag,
  });
  vi.stubGlobal("document", {
    cookie: cookie ? `${CONSENT_COOKIE_NAME}=${serializeConsentPayload(cookie)}` : "",
  });
  return calls;
}

// One real mapped event, with the shape plan-cta.tsx actually emits.
const CHECKOUT = {
  currency: "EUR",
  value: 48.76,
  billing_period: "yearly",
  items: [{ item_id: "ld_jaar", item_name: "Jaarabonnement", price: 48.76, quantity: 1 }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Meta sink reads BOTH consent writers, not Cookiebot alone", () => {
  // The bug this file was written for. Cookiebot here still reports the grant;
  // the visitor has since refused on mijn.letsdog.nl and that answer is already
  // in ld_consent, waiting a beat for ConsentSync to hand it over. A beacon sent
  // in that window cannot be recalled — which is why the send gate reads the
  // merged state, as the PostHog provider already does.
  it("does not send when the handover cookie carries a NEWER refusal", () => {
    const calls = stubBrowser({
      cookiebot: { t: EARLIER, m: true },
      cookie: cookieFor(LATER, false),
    });
    trackEvent("begin_checkout", CHECKOUT);
    expect(calls).toEqual([]);
  });

  it("does not fire Meta's PageView on that same newer refusal", () => {
    const calls = stubBrowser({
      cookiebot: { t: EARLIER, m: true },
      cookie: cookieFor(LATER, false),
    });
    trackMetaPageView();
    expect(calls).toEqual([]);
  });

  it("still sends when the cookie's refusal is OLDER than the grant here", () => {
    // Newest wins in both directions: a stale refusal is not a veto.
    const calls = stubBrowser({
      cookiebot: { t: LATER, m: true },
      cookie: cookieFor(EARLIER, false),
    });
    trackEvent("begin_checkout", CHECKOUT);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("track");
    expect(calls[0][1]).toBe("AddToCart");
  });

  it("keeps the unchanged happy path intact", () => {
    const calls = stubBrowser({ cookiebot: { t: EARLIER, m: true } });
    trackEvent("begin_checkout", CHECKOUT);
    trackMetaPageView();
    expect(calls).toEqual([
      [
        "track",
        "AddToCart",
        {
          currency: "EUR",
          value: 48.76,
          content_type: "product",
          content_ids: ["ld_jaar"],
          contents: [{ id: "ld_jaar", quantity: 1, item_price: 48.76 }],
          num_items: 1,
        },
      ],
      ["track", "PageView"],
    ]);
  });

  it("sends nothing on a refusal recorded here", () => {
    const calls = stubBrowser({ cookiebot: { t: EARLIER, m: false } });
    trackEvent("begin_checkout", CHECKOUT);
    trackMetaPageView();
    expect(calls).toEqual([]);
  });

  it("sends nothing when nobody has answered anywhere", () => {
    const calls = stubBrowser({});
    trackEvent("begin_checkout", CHECKOUT);
    trackMetaPageView();
    expect(calls).toEqual([]);
  });
});

// PINNED ON PURPOSE, NOT ENDORSED HERE. The merge is symmetric, so it also
// changes the GRANT direction: marketing granted on the platform while Cookiebot
// here has no answer at all now reads as granted, where before it read as
// refused. Whether a platform answer may stand in for a local banner answer is
// loop decision D-4 — the owner's call, and a legal one. Asserting it keeps the
// behaviour visible instead of incidental; if the answer is no, the fix is one
// line in lib/meta-consent.ts and these two expectations invert.
describe("the grant direction the merge also opens (D-4, owner's call)", () => {
  it("sends on a platform grant while Cookiebot here is still silent", () => {
    const calls = stubBrowser({ cookiebot: null, cookie: cookieFor(LATER, true) });
    trackEvent("begin_checkout", CHECKOUT);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe("AddToCart");
  });

  it("sends when the platform's grant is NEWER than a refusal here", () => {
    const calls = stubBrowser({
      cookiebot: { t: EARLIER, m: false },
      cookie: cookieFor(LATER, true),
    });
    trackMetaPageView();
    expect(calls).toEqual([["track", "PageView"]]);
  });
});

describe("the other sinks stay independent of the Meta gate", () => {
  it("fires GA4 even while Meta is suppressed by a newer refusal", () => {
    // "Each sink is guarded independently" is the chokepoint's contract; a
    // marketing refusal must not take statistics down with it.
    const gtag = vi.fn();
    const calls = stubBrowser({
      cookiebot: { t: EARLIER, m: true },
      cookie: cookieFor(LATER, false),
      gtag,
    });
    trackEvent("begin_checkout", CHECKOUT);
    expect(gtag).toHaveBeenCalledWith("event", "begin_checkout", CHECKOUT);
    expect(calls).toEqual([]);
  });

  it("never sends an unmapped event to Meta, consent or no consent", () => {
    const calls = stubBrowser({ cookiebot: { t: EARLIER, m: true } });
    trackEvent("cta_clicked", { link_destination: "checkout" });
    expect(calls).toEqual([]);
  });
});
