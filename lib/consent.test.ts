import { describe, it, expect, afterEach, vi } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  buildConsentCookie,
  consentCookieDomain,
  parseConsentPayload,
  readCookie,
  recordConsentWithdrawal,
  serializeConsentPayload,
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
  it("returns the shared parent domain on Let's Dog hosts", () => {
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

  it("omits Domain off the Let's Dog hosts so the write still lands", () => {
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
