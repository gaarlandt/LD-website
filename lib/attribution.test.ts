import { describe, it, expect, afterEach, vi } from "vitest";
import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_COOKIE_VERSION,
  ATTRIBUTION_MAX_LENGTH,
  ATTRIBUTION_URL_PARAMS,
  MARKETING_PARAMS,
  STATISTICS_PARAMS,
  applyConsentToStored,
  attributionCookieDomain,
  buildAttributionCookie,
  buildAttributionDeletion,
  consentedParams,
  createAttributionRecorder,
  effectiveConsent,
  hasAnyParam,
  isSameAttribution,
  narrowStoredToConsent,
  parseAttributionPayload,
  readAttributionCookie,
  readAttributionParams,
  recordFirstTouch,
  serializeAttributionPayload,
  type AttributionPayload,
} from "./attribution";
import { buildConsentCookie, type ConsentPayload } from "./consent";

/** A consent state as Cookiebot would report it, or as ld_consent records it. */
const choice = (t: string, s: boolean, m: boolean): ConsentPayload => ({ v: 1, t, p: false, s, m });

const GRANT_ALL = choice("2026-08-05T00:00:00.000Z", true, true);
const REFUSE_ALL_OLD = choice("2026-08-01T00:00:00.000Z", false, false);

const ALL_GATES = { s: true, m: true };
const STATS_ONLY = { s: true, m: false };
const MARKETING_ONLY = { s: false, m: true };
const NO_GATES = { s: false, m: false };

// Same jar stub as consent.test.ts: the repo's Vitest runs in the Node
// environment on purpose, so the cookie writers get a `document` without jsdom.
// Reads return every stored pair; a Max-Age=0 write deletes rather than stores.
function stubCookieJar() {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  vi.stubGlobal("document", {
    get cookie() {
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(raw: string) {
      writes.push(raw);
      const pair = raw.split(";")[0];
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      if (/Max-Age=0\b/.test(raw)) jar.delete(name);
      else jar.set(name, pair.slice(eq + 1));
    },
  });
  return { writes };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// These assertions are the contract with the platform, not a style preference.
// The platform reads a fixed allowlist and ignores everything outside it without
// a word, so a rename here does not surface as an error — it surfaces as an
// empty column. Pinned in a test that has to be edited on purpose.
describe("the ld_attribution contract", () => {
  it("is named ld_attribution at version 1", () => {
    expect(ATTRIBUTION_COOKIE_NAME).toBe("ld_attribution");
    expect(ATTRIBUTION_COOKIE_VERSION).toBe(1);
  });

  it("carries exactly the platform's seven parameter names, byte for byte", () => {
    // Byte-identical to ATTRIBUTION_URL_PARAMS in the platform's
    // apps/app/src/lib/attribution.types.ts, in the same order.
    expect([...ATTRIBUTION_URL_PARAMS]).toEqual([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ]);
  });

  it("splits those seven across two consent gates, not one", () => {
    expect([...STATISTICS_PARAMS]).toEqual([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
    ]);
    expect([...MARKETING_PARAMS]).toEqual(["fbclid"]);
  });

  it("truncates at 200, the same limit as the platform's database CHECK", () => {
    expect(ATTRIBUTION_MAX_LENGTH).toBe(200);
  });

  it("round-trips through URL-encoded JSON", () => {
    const payload: AttributionPayload = {
      v: 1,
      t: "2026-08-11T09:15:00.000Z",
      utm_source: "facebook",
      fbclid: "IwAR0abc",
    };
    expect(parseAttributionPayload(serializeAttributionPayload(payload))).toEqual(payload);
  });

  it("URL-encodes, so a value with a separator cannot break the cookie", () => {
    const serialised = serializeAttributionPayload({
      v: 1,
      t: "2026-08-11T09:15:00.000Z",
      utm_campaign: "zomer; actie=1",
    });
    expect(serialised).not.toContain(";");
    expect(parseAttributionPayload(serialised)?.utm_campaign).toBe("zomer; actie=1");
  });

  it("writes Domain=.letsdog.nl on a Let's dog host and omits it elsewhere", () => {
    expect(attributionCookieDomain("letsdog.nl")).toBe(".letsdog.nl");
    expect(attributionCookieDomain("mijn.letsdog.nl")).toBe(".letsdog.nl");
    expect(attributionCookieDomain("feat-x.website-letsdog.pages.dev")).toBeNull();

    const payload: AttributionPayload = { v: 1, t: "2026-08-11T09:15:00.000Z", gclid: "abc" };
    expect(buildAttributionCookie(payload, "letsdog.nl")).toContain("Domain=.letsdog.nl");
    expect(buildAttributionCookie(payload, "localhost")).not.toContain("Domain=");
  });

  it("carries the contract's cookie attributes", () => {
    const cookie = buildAttributionCookie(
      { v: 1, t: "2026-08-11T09:15:00.000Z", gclid: "abc" },
      "letsdog.nl",
    );
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    // No `location` in the Node test env, so the https branch is the one taken.
    expect(cookie).toContain("Secure");
  });

  it("sets a 90-day Max-Age, so a click today still counts at next week's checkout", () => {
    // Pinned by magnitude, not just by shape: `Max-Age=\d+` also passes for 1.
    // The window is a decision (Meta's own click window is 7 days), so shortening
    // it should mean editing this line on purpose.
    const cookie = buildAttributionCookie(
      { v: 1, t: "2026-08-11T09:15:00.000Z", gclid: "abc" },
      "letsdog.nl",
    );
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 90}`);
  });

  it("rejects anything that is not a well-formed record", () => {
    const malformed = [
      "5",
      '"a string"',
      "null",
      "[1,2]",
      '{"t":"2026-08-11T09:00:00.000Z"}',
      '{"v":"1","t":"2026-08-11T09:00:00.000Z"}',
      '{"v":1}',
    ];
    for (const raw of malformed) {
      expect(parseAttributionPayload(encodeURIComponent(raw))).toBeNull();
    }
  });

  it("truncates on the way back in too, so an over-long stored value never reaches the platform", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ v: 1, t: "2026-08-11T09:00:00.000Z", utm_campaign: "x".repeat(500) }),
    );
    expect(parseAttributionPayload(raw)?.utm_campaign).toHaveLength(200);
  });
});

describe("readAttributionParams", () => {
  it("takes the seven allowed names and ignores everything else", () => {
    const params = readAttributionParams(
      "?utm_source=facebook&utm_medium=paid_social&utm_campaign=zomer" +
        "&utm_term=adset_a&utm_content=video_1&gclid=g123&fbclid=f456" +
        "&Ad_set=whatever&ref=nope",
    );

    expect(params).toEqual({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "zomer",
      utm_term: "adset_a",
      utm_content: "video_1",
      gclid: "g123",
      fbclid: "f456",
    });
  });

  it("truncates at 200 characters so the database is never the first defence", () => {
    const params = readAttributionParams(`?utm_campaign=${"x".repeat(500)}`);
    expect(params.utm_campaign).toHaveLength(200);
  });

  it("drops an empty value rather than storing an empty string", () => {
    // ?utm_source= carries no campaign, and an empty string would still occupy
    // the record and block the next real touch.
    const params = readAttributionParams("?utm_source=&gclid=g1");
    expect(params.utm_source).toBeUndefined();
    expect(params.gclid).toBe("g1");
    expect(hasAnyParam(readAttributionParams("?utm_source="))).toBe(false);
  });

  it("returns nothing for an untagged visit", () => {
    expect(hasAnyParam(readAttributionParams(""))).toBe(false);
    expect(hasAnyParam(readAttributionParams("?page=2"))).toBe(false);
  });

  it("trims, so a blank template variable does not consume the first-touch slot", () => {
    // An agency tag whose variable resolves to nothing renders as `?utm_source=%20`.
    // The platform trims it away; if this side stored it, the record would carry
    // no campaign while still answering "a touch exists" — and the next genuine
    // ad click would lose to it on both hosts.
    expect(hasAnyParam(readAttributionParams("?utm_source=%20&utm_campaign=%20"))).toBe(false);
    expect(readAttributionParams("?gclid=%20g1%20").gclid).toBe("g1");
  });
});

describe("the two consent gates", () => {
  const all = {
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "zomer",
    utm_term: "adset_a",
    utm_content: "video_1",
    gclid: "g123",
    fbclid: "f456",
  };

  it("keeps the utm set and gclid on statistics alone", () => {
    const allowed = consentedParams(all, STATS_ONLY);
    expect(allowed.utm_source).toBe("facebook");
    expect(allowed.gclid).toBe("g123");
    expect(allowed.fbclid).toBeUndefined();
  });

  it("keeps only fbclid on marketing alone", () => {
    const allowed = consentedParams(all, MARKETING_ONLY);
    expect(allowed).toEqual({ fbclid: "f456" });
  });

  it("keeps nothing when both gates are shut", () => {
    expect(hasAnyParam(consentedParams(all, NO_GATES))).toBe(false);
  });
});

describe("recordFirstTouch — first click wins", () => {
  const first = { utm_source: "facebook", utm_campaign: "zomer", fbclid: "f1" };
  const second = { utm_source: "google", utm_campaign: "winter", gclid: "g2" };

  it("stores the first touch", () => {
    stubCookieJar();
    expect(recordFirstTouch(first, ALL_GATES, "letsdog.nl", "2026-08-11T09:00:00.000Z")).toBe(true);

    expect(readAttributionCookie()).toEqual({
      v: 1,
      t: "2026-08-11T09:00:00.000Z",
      utm_source: "facebook",
      utm_campaign: "zomer",
      fbclid: "f1",
    });
  });

  // THE HEADLINE ASSERTION, and the inverse of ld_consent's newest-wins rule.
  // Getting this backwards does not break anything visibly: the columns still
  // fill, the numbers still look healthy, and every conversion is simply
  // credited to whatever the visitor clicked last.
  it("does NOT let a later touch replace an earlier one", () => {
    stubCookieJar();
    recordFirstTouch(first, ALL_GATES, "letsdog.nl", "2026-08-11T09:00:00.000Z");

    expect(recordFirstTouch(second, ALL_GATES, "letsdog.nl", "2026-08-12T09:00:00.000Z")).toBe(
      false,
    );

    const stored = readAttributionCookie();
    expect(stored?.utm_source).toBe("facebook");
    expect(stored?.t).toBe("2026-08-11T09:00:00.000Z");
  });

  it("does not merge a later touch into the gaps the first one left", () => {
    // A blended record would credit a Google click id to a Facebook campaign —
    // a combination that never happened, which is worse than a missing field.
    stubCookieJar();
    recordFirstTouch({ utm_source: "facebook" }, ALL_GATES, "letsdog.nl");
    recordFirstTouch({ gclid: "g2" }, ALL_GATES, "letsdog.nl");

    expect(readAttributionCookie()?.gclid).toBeUndefined();
  });

  it("yields to a record written by the platform, even at a version we don't know", () => {
    // Two hosts write this cookie and neither can tell who got there first, so
    // "already present" is the only question either side can answer honestly.
    // Refusing an unknown version here would overwrite a real first touch.
    const { writes } = stubCookieJar();
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ v: 99, t: "2026-08-01T00:00:00.000Z", utm_source: "platform" }),
    )}`;
    const before = writes.length;

    expect(recordFirstTouch(first, ALL_GATES, "letsdog.nl")).toBe(false);
    expect(writes).toHaveLength(before);
    expect(readAttributionCookie()?.utm_source).toBe("platform");
  });

  it("treats an unreadable cookie as no record at all", () => {
    stubCookieJar();
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=not-json`;

    expect(recordFirstTouch(first, ALL_GATES, "letsdog.nl")).toBe(true);
    expect(readAttributionCookie()?.utm_source).toBe("facebook");
  });

  it("stores nothing for an untagged visit, leaving the slot open", () => {
    // Writing a bare {v,t} would consume the first touch and make the NEXT real
    // ad click look like a returning visitor.
    const { writes } = stubCookieJar();
    expect(recordFirstTouch({}, ALL_GATES, "letsdog.nl")).toBe(false);
    expect(writes).toHaveLength(0);
    expect(readAttributionCookie()).toBeNull();
  });

  it("stores nothing when consent allows nothing, leaving the slot open", () => {
    const { writes } = stubCookieJar();
    expect(recordFirstTouch(first, NO_GATES, "letsdog.nl")).toBe(false);
    expect(writes).toHaveLength(0);
  });

  it("stores only the consented half, and stays taken afterwards", () => {
    // Statistics-only is still a first touch. A later ad click cannot slip its
    // fbclid in on the strength of consent granted afterwards.
    stubCookieJar();
    recordFirstTouch(first, STATS_ONLY, "letsdog.nl");

    expect(readAttributionCookie()?.fbclid).toBeUndefined();
    expect(readAttributionCookie()?.utm_source).toBe("facebook");
    expect(recordFirstTouch({ fbclid: "f9" }, ALL_GATES, "letsdog.nl")).toBe(false);
    expect(readAttributionCookie()?.fbclid).toBeUndefined();
  });
});

describe("applyConsentToStored — a gate that closes later", () => {
  const stored: AttributionPayload = {
    v: 1,
    t: "2026-08-11T09:00:00.000Z",
    utm_source: "facebook",
    gclid: "g1",
    fbclid: "f1",
  };

  it("drops the Meta click id when marketing is withdrawn but statistics stays", () => {
    expect(applyConsentToStored(stored, STATS_ONLY)).toEqual({
      v: 1,
      t: "2026-08-11T09:00:00.000Z",
      utm_source: "facebook",
      gclid: "g1",
    });
  });

  it("keeps the original moment of the touch when narrowing", () => {
    // The platform reads `t` for its own first-touch rule; restamping it would
    // make an old visit look new.
    expect(applyConsentToStored(stored, MARKETING_ONLY)?.t).toBe("2026-08-11T09:00:00.000Z");
  });

  it("returns null when nothing survives, which is the signal to delete", () => {
    expect(applyConsentToStored(stored, NO_GATES)).toBeNull();
  });

  it("reports no change when both gates are still open", () => {
    const narrowed = applyConsentToStored(stored, ALL_GATES)!;
    expect(isSameAttribution(stored, narrowed)).toBe(true);
  });

  it("reports a change when a field went away, and when a value differs", () => {
    // Without this direction an `isSameAttribution` mutated to always-true would
    // pass the whole suite — and always-true means the narrowing rewrite never
    // happens, so a withdrawn fbclid stays on the cookie for ninety days.
    expect(isSameAttribution({ utm_source: "facebook", fbclid: "f1" }, { utm_source: "facebook" }))
      .toBe(false);
    expect(isSameAttribution({ utm_source: "facebook" }, { utm_source: "google" })).toBe(false);
    expect(isSameAttribution({}, {})).toBe(true);
  });
});

describe("deleting the record", () => {
  it("emits a host-only and a Domain deletion on a Let's dog host, one elsewhere", () => {
    // A cookie can only be deleted with the same Domain it was written with; the
    // host-only attempt covers a preview host, where there is none.
    const onProd = buildAttributionDeletion("letsdog.nl");
    expect(onProd).toHaveLength(2);
    expect(onProd.filter((c) => c.includes("Domain=.letsdog.nl"))).toHaveLength(1);
    for (const cookie of onProd) {
      expect(cookie).toContain(`${ATTRIBUTION_COOKIE_NAME}=`);
      expect(cookie).toContain("Max-Age=0");
      expect(cookie).toContain("Path=/");
    }

    const onPreview = buildAttributionDeletion("feat-x.website-letsdog.pages.dev");
    expect(onPreview).toHaveLength(1);
    expect(onPreview[0]).not.toContain("Domain=");
  });

  it("actually removes a stored record", () => {
    stubCookieJar();
    recordFirstTouch({ gclid: "g1" }, ALL_GATES, "letsdog.nl");
    expect(readAttributionCookie()).not.toBeNull();

    for (const cookie of buildAttributionDeletion("letsdog.nl")) document.cookie = cookie;
    expect(readAttributionCookie()).toBeNull();
  });
});

describe("narrowStoredToConsent", () => {
  it("drops the field whose gate closed and keeps the moment of the touch", () => {
    stubCookieJar();
    recordFirstTouch(
      { utm_source: "facebook", fbclid: "f1" },
      ALL_GATES,
      "letsdog.nl",
      "2026-08-11T09:00:00.000Z",
    );

    narrowStoredToConsent(STATS_ONLY, "letsdog.nl");

    expect(readAttributionCookie()).toEqual({
      v: 1,
      t: "2026-08-11T09:00:00.000Z",
      utm_source: "facebook",
    });
  });

  it("deletes when no gate is open at all", () => {
    stubCookieJar();
    recordFirstTouch({ utm_source: "facebook" }, ALL_GATES, "letsdog.nl");
    narrowStoredToConsent(NO_GATES, "letsdog.nl");
    expect(readAttributionCookie()).toBeNull();
  });

  it("writes nothing when the gates did not move", () => {
    const { writes } = stubCookieJar();
    recordFirstTouch({ utm_source: "facebook" }, ALL_GATES, "letsdog.nl");
    const before = writes.length;

    narrowStoredToConsent(ALL_GATES, "letsdog.nl");
    expect(writes).toHaveLength(before);
  });

  it("refuses to REWRITE a record at a version it cannot fully serialise", () => {
    // Keeping an unknown version and rewriting it are different rights. This
    // module can only emit the seven names it knows, so narrowing a newer record
    // would silently drop whatever the platform added while still stamping the
    // cookie with that newer version.
    const { writes } = stubCookieJar();
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ v: 99, t: "2026-08-01T00:00:00.000Z", utm_source: "pf", fbclid: "f1" }),
    )}`;
    const before = writes.length;

    narrowStoredToConsent(STATS_ONLY, "letsdog.nl");

    expect(writes).toHaveLength(before);
    expect(readAttributionCookie()?.fbclid).toBe("f1");
  });

  it("still DELETES an unknown version when no gate is open", () => {
    // Deletion needs no understanding of the payload to be the right answer, and
    // it is the answer that protects the visitor.
    stubCookieJar();
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ v: 99, t: "2026-08-01T00:00:00.000Z", utm_source: "pf" }),
    )}`;

    narrowStoredToConsent(NO_GATES, "letsdog.nl");
    expect(readAttributionCookie()).toBeNull();
  });
});

// The reviewed failure this whole section exists for: Cookiebot only knows what
// it was told on THIS host, and ConsentSync exists because that answer can be
// stale. Every other Cookiebot subscriber can afford to act on a stale answer
// for a millisecond because its action is recoverable. Attribution's is not.
describe("createAttributionRecorder — a newer platform choice beats Cookiebot", () => {
  it("stores the full ad click when ld_consent carries a newer grant", () => {
    stubCookieJar();
    document.cookie = buildConsentCookie(GRANT_ALL, "letsdog.nl");

    const record = createAttributionRecorder(
      { utm_source: "facebook", fbclid: "f1" },
      "letsdog.nl",
    );
    record(REFUSE_ALL_OLD);

    // Without the newer-choice resolution the fbclid is dropped here, the slot is
    // consumed, and no later event can add it back — so the platform can never
    // build Meta's fbc for a customer who came from an ad.
    expect(readAttributionCookie()?.fbclid).toBe("f1");
    expect(readAttributionCookie()?.utm_source).toBe("facebook");
  });

  it("does not delete a platform-written record on a stale local refusal", () => {
    stubCookieJar();
    document.cookie = buildConsentCookie(GRANT_ALL, "letsdog.nl");
    recordFirstTouch({ utm_source: "facebook" }, ALL_GATES, "letsdog.nl");

    createAttributionRecorder({}, "letsdog.nl")(REFUSE_ALL_OLD);

    expect(readAttributionCookie()?.utm_source).toBe("facebook");
  });

  it("still honours a refusal that IS the newest choice", () => {
    // The fix must not become "never narrow". A newer, narrower choice has to
    // reach the record, or a withdrawal would stop working.
    stubCookieJar();
    recordFirstTouch({ utm_source: "facebook", fbclid: "f1" }, ALL_GATES, "letsdog.nl");
    document.cookie = buildConsentCookie(choice("2026-08-01T00:00:00.000Z", true, true), "letsdog.nl");

    createAttributionRecorder({}, "letsdog.nl")(choice("2026-08-09T00:00:00.000Z", true, false));

    expect(readAttributionCookie()?.fbclid).toBeUndefined();
    expect(readAttributionCookie()?.utm_source).toBe("facebook");
  });

  it("passes a withdrawal straight through — there is no newer choice to find", () => {
    expect(effectiveConsent(null)).toBeNull();
  });
});

describe("createAttributionRecorder — absence of an answer", () => {
  it("leaves a platform-written record alone for a visitor who never answered here", () => {
    // Cookiebot reports "never asked" and "withdrew" as the same null. Acting on
    // the first would delete a record belonging to someone who has not seen the
    // banner yet. This is the shape that cost this site a live bug on ld_consent.
    const { writes } = stubCookieJar();
    recordFirstTouch({ utm_source: "facebook" }, ALL_GATES, "letsdog.nl");
    const before = writes.length;

    createAttributionRecorder({ gclid: "g1" }, "letsdog.nl")(null);

    expect(writes).toHaveLength(before);
    expect(readAttributionCookie()?.utm_source).toBe("facebook");
  });

  it("deletes on a withdrawal witnessed in this page load", () => {
    stubCookieJar();
    const record = createAttributionRecorder({ utm_source: "facebook" }, "letsdog.nl");

    record(GRANT_ALL);
    expect(readAttributionCookie()).not.toBeNull();

    record(null);
    expect(readAttributionCookie()).toBeNull();
  });

  it("honours a withdrawal made in an EARLIER session, via ld_consent", () => {
    // Without this the record outlives a real withdrawal by up to ninety days:
    // Cookiebot's withdraw() clears hasResponse, so on every later visit the
    // visitor is indistinguishable from someone who was never asked. ld_consent
    // tells them apart — a refusal is recorded as an explicit all-false, and a
    // visitor nobody asked has no such cookie at all.
    stubCookieJar();
    recordFirstTouch({ utm_source: "facebook", fbclid: "f1" }, ALL_GATES, "letsdog.nl");
    document.cookie = buildConsentCookie(choice("2026-08-09T00:00:00.000Z", false, false), "letsdog.nl");

    createAttributionRecorder({}, "letsdog.nl")(null);

    expect(readAttributionCookie()).toBeNull();
  });

  it("keeps the landing params across a consent that only arrives later", () => {
    // The closure is what lets someone land on a tagged link and answer the
    // banner two clicks later, when the query string is long gone.
    stubCookieJar();
    const record = createAttributionRecorder({ utm_source: "facebook" }, "letsdog.nl");

    record(null);
    record(GRANT_ALL);

    expect(readAttributionCookie()?.utm_source).toBe("facebook");
  });
});
