import { describe, it, expect, afterEach, vi } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  buildConsentCookie,
  consentCookieDomain,
  consentCookieSupersedes,
  createConsentRecorder,
  newestRecordedConsent,
  parseConsentPayload,
  readCookie,
  recordConsentWithdrawal,
  serializeConsentPayload,
  submitConsentToCookiebot,
  toIsoTimestamp,
  writeConsentCookie,
  type ConsentPayload,
} from "./consent";

const payload: ConsentPayload = {
  v: 1,
  t: "2026-08-08T06:35:12.618Z",
  p: false,
  s: true,
  m: false,
};

// These assertions are the contract with the platform (KTD0 in the D-93 plan),
// not a style preference. The platform's reader falls back to "everything
// refused" on any mismatch, which fails silently — so the shape is pinned here
// deliberately, in a test that has to be edited on purpose.
describe("the ld_consent contract", () => {
  it("is named ld_consent at version 1", () => {
    expect(CONSENT_COOKIE_NAME).toBe("ld_consent");
    expect(CONSENT_COOKIE_VERSION).toBe(1);
  });

  it("serialises to URL-encoded JSON with exactly the five contract fields", () => {
    const decoded = JSON.parse(decodeURIComponent(serializeConsentPayload(payload)));
    expect(Object.keys(decoded).sort()).toEqual(["m", "p", "s", "t", "v"]);
    expect(decoded).toEqual({
      v: 1,
      t: "2026-08-08T06:35:12.618Z",
      p: false,
      s: true,
      m: false,
    });
  });

  it("gives necessary no field of its own", () => {
    const decoded = JSON.parse(decodeURIComponent(serializeConsentPayload(payload)));
    expect(decoded).not.toHaveProperty("n");
    expect(decoded).not.toHaveProperty("necessary");
  });

  it("round-trips", () => {
    expect(parseConsentPayload(serializeConsentPayload(payload))).toEqual(payload);
  });

  // Every other assertion here decodes before comparing, and decodeURIComponent
  // is a no-op on unencoded input — so without this one, dropping the
  // encodeURIComponent would pass the whole suite while shipping raw braces and
  // quotes into a Set-Cookie value.
  it("is percent-encoded on the wire, not raw JSON", () => {
    const wire = serializeConsentPayload(payload);
    expect(wire).toContain("%7B");
    expect(wire).not.toMatch(/[{}":,]/);
  });
});

describe("parseConsentPayload", () => {
  it("rejects malformed input rather than half-trusting it", () => {
    expect(parseConsentPayload("not json")).toBeNull();
    expect(parseConsentPayload(encodeURIComponent("[]"))).toBeNull();
    expect(parseConsentPayload(encodeURIComponent("null"))).toBeNull();
    // a missing category is not "false" — it is an unreadable cookie
    expect(
      parseConsentPayload(encodeURIComponent(JSON.stringify({ v: 1, t: "x", p: true, s: true }))),
    ).toBeNull();
    // a string where a boolean belongs
    expect(
      parseConsentPayload(
        encodeURIComponent(JSON.stringify({ v: 1, t: "x", p: "true", s: true, m: true })),
      ),
    ).toBeNull();
  });

  it("keeps a version it does not know, so the reader can decide", () => {
    const future = encodeURIComponent(
      JSON.stringify({ v: 99, t: "2026-08-08T00:00:00.000Z", p: true, s: true, m: true }),
    );
    expect(parseConsentPayload(future)?.v).toBe(99);
  });
});

describe("consentCookieDomain", () => {
  it("returns the shared parent domain on Let's dog hosts", () => {
    expect(consentCookieDomain("letsdog.nl")).toBe(".letsdog.nl");
    expect(consentCookieDomain("www.letsdog.nl")).toBe(".letsdog.nl");
    expect(consentCookieDomain("mijn.letsdog.nl")).toBe(".letsdog.nl");
  });

  it("returns null where the browser would reject that Domain", () => {
    expect(consentCookieDomain("website-letsdog.pages.dev")).toBeNull();
    expect(consentCookieDomain("feat-consent.website-letsdog.pages.dev")).toBeNull();
    expect(consentCookieDomain("localhost")).toBeNull();
  });

  it("does not match a lookalike domain", () => {
    // endsWith(".letsdog.nl") must not be satisfied by a suffix of the label
    expect(consentCookieDomain("notletsdog.nl")).toBeNull();
    expect(consentCookieDomain("letsdog.nl.evil.example")).toBeNull();
  });
});

describe("buildConsentCookie", () => {
  it("carries the contract attributes on a production host", () => {
    const cookie = buildConsentCookie(payload, "letsdog.nl");
    expect(cookie.startsWith(`${CONSENT_COOKIE_NAME}=`)).toBe(true);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Domain=.letsdog.nl");
  });

  it("never sets HttpOnly — the platform reads this in the client", () => {
    expect(buildConsentCookie(payload, "letsdog.nl")).not.toContain("HttpOnly");
  });

  it("omits Domain off the Let's dog hosts so the write still lands", () => {
    const cookie = buildConsentCookie(payload, "website-letsdog.pages.dev");
    expect(cookie).not.toContain("Domain=");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("outlives the session", () => {
    expect(buildConsentCookie(payload, "letsdog.nl")).toMatch(/Max-Age=\d{7,}/);
  });
});

describe("readCookie", () => {
  it("finds the value among neighbours", () => {
    const jar = `_ga=GA1.1.x; ${CONSENT_COOKIE_NAME}=abc123; _fbp=fb.1.y`;
    expect(readCookie(jar, CONSENT_COOKIE_NAME)).toBe("abc123");
  });

  it("returns null when absent, and does not match a suffix", () => {
    expect(readCookie("_ga=1; other=2", CONSENT_COOKIE_NAME)).toBeNull();
    expect(readCookie(`old_${CONSENT_COOKIE_NAME}=nope`, CONSENT_COOKIE_NAME)).toBeNull();
  });
});

// The cookie writers need a `document`, but not a whole DOM — the repo's Vitest
// runs in the Node environment on purpose (see CLAUDE.md), so a jar stub keeps
// these reachable without pulling in jsdom. It models the two behaviours the
// code depends on: reads return every stored pair, and a Max-Age=0 write
// deletes rather than stores.
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

describe("writeConsentCookie", () => {
  it("writes the choice, then stays silent when nothing changed", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie(payload, "letsdog.nl");
    writeConsentCookie(payload, "letsdog.nl");
    writeConsentCookie(payload, "letsdog.nl");
    // Replaying the same choice on every pageview must not churn `t` — the
    // platform appends a row per newer timestamp.
    expect(writes).toHaveLength(1);
  });

  it("writes again when the choice actually changed", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie(payload, "letsdog.nl");
    writeConsentCookie({ ...payload, m: true, t: "2026-08-08T07:00:00.000Z" }, "letsdog.nl");
    expect(writes).toHaveLength(2);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)?.m).toBe(true);
  });

  // This is the read-back trap, and it is the reason the comparison ignores `t`.
  // Cookiebot stamps consentUTC at NOW when it accepts a submitted choice, so
  // after the return leg adopts a platform choice its consent event arrives here
  // with the same p/s/m and a fresher timestamp. Rewriting on that would tell the
  // platform a second choice was made, on this site, at a time nobody chose.
  it("does not rewrite for a fresher timestamp on the same choice", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie(payload, "letsdog.nl");
    writeConsentCookie({ ...payload, t: "2026-08-08T09:00:00.000Z" }, "letsdog.nl");
    expect(writes).toHaveLength(1);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)?.t).toBe(
      payload.t,
    );
  });

  it("writes when the contract version moves, even at the same choice", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie(payload, "letsdog.nl");
    writeConsentCookie({ ...payload, v: 2 }, "letsdog.nl");
    expect(writes).toHaveLength(2);
  });

  // Two repos write this cookie, so it is not this site's record of what
  // Cookiebot thinks — it is the latest choice known on either host. Measured
  // 2026-08-08: without this rule, replaying Cookiebot's stored answer on page
  // load overwrote a fresher refusal made on the platform, and the return leg
  // could never see the disagreement it exists to resolve.
  it("never overwrites a choice made more recently elsewhere", () => {
    const { writes } = stubCookieJar();
    const fromPlatform = { v: 1, t: "2026-08-08T08:00:00.000Z", p: true, s: false, m: true };
    writeConsentCookie(fromPlatform, "letsdog.nl");
    writeConsentCookie({ v: 1, t: "2026-08-08T06:00:00.000Z", p: false, s: true, m: false }, "letsdog.nl");
    expect(writes).toHaveLength(1);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)).toEqual(
      fromPlatform,
    );
  });

  it("does overwrite an older choice", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie({ ...payload, t: "2026-08-07T00:00:00.000Z", m: true }, "letsdog.nl");
    writeConsentCookie({ ...payload, t: "2026-08-08T10:00:00.000Z", m: false }, "letsdog.nl");
    expect(writes).toHaveLength(2);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)?.m).toBe(false);
  });
});

// The rule that decides whether an absence of consent is a withdrawal or simply
// a host where nobody has been asked yet. It is a rule about the ORDER of the
// states Cookiebot reports, which is why it is a closure and why it is pinned
// here: nothing about the two writers it calls reveals that ordering.
describe("createConsentRecorder", () => {
  const granted: ConsentPayload = { v: 1, t: "2026-08-08T09:00:00.000Z", p: true, s: true, m: true };

  it("records a withdrawal that follows a consent it witnessed", () => {
    stubCookieJar();
    const record = createConsentRecorder("letsdog.nl");
    record(granted);
    record(null);
    const after = parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!);
    expect([after?.p, after?.s, after?.m]).toEqual([false, false, false]);
  });

  it("leaves a choice made elsewhere alone when nobody answered here", () => {
    // The expensive case, measured in the browser on 2026-08-08 before this rule
    // existed: a grant made on mijn.letsdog.nl, a visitor arriving on letsdog.nl
    // where they never saw the banner, and Cookiebot's OnLoad turning that grant
    // into an explicit refusal — which the platform's own gate then reads.
    const { writes } = stubCookieJar();
    writeConsentCookie(granted, "letsdog.nl");
    const record = createConsentRecorder("letsdog.nl");
    record(null);
    record(null);
    expect(writes).toHaveLength(1);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)).toEqual(granted);
  });
});

// The return leg (T-26): the platform's choice reaching Cookiebot here. The rule
// is the platform's own R8 pointed the other way — strictly newer wins.
// The read-side counterpart of consentCookieSupersedes, for the one subscriber
// whose action cannot be undone: PostHog sends a $pageview the moment it starts.
// The bug these pin is the one review caught on T-27 in another guise — reading
// the SOURCE (Cookiebot) at a moment when the merged state already says no.
describe("newestRecordedConsent", () => {
  const cookiebot: ConsentPayload = {
    v: 1,
    t: "2026-08-08T06:00:00.000Z",
    p: false,
    s: true,
    m: false,
  };
  const refusal = { ...cookiebot, t: "2026-08-08T08:00:00.000Z", s: false };

  it("returns null when neither source records a choice", () => {
    expect(newestRecordedConsent(null, null)).toBeNull();
  });

  it("returns the cookie when Cookiebot has not loaded or holds nothing", () => {
    // THE CASE THAT MATTERS ON PAGE LOAD. Cookiebot arrives async; a refusal
    // made on mijn.letsdog.nl is already sitting in ld_consent. Answering null
    // here would let PostHog start and fire a $pageview for someone who said no,
    // and no later event can take that back.
    expect(newestRecordedConsent(null, refusal)).toEqual(refusal);
    expect(newestRecordedConsent(null, refusal)?.s).toBe(false);
  });

  it("returns Cookiebot's answer when the cookie is absent", () => {
    expect(newestRecordedConsent(cookiebot, null)).toEqual(cookiebot);
  });

  it("takes the strictly newer of the two, in both directions", () => {
    expect(newestRecordedConsent(cookiebot, refusal)).toEqual(refusal);
    const staleCookie = { ...refusal, t: "2026-08-08T05:00:00.000Z" };
    expect(newestRecordedConsent(cookiebot, staleCookie)).toEqual(cookiebot);
  });

  it("prefers Cookiebot on an equal timestamp", () => {
    // Equal stamps are the measured rest state: the two hosts already agree, so
    // either answer is the same choice. Pinned so a future edit has to be
    // deliberate rather than incidental.
    const sameMoment = { ...refusal, t: cookiebot.t };
    expect(newestRecordedConsent(cookiebot, sameMoment)).toEqual(cookiebot);
  });

  it("ignores a cookie from a different contract version", () => {
    // A v2 cookie is not ours to interpret. Falling back to Cookiebot is the
    // same "rather not act than act on something we could not read" the rest of
    // this module applies.
    const wrongVersion = { ...refusal, v: 2 };
    expect(newestRecordedConsent(cookiebot, wrongVersion)).toEqual(cookiebot);
    expect(newestRecordedConsent(null, wrongVersion)).toBeNull();
  });

  it("does not treat an unreadable timestamp as newer", () => {
    const unparseable = { ...refusal, t: "not-a-date" };
    expect(newestRecordedConsent(cookiebot, unparseable)).toEqual(cookiebot);
  });
});

describe("consentCookieSupersedes", () => {
  const cookiebot: ConsentPayload = {
    v: 1,
    t: "2026-08-08T06:00:00.000Z",
    p: false,
    s: true,
    m: true,
  };
  const newer = { ...cookiebot, t: "2026-08-08T08:00:00.000Z" };

  it("adopts a strictly newer choice", () => {
    expect(consentCookieSupersedes({ ...newer, m: false }, cookiebot)).toBe(true);
  });

  it("ignores an older or equally old cookie", () => {
    const older = { ...cookiebot, t: "2026-08-08T05:00:00.000Z", m: false };
    expect(consentCookieSupersedes(older, cookiebot)).toBe(false);
    expect(consentCookieSupersedes({ ...cookiebot, m: false }, cookiebot)).toBe(false);
  });

  it("ignores a newer cookie that says the same thing", () => {
    // Submitting would only move Cookiebot's consentUTC to now and re-fire its
    // events. It is also what makes one sync per choice enough: once the
    // categories match, no further submit can follow.
    expect(consentCookieSupersedes(newer, cookiebot)).toBe(false);
  });

  it("refuses a contract version it does not know", () => {
    // parseConsentPayload keeps an unknown version so the reader can decide.
    // This is the reader, and pushing three known fields of a five-field future
    // payload into the CMP would silently drop whatever version 2 added.
    expect(consentCookieSupersedes({ ...newer, v: 2, m: false }, cookiebot)).toBe(false);
  });

  it("does nothing when Cookiebot records no choice at all", () => {
    // Not merely "nothing to compare with". A withdrawal ALSO leaves Cookiebot
    // without a response, and at that moment the cookie holds this site's own
    // all-false record stamped now — so treating null as "older than anything"
    // would feed our withdrawal back into our own banner and take it away from
    // the visitor. This branch is why anything that passes the predicate must
    // have been written by the other host.
    expect(consentCookieSupersedes({ ...newer, p: false, s: false, m: false }, null)).toBe(false);
  });

  it("does not act on a comparison it could not make", () => {
    expect(consentCookieSupersedes({ ...newer, t: "gisteren", m: false }, cookiebot)).toBe(false);
    expect(consentCookieSupersedes({ ...newer, m: false }, { ...cookiebot, t: "" })).toBe(false);
  });
});

describe("submitConsentToCookiebot", () => {
  it("hands the three categories to Cookiebot in contract order", () => {
    const submitCustomConsent = vi.fn();
    vi.stubGlobal("window", { Cookiebot: { submitCustomConsent } });
    expect(submitConsentToCookiebot({ ...payload, p: true, s: false, m: true })).toBe(true);
    expect(submitCustomConsent).toHaveBeenCalledWith(true, false, true);
  });

  it("reports that it did nothing when Cookiebot is not there", () => {
    // An ad blocker, a failed uc.js, or an object that exists but is half-built.
    // The caller has to be able to tell this apart from "declined to sync".
    vi.stubGlobal("window", {});
    expect(submitConsentToCookiebot(payload)).toBe(false);
    vi.stubGlobal("window", { Cookiebot: { hasResponse: true } });
    expect(submitConsentToCookiebot(payload)).toBe(false);
  });
});

// The whole point of the two changes above, in the order they actually happen.
// Before them, step 4 wrote a phantom row into the platform's consent history on
// every platform change.
describe("a choice changed on the platform, end to end", () => {
  it("reaches Cookiebot once and leaves the cookie's own timestamp alone", () => {
    const chosenOnPlatform = "2026-08-08T08:00:00.000Z";
    const { writes } = stubCookieJar();
    const submitCustomConsent = vi.fn();

    // 1. the platform wrote its refusal into the shared cookie
    writeConsentCookie(
      { v: 1, t: chosenOnPlatform, p: false, s: false, m: false },
      "letsdog.nl",
    );
    // 2. the visitor lands here, where Cookiebot still holds the older consent
    const stale: ConsentPayload = { v: 1, t: "2026-08-08T06:00:00.000Z", p: true, s: true, m: true };
    const fromCookie = parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)!;
    expect(consentCookieSupersedes(fromCookie, stale)).toBe(true);

    // 3. Cookiebot is put into that choice and stamps the moment at NOW
    vi.stubGlobal("window", { Cookiebot: { submitCustomConsent } });
    submitConsentToCookiebot(fromCookie);
    expect(submitCustomConsent).toHaveBeenCalledWith(false, false, false);
    const echoed: ConsentPayload = { v: 1, t: "2026-08-08T09:30:00.000Z", p: false, s: false, m: false };

    // 4. its consent event reaches the write side, which must stay silent
    writeConsentCookie(echoed, "letsdog.nl");
    expect(writes).toHaveLength(1);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)?.t).toBe(
      chosenOnPlatform,
    );

    // 5. and a second pass adopts nothing, whatever the clocks say
    expect(consentCookieSupersedes(fromCookie, echoed)).toBe(false);
  });
});

describe("recordConsentWithdrawal", () => {
  const withdrawnAt = "2026-08-08T07:15:00.000Z";

  it("turns a granted cookie into an explicit refusal", () => {
    stubCookieJar();
    writeConsentCookie({ ...payload, p: true, s: true, m: true }, "letsdog.nl");
    recordConsentWithdrawal("letsdog.nl", withdrawnAt);
    const after = parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!);
    expect(after).toEqual({ v: CONSENT_COOKIE_VERSION, t: withdrawnAt, p: false, s: false, m: false });
  });

  it("invents nothing for a visitor who never answered", () => {
    const { writes } = stubCookieJar();
    recordConsentWithdrawal("letsdog.nl", withdrawnAt);
    // No prior cookie means no choice to withdraw. Recording "refused" here
    // would tell the platform the visitor said no when nobody asked.
    expect(writes).toHaveLength(0);
    expect(readCookie(document.cookie, CONSENT_COOKIE_NAME)).toBeNull();
  });

  it("leaves an already-refused cookie alone", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie({ v: 1, t: "2026-08-08T06:00:00.000Z", p: false, s: false, m: false }, "letsdog.nl");
    recordConsentWithdrawal("letsdog.nl", withdrawnAt);
    expect(writes).toHaveLength(1);
    expect(parseConsentPayload(readCookie(document.cookie, CONSENT_COOKIE_NAME)!)?.t).toBe(
      "2026-08-08T06:00:00.000Z",
    );
  });
});

describe("toIsoTimestamp", () => {
  it("accepts what Cookiebot actually exposes (a Date)", () => {
    expect(toIsoTimestamp(new Date("2026-08-08T06:35:12.618Z"))).toBe(
      "2026-08-08T06:35:12.618Z",
    );
  });

  it("accepts the epoch milliseconds its cookie carries", () => {
    expect(toIsoTimestamp(1786170912618)).toBe("2026-08-08T06:35:12.618Z");
  });

  it("returns null rather than an Invalid Date", () => {
    expect(toIsoTimestamp(null)).toBeNull();
    expect(toIsoTimestamp(undefined)).toBeNull();
    expect(toIsoTimestamp("nonsense")).toBeNull();
    expect(toIsoTimestamp(new Date("nope"))).toBeNull();
    expect(toIsoTimestamp(true)).toBeNull();
  });
});
