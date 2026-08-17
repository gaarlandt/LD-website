import { describe, it, expect, afterEach, vi } from "vitest";
import posthog from "posthog-js";
import { trackEvent, trackMetaPageView, identifyLead } from "./analytics";
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

// =============================================================================
// T-46 — IDENTIFY ON THE DEVICE ID, NEVER ON THE EMAIL ADDRESS
// =============================================================================
// The reversal of 2026-08-17. Until then this site identified on the lowercased
// email, which the OLD identity contract prescribed — correct while this site had
// its own PostHog project, and wrong from the moment (2026-08-12) it started
// reporting into the platform's. Two hosts, one project, and an email address as
// `distinct_id` puts a personal datum in the shared space and in a `.letsdog.nl`
// cookie every host on the domain can read. Nobody decided that; it followed from
// a key switch.
//
// The join is not lost by this change — it never depended on the email. It runs
// on the shared `$device_id` in posthog-js's own cookie, which the platform
// adopts through the SDK's `bootstrap` option.
describe("identifyLead identifies on $device_id, not the email (T-46)", () => {
  const DEVICE_ID = "01a00426-4268-7b59-b8f4-b64054e143fc";

  type Identify = { id: unknown; props: unknown };

  /**
   * Returns the recorded posthog.identify calls.
   *
   * `deviceId` is read with `in` rather than a destructuring default on purpose:
   * passing `deviceId: undefined` explicitly TRIGGERS a default, and undefined is
   * exactly the value the real `get_property` returns when there is no device id.
   * A default here would silently hand the absent-id test a present id — which it
   * did, and the test caught it.
   */
  function stubPostHog(opts: { loaded?: boolean; deviceId?: unknown } = {}): Identify[] {
    const loaded = opts.loaded ?? true;
    const deviceId = "deviceId" in opts ? opts.deviceId : DEVICE_ID;
    const calls: Identify[] = [];
    Object.defineProperty(posthog, "__loaded", { value: loaded, configurable: true, writable: true });
    vi.spyOn(posthog, "get_property").mockImplementation((key: string) =>
      key === "$device_id" ? deviceId : undefined,
    );
    vi.spyOn(posthog, "identify").mockImplementation((id?: string, props?: unknown) => {
      calls.push({ id, props });
    });
    return calls;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the anonymous device id as the distinct id", () => {
    stubBrowser({ cookie: cookieFor(LATER, false) });
    const calls = stubPostHog();

    identifyLead("Jur@Example.NL");

    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe(DEVICE_ID);
  });

  // The regression this whole unit exists to prevent, stated as its own test so
  // it cannot be lost in a refactor of the one above: no call to identify may
  // carry the address as the IDENTIFIER, in any casing.
  it("never puts the email address in the distinct id", () => {
    stubBrowser({ cookie: cookieFor(LATER, false) });
    const calls = stubPostHog();

    identifyLead("Jur@Example.NL");

    expect(String(calls[0].id)).not.toContain("@");
  });

  // Statistics granted: the address may ride along as a person PROPERTY. That is
  // the "at most" the host register allows — a property on a person we already
  // hold, not the key we hold them by.
  it("keeps the email as a person property behind an explicit statistics yes", () => {
    // cookieFor() carries s: true; the cookie is the newest writer here.
    stubBrowser({ cookie: cookieFor(LATER, false) });
    const calls = stubPostHog();

    identifyLead("Jur@Example.NL", { form: "contact" });

    expect(calls[0].props).toEqual({ form: "contact", email: "jur@example.nl" });
  });

  // No explicit yes — legitimate interest covers MEASURING, not storing an
  // identifier for somebody who never agreed to it. The identify still happens
  // (the device id is ours to hold); the address does not travel.
  it("drops the email when statistics was refused", () => {
    stubBrowser({ cookie: { ...cookieFor(LATER, false), s: false } });
    const calls = stubPostHog();

    identifyLead("Jur@Example.NL", { form: "contact" });

    expect(calls).toHaveLength(1);
    expect(calls[0].props).toEqual({ form: "contact" });
  });

  it("drops the email when nobody has answered anywhere", () => {
    stubBrowser({});
    const calls = stubPostHog();

    identifyLead("Jur@Example.NL");

    expect(calls[0].props).toEqual({});
  });

  // Without a device id there is nothing safe to identify ON, and the tempting
  // fallback — get_distinct_id() — is exactly the wrong one: after any earlier
  // identify it returns whatever we identified AS, which for anyone carrying the
  // pre-2026-08-17 state is their email address. So: do nothing.
  it("does nothing when there is no device id to identify on", () => {
    stubBrowser({ cookie: cookieFor(LATER, false) });
    const calls = stubPostHog({ deviceId: undefined });

    identifyLead("Jur@Example.NL");

    expect(calls).toEqual([]);
  });

  it("does nothing before PostHog has loaded", () => {
    stubBrowser({ cookie: cookieFor(LATER, false) });
    const calls = stubPostHog({ loaded: false });

    identifyLead("Jur@Example.NL");

    expect(calls).toEqual([]);
  });
});
