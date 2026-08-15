import { describe, it, expect, afterEach, vi } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  buildConsentCookie,
  buildConsentHostOnlyDeletion,
  consentCookieDomain,
  consentCookieSupersedes,
  countConsentCookies,
  createConsentRecorder,
  newestRecordedConsent,
  onCookiebotConsent,
  parseConsentPayload,
  readConsentCookie,
  readFirstParseableCookie,
  recordConsentWithdrawal,
  serializeConsentPayload,
  submitConsentToCookiebot,
  toIsoTimestamp,
  writeConsentCookie,
  type ConsentPayload,
} from "./consent";
import {
  stubConsoleReports,
  stubDomainCookieJar,
  type JarEntry,
} from "./cookie-jar.test-helpers";

const payload: ConsentPayload = {
  v: 1,
  t: "2026-08-08T06:35:12.618Z",
  p: false,
  s: true,
  m: false,
};

/**
 * A wire value that is well-formed in every respect EXCEPT possibly `t`, so a
 * refusal is always attributable to the timestamp and never to the rest of the
 * record. Shared by the parser tests and the writer tests below, which is the
 * point: both ends are measured against one definition of "a valid payload".
 */
const withT = (t: string) =>
  encodeURIComponent(JSON.stringify({ v: 1, t, p: false, s: true, m: false }));

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

// T-39. `t` used to pass through at any length, and this cookie is script-
// writable by BOTH hosts on the shared parent domain by contract — so an
// oversized `t` was enough to push a writeConsentCookie rewrite past the
// browser's ~4096-byte limit, where the assignment is dropped SILENTLY and the
// old state survives. On ld_consent that means a consent choice does not land.
//
// The repair is not the one lib/attribution.ts got. There the same hole is fixed
// by truncating at 64 and never refusing (its rule 4: the expensive direction is
// discarding a touch the other side kept). Here the platform REFUSES a `t` that
// is not an ISO instant with Z, and a failure makes the whole record unreadable
// on its side — which it treats as "everything refused". These tests pin the
// refusal, so nobody later "harmonises" the two cookies onto one verb.
describe("parseConsentPayload — the timestamp mirror (T-39)", () => {
  it("refuses an oversized t instead of carrying it", () => {
    // The T-39 payload: perfectly well-formed in every other respect, so the
    // only possible reason to refuse it is `t`. 5000 characters is already past
    // the whole-cookie limit on its own.
    const oversized = "2026-08-13T09:00:00.000Z".padEnd(5000, "0");
    expect(oversized).toHaveLength(5000);
    expect(parseConsentPayload(withT(oversized))).toBeNull();
    // and the same record with a sane stamp still reads, so the refusal is
    // attributable to the field and not to the shape of the test
    expect(parseConsentPayload(withT("2026-08-13T09:00:00.000Z"))).not.toBeNull();
  });

  it("still accepts what our own writers actually produce", () => {
    // Every `t` this site writes comes from Date.prototype.toISOString() — via
    // toIsoTimestamp, its now() fallback, or recordConsentWithdrawal's default.
    // If this ever fails we are refusing our own cookie.
    const real = new Date().toISOString();
    expect(parseConsentPayload(withT(real))?.t).toBe(real);
    // and the no-milliseconds variant the platform's regex also allows
    expect(parseConsentPayload(withT("2026-08-13T09:00:00Z"))?.t).toBe("2026-08-13T09:00:00Z");
  });

  it("refuses the boundary shapes that make R8 undecidable", () => {
    // A stamp without a zone cannot answer "is this newer than what I recorded",
    // which is the platform's stated reason for the check.
    expect(parseConsentPayload(withT("2026-08-13T09:00:00.000"))).toBeNull(); // no Z
    expect(parseConsentPayload(withT("2026-08-13T09:00:00+02:00"))).toBeNull(); // offset, not Z
    expect(parseConsentPayload(withT("2026-08-13T09:00:00.0000Z"))).toBeNull(); // 4 sub-second digits
    expect(parseConsentPayload(withT(""))).toBeNull(); // empty
  });

  it("refuses a well-formed instant that cannot exist", () => {
    // THE REASON Date.parse IS PART OF THE MIRROR AND NOT A FLOURISH. Hour 25
    // satisfies the regex — \d{2} does not know what an hour is — and would
    // reach isStrictlyNewer as a NaN, which answers "not newer" for every
    // comparison it is ever in, silently.
    const impossible = "2026-08-13T25:00:00.000Z";
    expect(Number.isNaN(Date.parse(impossible))).toBe(true);
    expect(parseConsentPayload(withT(impossible))).toBeNull();
  });

  // THE CROSS-REPO PIN. The literal below is the platform's own
  // ISO_INSTANT_WITH_Z, from packages/core/src/consent.ts — the mirror reader
  // this contract names. The corpus discriminates every part of it, so editing
  // the parser's copy without editing the platform's is a test failure rather
  // than a tidy-up that silently splits the two readers apart.
  it("agrees with the platform's regex, character for character", () => {
    const PLATFORM_ISO_INSTANT_WITH_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
    const corpus = [
      "2026-08-13T09:00:00.000Z",
      "2026-08-13T09:00:00.00Z",
      "2026-08-13T09:00:00.0Z",
      "2026-08-13T09:00:00Z",
      "2026-08-13T09:00:00.0000Z",
      "2026-08-13T09:00:00",
      "2026-08-13T09:00:00.000",
      "2026-08-13T09:00:00+02:00",
      "2026-08-13T09:00:00z",
      "2026-08-13 09:00:00Z",
      "026-08-13T09:00:00Z",
      // toISOString()'s extended-year form, which lib/attribution.ts documents at
      // 27 characters and treats as legitimate. The platform refuses it, so we
      // refuse it too — the divergence is the platform's to resolve, not ours.
      "+011476-08-15T05:20:00.000Z",
      " 2026-08-13T09:00:00.000Z",
      "2026-08-13T09:00:00.000Z ",
      "",
    ];
    for (const t of corpus) {
      const accepted = parseConsentPayload(withT(t)) !== null;
      // Date.parse is the mirror's second half; every entry here is a real
      // instant or not, and the two checks together decide.
      const expected = PLATFORM_ISO_INSTANT_WITH_Z.test(t) && !Number.isNaN(Date.parse(t));
      expect({ t, accepted }).toEqual({ t, accepted: expected });
    }
  });

  it("walks past an unreadable stamp to a copy that parses", () => {
    // The refusal composes with rule 1: a shadowing host-only copy carrying a
    // junk `t` no longer hides the legitimate shared record behind it.
    //
    // ON THE DOMAIN-AWARE JAR SINCE RULE 6, and the substance of the assertion is
    // unchanged. Reading a duplicate now WRITES (the host-only wipe), which the
    // read-only jar cannot express — it would return an empty string afterwards
    // and this would pass or fail for reasons that have nothing to do with `t`.
    // Rule 1 still does the work here as well: the surviving copy has to parse.
    stubConsoleReports();
    stubDomainCookieJar([
      hostOnlyCopy(withT("gisteren")),
      sharedCopy(withT("2026-08-13T09:00:00.000Z")),
    ]);
    expect(readConsentCookie()?.t).toBe("2026-08-13T09:00:00.000Z");
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

// Rule 1 of the cross-host contract: the reader takes the first PARSEABLE
// record, not the first match. A browser sends SEVERAL cookies of one name when
// they differ in Domain or Path, and per RFC 6265 §5.4 document.cookie arrives
// sorted longest-Path first — so a host-only copy set by any *.letsdog.nl
// subdomain is handed over before the legitimate Domain=.letsdog.nl one.
describe("readFirstParseableCookie", () => {
  const identity = (raw: string) => raw;
  const valid = serializeConsentPayload(payload);

  it("finds the value among neighbours", () => {
    const jar = `_ga=GA1.1.x; ${CONSENT_COOKIE_NAME}=abc123; _fbp=fb.1.y`;
    expect(readFirstParseableCookie(jar, CONSENT_COOKIE_NAME, identity)).toBe("abc123");
  });

  it("returns null when absent, and does not match a suffix", () => {
    expect(readFirstParseableCookie("_ga=1; other=2", CONSENT_COOKIE_NAME, identity)).toBeNull();
    expect(
      readFirstParseableCookie(`old_${CONSENT_COOKIE_NAME}=nope`, CONSENT_COOKIE_NAME, identity),
    ).toBeNull();
  });

  it("walks past a broken duplicate to the copy that parses", () => {
    const jar = `${CONSENT_COOKIE_NAME}=corrupted; ${CONSENT_COOKIE_NAME}=${valid}`;
    expect(readFirstParseableCookie(jar, CONSENT_COOKIE_NAME, parseConsentPayload)).toEqual(payload);
  });

  it("takes the copy that parses when it comes first as well", () => {
    const jar = `${CONSENT_COOKIE_NAME}=${valid}; ${CONSENT_COOKIE_NAME}=corrupted`;
    expect(readFirstParseableCookie(jar, CONSENT_COOKIE_NAME, parseConsentPayload)).toEqual(payload);
  });

  it("returns null when no copy parses", () => {
    const jar = `${CONSENT_COOKIE_NAME}=corrupted; ${CONSENT_COOKIE_NAME}=${encodeURIComponent("[]")}`;
    expect(readFirstParseableCookie(jar, CONSENT_COOKIE_NAME, parseConsentPayload)).toBeNull();
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
  // unstubAllGlobals does not undo a spy, and a console.error left mocked would
  // swallow the next file's output as well as this one's.
  vi.restoreAllMocks();
});

/**
 * document.cookie exactly as given, duplicates and all. The Map-backed jar above
 * cannot express this — it holds one value per name, and two cookies sharing one
 * name is the entire failure mode below.
 *
 * READ-ONLY, and since contract rule 6 that is a limit rather than a
 * simplification: an assignment replaces the whole property instead of updating
 * one copy, so a jar holding two copies would come back EMPTY after the repair's
 * host-only wipe. Any test where the code under test writes — which now includes
 * every read of a jar with a duplicate in it — belongs on `stubDomainCookieJar`
 * from `./cookie-jar.test-helpers`.
 */
function stubRawCookieJar(jar: string) {
  vi.stubGlobal("document", { cookie: jar });
}

/** A `ld_consent` copy planted by a sibling host — no Domain, so it exists only here. */
function hostOnlyCopy(value: string): JarEntry {
  return { name: CONSENT_COOKIE_NAME, value, domain: null };
}

/** A `ld_consent` copy on the shared parent domain: what this site and the platform write. */
function sharedCopy(value: string): JarEntry {
  return { name: CONSENT_COOKIE_NAME, value, domain: ".letsdog.nl" };
}

/**
 * A fresh instance of the module, so the once-per-page-session latch starts
 * unset.
 *
 * That latch is module state by design — the report is per page session, not per
 * read — which means the FIRST duplicate this file produces consumes it for
 * every later test sharing the static import. Re-importing after
 * `vi.resetModules()` is how `attribution.test.ts` handles the same latch, and it
 * beats a test-only reset export: the production module keeps no seam that exists
 * purely for tests.
 */
async function freshConsent() {
  vi.resetModules();
  return import("./consent");
}

// The public half of rule 1. `ld_consent` must be readable from every
// *.letsdog.nl host, so a __Host- prefix is ruled out by contract and any
// subdomain — keuzehulp, agenda, the platform, a parked or expired one — can set
// its own copy. Reading the shadowing copy here would report "no choice
// recorded" for a visitor who did choose, and the platform gates its own
// measurement on this cookie.
describe("readConsentCookie — the first PARSEABLE ld_consent", () => {
  const granted: ConsentPayload = { v: 1, t: "2026-08-12T10:00:00.000Z", p: true, s: true, m: true };
  const shared = serializeConsentPayload(granted);

  // The three duplicate-carrying cases below moved from `stubRawCookieJar` to the
  // domain-aware jar when rule 6 landed (T-41). Not a weakening: reading a
  // duplicate now writes, and the read-only jar answers an assignment by
  // replacing the entire cookie string, so all three would have gone null for a
  // reason belonging to the rig. Same inputs, same expectations, a jar that can
  // hold the two copies apart.

  it("ignores a broken host-only copy that sorts ahead of the shared one", () => {
    stubConsoleReports();
    stubDomainCookieJar([hostOnlyCopy("corrupted"), sharedCopy(shared)]);
    expect(readConsentCookie()).toEqual(granted);
  });

  it("still takes the shared copy when it happens to come first", () => {
    // Two copies on the shared domain: nothing for the host-only wipe to reach,
    // so rule 1 alone decides and it takes the one that parses.
    stubConsoleReports();
    stubDomainCookieJar([sharedCopy(shared), sharedCopy("corrupted")]);
    expect(readConsentCookie()).toEqual(granted);
  });

  it("reports no choice when no copy is readable", () => {
    stubConsoleReports();
    stubDomainCookieJar([hostOnlyCopy("corrupted"), sharedCopy("%7Bnope")]);
    expect(readConsentCookie()).toBeNull();
  });

  it("reports no choice when there is no ld_consent at all", () => {
    // The prefix discipline at the public level, and the sharpest form of it: a
    // loosened match would return this perfectly valid payload under the wrong
    // name.
    stubRawCookieJar(`_ga=1; old_${CONSENT_COOKIE_NAME}=${shared}`);
    expect(readConsentCookie()).toBeNull();
  });
});

// Contract rule 6, the other half of the duplicate problem: MORE THAN ONE COOKIE
// OF THIS NAME → delete the HOST-ONLY copy, re-read, continue with whatever
// survives. `cross-host-consent-handover.md`, section "More than one cookie of
// this name: delete the host-only copy, re-read, continue".
//
// WE ARE FIRST WITH IT ON THIS COOKIE. The platform carries the same rule as its
// loop task T-575 and has not built it yet, so unlike rule 5 on `ld_attribution`
// there is no mirror to copy from — the contract text is the norm, and the shape
// is taken from this repo's own `ld_attribution` repair (T-40, PR #83) so the two
// cookies stay recognisably the same. When the platform builds T-575 the message
// text here is what it should mirror, not the other way round.
//
// WHAT RULE 1 LEAVES OPEN. Taking the first PARSEABLE record defeats a duplicate
// that is CORRUPT. A duplicate that is perfectly VALID parses fine, arrives first
// (RFC 6265 §5.4 hands over the more specific copy first), and therefore wins.
// Any host under `.letsdog.nl` can plant one and `__Host-` is ruled out by the
// contract, because both hosts must read this cookie by design.
//
// AND IT IS WORTH MORE HERE THAN ON `ld_attribution`. Since D-4 a cookie that
// GRANTS a category is adopted when Cookiebot holds no answer, so a planted grant
// takes the banner away from someone who was never asked and opens the Meta
// pixel's load gate. Nothing is visible when it happens.
//
// THE REPAIR DECIDES WHICH COPY IS REAL, NEVER WHICH RECORD GOVERNS. Newest wins
// is untouched, and the last two tests here are what say so.
describe("more than one ld_consent cookie (contract rule 6)", () => {
  /** What the visitor really chose, on the shared parent domain: a refusal. */
  const real: ConsentPayload = {
    v: 1,
    t: "2026-08-12T10:00:00.000Z",
    p: false,
    s: false,
    m: false,
  };
  /** A sibling host's copy: valid, parseable, first in line, and a grant nobody gave. */
  const planted: ConsentPayload = {
    v: 1,
    t: "2026-08-13T09:00:00.000Z",
    p: true,
    s: true,
    m: true,
  };
  const realValue = serializeConsentPayload(real);
  const plantedValue = serializeConsentPayload(planted);

  /** The hijack as a browser presents it: the host-only copy in front. */
  const hijacked = (): JarEntry[] => [hostOnlyCopy(plantedValue), sharedCopy(realValue)];
  /** Two copies no host-only wipe can reach — a genuine second writer. */
  const bothShared = (): JarEntry[] => [sharedCopy(plantedValue), sharedCopy(realValue)];

  it("counts every copy, parseable or not, and nothing that merely resembles one", () => {
    // Counting only the parseable ones would miss the case this rule is for, and
    // counting loosely is worse than not counting: `old_ld_consent` next to one
    // real record would fake a duplicate and make the repair delete a record that
    // was alone and correct.
    expect(countConsentCookies(null)).toBe(0);
    expect(countConsentCookies(`_ga=1; ${CONSENT_COOKIE_NAME}=${realValue}`)).toBe(1);
    expect(countConsentCookies(`old_${CONSENT_COOKIE_NAME}=x; ${CONSENT_COOKIE_NAME}_v2=x`)).toBe(0);
    expect(
      countConsentCookies(`${CONSENT_COOKIE_NAME}=corrupted; ${CONSENT_COOKIE_NAME}=%7Bnope`),
    ).toBe(2);
  });

  it("THE PREMISE: the planted copy is the one a browser hands over first", () => {
    // Measured, not assumed. If this ordering were wrong the whole rule would be
    // solving a problem that does not exist, and every test below would pass for
    // the wrong reason.
    stubDomainCookieJar(hijacked());
    expect(document.cookie.startsWith(`${CONSENT_COOKIE_NAME}=${plantedValue}`)).toBe(true);
    expect(parseConsentPayload(plantedValue)).toEqual(planted);
    expect(countConsentCookies(document.cookie)).toBe(2);
  });

  it("deletes the planted copy and continues with the shared record", () => {
    stubConsoleReports();
    const { entries } = stubDomainCookieJar(hijacked());

    expect(readConsentCookie()).toEqual(real);
    // What survived is the SHARED copy specifically, not merely "a copy" —
    // asserting on the value alone would pass if the repair had deleted the wrong
    // one and the two records happened to look alike.
    expect(entries().filter((entry) => entry.name === CONSENT_COOKIE_NAME)).toEqual([
      sharedCopy(realValue),
    ]);
  });

  it("THE CONSENT STAKE: a planted grant is not what the site acts on", () => {
    // The test that matters most on this cookie, and the reason its contract
    // adopted rule 6 at all. `consentCookieSupersedes(cookie, null)` is the D-4
    // branch: with Cookiebot holding no answer, a cookie that ALLOWS a category is
    // adopted into the CMP — which suppresses the banner and, through
    // `metaLoadGranted`, opens the Meta pixel's load gate. The visitor here
    // refused everything on the platform; a sibling host planted a grant.
    stubConsoleReports();
    stubDomainCookieJar(hijacked());

    const cookie = readConsentCookie();
    expect(cookie).toEqual(real);
    // Without the repair this would be the planted grant and the answer would be
    // `true`: consent adopted, banner gone, pixel loading, nobody asked.
    expect(consentCookieSupersedes(cookie!, null)).toBe(false);
    expect(cookie!.m).toBe(false);
  });

  it("leaves newest-wins alone: the survivor still loses to a genuinely newer choice", () => {
    // The repair decides which COPY is real. Which RECORD governs is this
    // contract's own rule and is not touched — including in the direction that
    // would have been convenient, where the planted copy carried the newest `t`
    // of the three and still counts for nothing.
    stubConsoleReports();
    stubDomainCookieJar(hijacked());

    const survivor = readConsentCookie();
    const newerOnThisHost: ConsentPayload = {
      v: 1,
      t: "2026-08-12T18:00:00.000Z",
      p: false,
      s: true,
      m: false,
    };
    expect(newestRecordedConsent(newerOnThisHost, survivor)).toEqual(newerOnThisHost);
    expect(consentCookieSupersedes(survivor!, newerOnThisHost)).toBe(false);
  });

  it("leaves newest-wins alone: the survivor still beats an older choice", () => {
    stubConsoleReports();
    stubDomainCookieJar(hijacked());

    const survivor = readConsentCookie();
    const olderOnThisHost: ConsentPayload = {
      v: 1,
      t: "2026-08-01T00:00:00.000Z",
      p: true,
      s: true,
      m: true,
    };
    expect(newestRecordedConsent(olderOnThisHost, survivor)).toEqual(real);
    // And the return leg pushes the survivor into Cookiebot, which is the
    // withdrawal reaching this host — exactly what it is for.
    expect(consentCookieSupersedes(survivor!, olderOnThisHost)).toBe(true);
  });

  it("wipes with NO Domain — the one line that could erase the choice on both hosts", () => {
    stubConsoleReports();
    const { writes } = stubDomainCookieJar(hijacked());

    readConsentCookie();

    expect(writes).toEqual([`${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/`]);
    expect(writes[0]).not.toContain("Domain");
    // The same string the builder hands out, rather than a second deletion
    // spelled out at the call site.
    expect(buildConsentHostOnlyDeletion()).toBe(writes[0]);
  });

  it("measures what the Domain-carrying variant would have cost", () => {
    // Not a hypothetical and not a comment: the same jar, one attribute
    // different. The visitor's real answer is gone from BOTH hosts and the
    // planted grant is what remains — the platform then reads a consent nobody
    // gave, and this host adopts it. That is why the host-only deletion has a
    // name of its own.
    const { entries } = stubDomainCookieJar(hijacked());

    document.cookie = `${buildConsentHostOnlyDeletion()}; Domain=.letsdog.nl`;

    expect(entries().filter((entry) => entry.name === CONSENT_COOKIE_NAME)).toEqual([
      hostOnlyCopy(plantedValue),
    ]);
  });

  it("reports at WARNING level when nothing survives the wipe", async () => {
    const reported = stubConsoleReports();
    stubDomainCookieJar(hijacked());
    const consent = await freshConsent();

    consent.readConsentCookie();

    expect(reported.error).not.toHaveBeenCalled();
    expect(reported.warn).toHaveBeenCalledTimes(1);
    // Same sentence as the `ld_attribution` report, prefix aside, so one operator
    // grepping one fixed string finds the same failure on either cookie. The
    // platform's T-575 should mirror this text rather than invent its own.
    expect(reported.warn).toHaveBeenCalledWith(
      `[consent] MEER DAN EEN ${CONSENT_COOKIE_NAME}-cookie`,
      { cookie: CONSENT_COOKIE_NAME, persists: false },
    );
  });

  it("reports at ERROR level when a duplicate survives the wipe", async () => {
    // A copy the host-only deletion cannot reach sits on the shared domain or on
    // another path. That is not one subdomain planting something — it is a second
    // writer on the shared record, which is the shape that needs a human.
    const reported = stubConsoleReports();
    stubDomainCookieJar(bothShared());
    const consent = await freshConsent();

    consent.readConsentCookie();

    expect(reported.warn).not.toHaveBeenCalled();
    expect(reported.error).toHaveBeenCalledTimes(1);
    expect(reported.error).toHaveBeenCalledWith(
      `[consent] MEER DAN EEN ${CONSENT_COOKIE_NAME}-cookie: OOK NA de host-only wisopdracht`,
      { cookie: CONSENT_COOKIE_NAME, persists: true },
    );
  });

  it("reports once per page session, not once per read", async () => {
    // Every Cookiebot event reads this cookie, and so does every Meta send and
    // every PostHog consent check. The duplicate here is deliberately one that
    // PERSISTS, so each read really does meet it again — a jar that repairs itself
    // on the first read would prove nothing about the latch.
    const reported = stubConsoleReports();
    stubDomainCookieJar(bothShared());
    const consent = await freshConsent();

    consent.readConsentCookie();
    consent.readConsentCookie();
    consent.readConsentCookie();

    expect(reported.error).toHaveBeenCalledTimes(1);
  });

  it("leaves single-copy traffic completely alone", () => {
    const reported = stubConsoleReports();
    const { writes } = stubDomainCookieJar([sharedCopy(realValue)]);

    expect(readConsentCookie()).toEqual(real);
    expect(writes).toEqual([]);
    expect(reported.error).not.toHaveBeenCalled();
    expect(reported.warn).not.toHaveBeenCalled();
  });

  it("leaves a host-only copy alone when it is the only one — the localhost case", () => {
    // THE ACCEPTED PRICE, and the reason the repair is gated on a count. On
    // localhost and on a *.pages.dev preview this site writes host-only itself
    // (`consentCookieDomain` returns null there, because a Domain the browser
    // cannot match makes the write vanish without a word), so an unconditional
    // wipe would delete its own record on every read and the screen would claim
    // to have saved a choice that does not exist. The count is what stops it.
    const reported = stubConsoleReports();
    expect(consentCookieDomain("localhost")).toBeNull();
    const { writes, entries } = stubDomainCookieJar([hostOnlyCopy(plantedValue)]);

    expect(readConsentCookie()).toEqual(planted);
    expect(writes).toEqual([]);
    expect(entries()).toEqual([hostOnlyCopy(plantedValue)]);
    expect(reported.error).not.toHaveBeenCalled();
    expect(reported.warn).not.toHaveBeenCalled();
  });

  it("never touches ld_attribution, which repairs its own duplicates", () => {
    // Each read repairs its OWN name and nothing else. A deletion reaching across
    // would fire outside any count the other reader made, and on `ld_attribution`
    // a copy deleted without a duplicate present is a first touch nobody gets
    // back.
    stubConsoleReports();
    const attributionCopy: JarEntry = { name: "ld_attribution", value: "whatever", domain: null };
    const { entries } = stubDomainCookieJar([attributionCopy, ...hijacked()]);

    readConsentCookie();

    expect(entries().filter((entry) => entry.name === "ld_attribution")).toEqual([
      attributionCopy,
    ]);
  });
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
    expect(readConsentCookie()?.m).toBe(true);
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
    expect(readConsentCookie()?.t).toBe(
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
    expect(readConsentCookie()).toEqual(
      fromPlatform,
    );
  });

  it("does overwrite an older choice", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie({ ...payload, t: "2026-08-07T00:00:00.000Z", m: true }, "letsdog.nl");
    writeConsentCookie({ ...payload, t: "2026-08-08T10:00:00.000Z", m: false }, "letsdog.nl");
    expect(writes).toHaveLength(2);
    expect(readConsentCookie()?.m).toBe(false);
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
    const after = readConsentCookie();
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
    expect(readConsentCookie()).toEqual(granted);
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

  it("does not act on a comparison it could not make", () => {
    expect(consentCookieSupersedes({ ...newer, t: "gisteren", m: false }, cookiebot)).toBe(false);
    expect(consentCookieSupersedes({ ...newer, m: false }, { ...cookiebot, t: "" })).toBe(false);
  });
});

// D-4, settled by the owner on 2026-08-13: honour a real choice wherever the
// visitor made it, and only ask when there is no choice on record. The whole
// question lives in the null branch, so it gets its own block — the three guards
// above are unchanged and still cover the case where Cookiebot HAS an answer.
describe("consentCookieSupersedes — no local answer at all (D-4)", () => {
  const chosenElsewhere = "2026-08-13T09:00:00.000Z";
  const granting: ConsentPayload = {
    v: 1,
    t: chosenElsewhere,
    p: false,
    s: true,
    m: true,
  };

  it("adopts a choice that allows something", () => {
    // The visitor answered on mijn.letsdog.nl and is opening letsdog.nl for the
    // first time. Since the platform put a consent prompt on its funnel routes
    // (its D-103) this is the normal path for ad traffic, not an edge case.
    expect(consentCookieSupersedes(granting, null)).toBe(true);
  });

  it("adopts on ANY single category, not just marketing", () => {
    // The clamp is drawn at "allows nothing", not at any particular category —
    // preferences-only is still a choice the visitor really made.
    expect(consentCookieSupersedes({ ...granting, s: false, m: false, p: true }, null)).toBe(true);
    expect(consentCookieSupersedes({ ...granting, p: false, m: false, s: true }, null)).toBe(true);
    expect(consentCookieSupersedes({ ...granting, p: false, s: false, m: true }, null)).toBe(true);
  });

  // THE CLAMP. Deleting it is the one edit this block exists to stop.
  it("refuses an all-false cookie, so the banner is shown", () => {
    expect(consentCookieSupersedes({ ...granting, p: false, s: false, m: false }, null)).toBe(false);
  });

  // The same clamp, stated as the failure it prevents rather than as a rule:
  // `withdraw()` clears hasResponse, so a withdrawal and "never asked here" are
  // the SAME observable state — and the all-false cookie sitting there was
  // written by this site itself, moments ago. Adopting it would turn "withdrawn"
  // into "declined" and take the banner away from someone entitled to see it.
  it("never re-adopts this site's own withdrawal", () => {
    stubCookieJar();
    writeConsentCookie({ ...granting, p: true }, "letsdog.nl");
    recordConsentWithdrawal("letsdog.nl", "2026-08-13T09:30:00.000Z");
    const afterWithdrawal = readConsentCookie()!;
    // fresher than the choice it took back, and Cookiebot now reports nothing —
    // exactly the shape that would win a newest-wins comparison.
    expect(afterWithdrawal.t).toBe("2026-08-13T09:30:00.000Z");
    expect(consentCookieSupersedes(afterWithdrawal, null)).toBe(false);
  });

  it("still refuses a contract version it does not know", () => {
    // The version guard is checked first, so it governs this branch too: a v2
    // payload may carry a category we would silently drop.
    expect(consentCookieSupersedes({ ...granting, v: 2 }, null)).toBe(false);
  });

  it("does not need a readable timestamp to adopt", () => {
    // There is nothing to compare against, so `t` is not part of the decision
    // here — unlike every branch above it. Pinned so the asymmetry is deliberate.
    expect(consentCookieSupersedes({ ...granting, t: "gisteren" }, null)).toBe(true);
  });
});

// `cookiebotDouble` is defined further down, under THE TRIGGER banner, because
// that is where its measurements belong. Short version: no arguments gives you
// the CMP production delivers — absent at subscribe time, published before it is
// constructed, silent unless you `fire()` — and every friendlier world is an
// option spelled out at the call site.
describe("submitConsentToCookiebot", () => {
  it("hands the three categories to Cookiebot in contract order", () => {
    // OPT-IN, and the reason is the unit under test: this is the API call in
    // isolation, so the CMP has to be constructed before the first line runs.
    // Whether it ever gets there is the trigger's problem, tested below.
    const cookiebot = cookiebotDouble({ arrival: "before-hydration", constructed: true });
    expect(submitConsentToCookiebot({ ...payload, p: true, s: false, m: true })).toBe(true);
    expect(cookiebot.submitCustomConsent).toHaveBeenCalledWith(true, false, true);
  });

  it("reports that it did nothing when Cookiebot is not there", () => {
    // An ad blocker, or a uc.js that never arrived — the hostile default IS this
    // state, so it needs no setup at all.
    cookiebotDouble();
    expect(submitConsentToCookiebot(payload)).toBe(false);
  });

  it("reports that it did nothing when Cookiebot is published but not constructed", () => {
    // The half-built object, in the shape uc.js really produces rather than a
    // hand-written `{ hasResponse: true }`. The caller has to be able to tell
    // this apart from "declined to sync" — it is the state that swallowed the
    // return leg on the deployed poll build.
    cookiebotDouble({ arrival: "before-hydration" });
    expect(submitConsentToCookiebot(payload)).toBe(false);
  });
});

// =============================================================================
// THE TRIGGER (T-43). Every block above tests a DECISION. This one tests whether
// the decision is ever asked for.
// =============================================================================
// Measured on production 2026-08-15: with an all-true `ld_consent` on
// `.letsdog.nl` and no `CookieConsent`, letsdog.nl showed the banner anyway,
// `Cookiebot.hasResponse` stayed false, `_ga` and `fbq` stayed absent, and the
// dataLayer carried only the denied `consent default` and never an update.
// Dispatching `CookiebotOnLoad` by hand flipped `hasResponse` at once — so the
// deployed bundle held a correct `consentCookieSupersedes`, a correct
// `submitConsentToCookiebot` and a subscribe-time read that never called either.
//
// WHY NOTHING ABOVE SAW IT, AND WHAT THAT ASKS OF THESE TESTS. A test subscribes
// and then fires; a browser fires and then mounts React. In the first order the
// bug cannot occur, so a behaviour-only test is green on the broken code too —
// which is how a suite of 291 shipped this for a week. The first test below
// therefore reproduces the ORDER rather than the behaviour, and it is the one
// that fails on the old guard. The rest pin the two halves the narrowing keeps
// apart: a stored answer still gets its beat to settle, an absent one no longer
// waits for an event that already happened.

/**
 * An answer Cookiebot has settled, in the three categories the contract carries
 * plus the moment it stamped. `at` is what `readCookiebotConsent` turns into `t`.
 */
type SettledAnswer = { p: boolean; s: boolean; m: boolean; at: string };

type CookiebotDoubleOptions = {
  /**
   * WHEN the object appears, relative to our subscription. Production is
   * `"after-hydration"` and that is the default; the other value is a lie a test
   * buys on purpose, and has to name.
   */
  arrival?: "after-hydration" | "before-hydration";
  /** Whether the object already on the page has its API built. */
  constructed?: boolean;
  /** An answer it has already settled. Implies `constructed`. */
  answer?: SettledAnswer;
};

/**
 * THE COOKIEBOT DOUBLE, AND IT IS HOSTILE BY DEFAULT (T-45).
 * =============================================================================
 * A double that models the CMP as arriving all at once is why 307 green tests
 * agreed with a broken site through two deploys (T-43, PRs #85 and #86). So the
 * default here is the CMP production actually delivers, measured on letsdog.nl
 * 2026-08-15, and every friendlier world is an option a test must name.
 *
 * The default has exactly three properties, and each one killed a shipped fix:
 *
 * 1. NOTHING IS THERE AT SUBSCRIBE TIME. All twelve app chunks finish at 210 ms;
 *    uc.js lands at 221 ms, configuration.js at 441, cc.js at 549. React mounts
 *    into a page with no `window.Cookiebot` in it, so a subscribe-time read is
 *    reading an empty room. Call `publishes()` / `constructs()` / `settles()` to
 *    move time forward the way uc.js does.
 *
 * 2. PUBLISHED COMES BEFORE CONSTRUCTED. `publishes()` gives you the object uc.js
 *    assigns at byte 61890 — `hasResponse` and `consent` perfectly readable, and
 *    NO `submitCustomConsent`, which it only attaches at byte 105795, in a later
 *    phase. An object that answers while its API does not exist is not a
 *    hypothetical; it is what the deployed poll build spent its one delivery on.
 *
 * 3. IT NEVER FIRES AN EVENT BY ITSELF. On a normal page load Cookiebot fires
 *    before React mounts, so the events are simply gone — an event with no
 *    listener is not queued. A test that wants one dispatches `fire()` and thereby
 *    says out loud that it is testing the route production does not use.
 *
 * `submitCustomConsent` is the double's own `vi.fn()`, and it is attached from
 * `constructs()` onwards and never at `publishes()` — so "did the return leg
 * reach the API" is asserted against the same object whose absence is the bug.
 */
function cookiebotDouble(options: CookiebotDoubleOptions = {}) {
  const { arrival = "after-hydration", constructed, answer } = options;
  if (arrival === "after-hydration" && (constructed !== undefined || answer !== undefined)) {
    // Half-stated opt-in. `constructed`/`answer` describe an object that is
    // already on the page, which is the very thing production does not do — so
    // the test has to say both halves or neither.
    throw new Error(
      'cookiebotDouble: `constructed` and `answer` describe an object that is ' +
        'already on the page. Say `arrival: "before-hydration"` as well.',
    );
  }

  const submitCustomConsent = vi.fn();

  /** Published, not constructed. Everything except the method. */
  const publishedShape = () => ({
    hasResponse: false,
    consent: { necessary: true, preferences: false, statistics: false, marketing: false },
    consentUTC: null,
  });
  /**
   * Constructed, nothing settled: the API exists, the answer does not.
   * Indistinguishable — from the object alone — from a Cookiebot mid-flight over
   * a stored answer, which is why the guard reads a cookie instead of this state.
   */
  const constructedShape = () => ({ ...publishedShape(), submitCustomConsent });
  const settledShape = ({ p, s, m, at }: SettledAnswer) => ({
    hasResponse: true,
    consent: { necessary: true, preferences: p, statistics: s, marketing: m },
    consentUTC: new Date(at),
    submitCustomConsent,
  });

  const listeners = new Map<string, Set<() => void>>();
  const win: {
    Cookiebot?: unknown;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  } = {
    Cookiebot: undefined,
    addEventListener(type, listener) {
      const forType = listeners.get(type) ?? new Set<() => void>();
      forType.add(listener);
      listeners.set(type, forType);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
  };
  if (arrival === "before-hydration") {
    win.Cookiebot = answer
      ? settledShape(answer)
      : constructed
        ? constructedShape()
        : publishedShape();
  }
  vi.stubGlobal("window", win);

  return {
    /** The spy the object exposes from `constructs()` onwards — never before. */
    submitCustomConsent,
    /** uc.js assigns `window.Cookiebot = this`: the object answers, the API does not exist. */
    publishes() {
      win.Cookiebot = publishedShape();
    },
    /** The later phase, where uc.js attaches `submitCustomConsent`. */
    constructs() {
      win.Cookiebot = constructedShape();
    },
    /** Cookiebot settles an answer — a stored one arriving, or a banner click landing. */
    settles(next: SettledAnswer) {
      win.Cookiebot = settledShape(next);
    },
    /** Escape hatch for a shape the four phases above cannot express. */
    becomes(next: unknown) {
      win.Cookiebot = next;
    },
    /** A deliberately dispatched event. The double fires nothing on its own. */
    fire(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
  };
}

/**
 * Every subscription in the two blocks below goes through here, and each block
 * tears them all down afterwards.
 *
 * NOT TIDINESS. A subscription can now hold a live interval, and one left running
 * past `vi.unstubAllGlobals()` ticks into a world with no `window` and takes an
 * unrelated test down with it — a leak in the rig that would read as a failure in
 * the code. `useEffect` cleanup is what does this in production; this is the same
 * discipline, and it makes every test here exercise the unsubscribe path as well.
 */
const openSubscriptions: (() => void)[] = [];
function subscribe(handler: (consent: ConsentPayload | null) => void) {
  const unsubscribe = onCookiebotConsent(handler);
  openSubscriptions.push(unsubscribe);
  return unsubscribe;
}
function closeSubscriptions() {
  while (openSubscriptions.length) openSubscriptions.pop()!();
  vi.useRealTimers();
}

const chosenOnPlatform = "2026-08-15T08:00:00.000Z";

/**
 * Cookiebot's own cookie, host-only as uc.js writes it. Only its PRESENCE is ever
 * read, so the value is a stand-in — but a realistic one, because a test carrying
 * an empty value would quietly bless a reader that requires content.
 */
const storedAnswer: JarEntry = {
  name: "CookieConsent",
  value: "%7Bstamp%3A%27dQw4w9%27%2Cnecessary%3Atrue%7D",
  domain: null,
};

/** The visitor's answer as the platform left it on the shared domain. */
const platformChoice = (p: boolean, s: boolean, m: boolean): JarEntry => ({
  name: CONSENT_COOKIE_NAME,
  value: serializeConsentPayload({ v: 1, t: chosenOnPlatform, p, s, m }),
  domain: ".letsdog.nl",
});

describe("onCookiebotConsent — the direct delivery (T-43)", () => {
  // Nested, so it drains before the file-level `vi.unstubAllGlobals()`.
  afterEach(closeSubscriptions);

  // THE ORDER TEST. Written out rather than imported from COOKIEBOT_EVENTS on
  // purpose: this is a statement about what uc.js fires, and it has to stay true
  // independently of the list the module happens to subscribe to.
  const COOKIEBOT_FIRES = [
    "CookiebotOnConsentReady",
    "CookiebotOnAccept",
    "CookiebotOnDecline",
    "CookiebotOnLoad",
  ];

  it("still reaches the handler when Cookiebot's events all fired before we subscribed", () => {
    // OPT-IN, and it is the premise rather than a convenience: "the events fired
    // before we subscribed" only means anything if there is an object to read
    // once we do. A client-side navigation into a mounting subscriber is the real
    // shape of it — first load is the hostile default, tested further down.
    stubDomainCookieJar([]);
    const cookiebot = cookiebotDouble({ arrival: "before-hydration", constructed: true });
    const seen: (ConsentPayload | null)[] = [];

    // The page happens first. Nothing is listening, so these are simply gone —
    // the browser does not replay them for a component that mounts later.
    for (const event of COOKIEBOT_FIRES) cookiebot.fire(event);

    subscribe((consent) => seen.push(consent));

    // On the old guard this array stays empty, and every consumer — ConsentSync
    // above all — is never asked anything at all.
    expect(seen).toEqual([null]);
  });

  it("delivers a settled answer immediately, exactly as before", () => {
    // OPT-IN: the subject is the read, so the answer has to predate the read.
    stubDomainCookieJar([storedAnswer]);
    cookiebotDouble({
      arrival: "before-hydration",
      answer: { p: false, s: true, m: false, at: "2026-08-15T07:30:00.000Z" },
    });
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));

    expect(seen).toEqual([{ v: 1, t: "2026-08-15T07:30:00.000Z", p: false, s: true, m: false }]);
  });

  // THE HAZARD THE GUARD STILL EXISTS FOR, and the reason it was narrowed rather
  // than removed. Cookiebot holds a stored REFUSAL that has not settled yet: the
  // object is there, `hasResponse` is still false, so the read is null. Handing
  // that null on would adopt the other host's grant — D-4 adopts a granting
  // cookie whenever Cookiebot reports nothing — and destroy a local refusal that
  // was one beat from arriving. The clamp cannot catch this one: it inspects the
  // COOKIE, and the cookie grants.
  it("says nothing while a stored answer has not settled yet", () => {
    // OPT-IN: the guard under test runs on the SUBSCRIBE-TIME read, so the
    // mid-flight object has to already be there. The same hazard reached through
    // the wait is the second test of the next block.
    stubDomainCookieJar([storedAnswer, platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble({ arrival: "before-hydration", constructed: true });
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    expect(seen).toEqual([]);

    // uc.js finishes, with the refusal the visitor really made on this host.
    cookiebot.settles({ p: false, s: false, m: false, at: "2026-08-14T20:00:00.000Z" });
    cookiebot.fire("CookiebotOnConsentReady");
    expect(seen).toEqual([{ v: 1, t: "2026-08-14T20:00:00.000Z", p: false, s: false, m: false }]);
  });

  // The return leg driven THROUGH the trigger instead of around it. Every
  // assertion here already held when the handler was called by hand; none of them
  // was ever reached on a real page load.
  it("reaches the adoption path for a platform grant with no local answer", () => {
    // NO OPT-IN. The whole return leg, in production's ordering: ConsentSync
    // mounts into a page with no CMP in it, and the adoption still has to happen
    // once uc.js finishes. Every assertion here already held when the handler was
    // called by hand; none of them was ever reached on a real page load.
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();

    // ConsentSync's body, verbatim in shape: read the cookie, ask the predicate,
    // hand it over. Nothing is mocked between the trigger and Cookiebot's API.
    subscribe((cb) => {
      const cookie = readConsentCookie();
      if (!cookie || !consentCookieSupersedes(cookie, cb)) return;
      submitConsentToCookiebot(cookie);
    });

    // 210 ms of hydrated page with no uc.js in it yet: nothing to adopt into.
    vi.advanceTimersByTime(200);
    expect(cookiebot.submitCustomConsent).not.toHaveBeenCalled();

    cookiebot.constructs();
    vi.advanceTimersByTime(1000);

    expect(cookiebot.submitCustomConsent).toHaveBeenCalledWith(true, true, true);
  });

  it("delivers for a platform refusal too, and the D-4 clamp still shows the banner", () => {
    // Delivery and adoption are different questions and this is where they part.
    // The handler MUST be reached — otherwise nothing about this visitor is
    // observable at all — and must then decline, so Cookiebot keeps no response
    // and renders its banner. The accepted price of the clamp, not a gap in the
    // fix. It is also the visitor who withdrew here yesterday: their own
    // all-false cookie is what they arrive with today.
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(false, false, false)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((cb) => {
      seen.push(cb);
      const cookie = readConsentCookie();
      if (!cookie || !consentCookieSupersedes(cookie, cb)) return;
      submitConsentToCookiebot(cookie);
    });

    cookiebot.constructs();
    vi.advanceTimersByTime(1000);

    expect(seen).toEqual([null]);
    expect(cookiebot.submitCustomConsent).not.toHaveBeenCalled();
  });

  it("stays silent when there is no Cookiebot object at all", () => {
    // An ad blocker, or a uc.js that never arrived. "No CMP here" is not "no
    // choice made": reporting null would revoke Meta's pixel and open the
    // adoption path on the strength of a choice nobody made. Not even an event
    // may open it — the object check sits ahead of the `fromEvent` branch.
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    cookiebot.fire("CookiebotOnLoad");

    expect(seen).toEqual([]);
  });

  it("does not mistake a CookieConsentBulkTicket for a stored answer", () => {
    // Cookiebot's neighbouring cookies share the prefix. A `startsWith` match
    // would read one of them as "an answer is stored" and lay the guard straight
    // back over the whole return leg — the same silence as before, under a suite
    // that still passes.
    vi.useFakeTimers();
    stubDomainCookieJar([
      { name: "CookieConsentBulkTicket", value: "ticket", domain: null },
      platformChoice(true, true, true),
    ]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    cookiebot.constructs();
    vi.advanceTimersByTime(1000);

    expect(seen).toEqual([null]);
  });
});

// =============================================================================
// WAITING FOR THE OBJECT. The block above narrowed the guard; this one is about
// the `return` one line ABOVE that guard, which is where production actually
// stopped.
// =============================================================================
// Resource timing on letsdog.nl, 2026-08-15, with the narrowing deployed and
// verified present in the served chunk: domInteractive 137 ms, all twelve app
// chunks done at 210 ms, uc.js 221 ms, configuration.js 441 ms, cc.js 549 ms.
// The subscription is created before Cookiebot exists, so `deliver(false)` exits
// on `!window.Cookiebot` and the narrowed guard is never reached. And the event
// fallback is dead: we are listening from 210 ms, an event-borne delivery skips
// the cookie check entirely, and `hasResponse` still never flipped — so no
// Cookiebot event arrives on a normal page load, while a hand-dispatched one
// works. Both halves of the delivery mechanism missed.
//
// The order these tests reproduce is therefore the second one nobody had: not
// "the events already fired" but "the CMP is not there yet". Every test below
// takes the hostile default — `window.Cookiebot` undefined, which is what a real
// page load looks like at the moment React mounts — and the subject is the WAIT
// itself: that it survives an empty page, ends on a delivery, and dies with the
// subscription. The published-but-hollow phase in the middle is the next block's
// whole subject, so only the first test walks it here; the rest go straight to
// `constructs()` to keep the timer assertions about the timer.
describe("onCookiebotConsent — waiting for Cookiebot to arrive (T-43)", () => {
  afterEach(closeSubscriptions);

  it("delivers once Cookiebot appears, having not been there at subscribe time", () => {
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    expect(seen).toEqual([]);

    // 200 ms of hydrated page with no CMP in it. Saying anything here would be
    // inventing a choice; the wait's whole job is to say nothing yet.
    vi.advanceTimersByTime(200);
    expect(seen).toEqual([]);

    // uc.js publishes the object at byte 61890 and is not done. Still nothing to
    // say, and — the part the poll build got wrong — still nothing spent.
    cookiebot.publishes();
    vi.advanceTimersByTime(200);
    expect(seen).toEqual([]);

    // Byte 105795. Cookiebot is constructed and knows nothing, and nothing is
    // stored for it to learn — so the read is final and the visitor's platform
    // choice can finally be acted on.
    cookiebot.constructs();
    vi.advanceTimersByTime(1000);

    // Exactly one delivery, which also says the wait stopped itself.
    expect(seen).toEqual([null]);
  });

  it("still says nothing when Cookiebot arrives with an answer it has not settled", () => {
    // The stored-refusal hazard, now reachable through the wait as well. The
    // narrowing is what holds here, and it must hold identically whether the
    // object was there at subscribe time or turned up 300 ms later.
    vi.useFakeTimers();
    stubDomainCookieJar([storedAnswer, platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    cookiebot.constructs();
    vi.advanceTimersByTime(1000);

    expect(seen).toEqual([]);
  });

  it("keeps waiting through the settle race and delivers the real answer", () => {
    // WHY THE WAIT ENDS ON A DELIVERY AND NOT ON THE OBJECT APPEARING. Stopping
    // at "Cookiebot exists" would hand this visitor to the event path — the one
    // measured as never firing. So the wait keeps looking, and the answer that
    // arrives is Cookiebot's own refusal, not the cookie's grant.
    vi.useFakeTimers();
    stubDomainCookieJar([storedAnswer, platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    cookiebot.constructs();
    vi.advanceTimersByTime(200);
    expect(seen).toEqual([]);

    cookiebot.settles({ p: false, s: false, m: false, at: "2026-08-14T20:00:00.000Z" });
    vi.advanceTimersByTime(1000);

    expect(seen).toEqual([{ v: 1, t: "2026-08-14T20:00:00.000Z", p: false, s: false, m: false }]);
  });

  it("does not deliver twice when an event arrives while we are still waiting", () => {
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    expect(vi.getTimerCount()).toBe(1);

    // Cookiebot arrives and announces itself in the same beat — the ordering we
    // may no longer depend on, but which is still allowed to happen.
    cookiebot.constructs();
    cookiebot.fire("CookiebotOnLoad");
    expect(seen).toEqual([null]);

    // The event ended the wait, stated directly rather than inferred from the
    // absence of a second delivery.
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([null]);
  });

  it("stops waiting when the subscription is torn down", () => {
    // Every caller unsubscribes from a `useEffect` cleanup. A tick surviving that
    // reads a page that may be gone and calls a handler nobody owns any more.
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    const unsubscribe = subscribe((consent) => seen.push(consent));
    expect(vi.getTimerCount()).toBe(1);

    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);

    cookiebot.constructs();
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([]);
  });

  it("gives up rather than waiting forever", () => {
    // A uc.js that never arrives: blocked, or a network that gave up. Beyond the
    // bound the visitor has been reading the page for ten seconds, and quietly
    // rewriting their consent state then is worse than leaving the banner up —
    // so a late arrival gets nothing, exactly as a blocked one always did.
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(60_000);
    expect(vi.getTimerCount()).toBe(0);

    cookiebot.constructs();
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual([]);
  });
});

// =============================================================================
// PUBLISHED IS NOT CONSTRUCTED. The third order nobody had, and the one that
// survived both previous repairs.
// =============================================================================
// Measured on the deployed poll build: `hasResponse` still false after 2500 ms,
// dialog on screen, no `_ga`, `fbq` undefined — while at rest the object was
// complete (`submitCustomConsent` a function, `consent` present) and a
// hand-dispatched `CookiebotOnLoad` flipped `hasResponse` instantly. Listeners
// attached, downstream chain proven good, and yet no submit had happened during
// load: `synced.current` was still false.
//
// What fits all of that is a tick landing in the interval where uc.js has
// published `window.Cookiebot` but not yet built its API — byte 61890 versus
// 105795 of the vendor file, in different phases, with the three scripts landing
// 221 / 441 / 549 ms apart. The tick read the object, found no `CookieConsent`,
// delivered `null` — correctly, by the letter of the guard — and ConsentSync's
// `submitConsentToCookiebot` then found no method, returned false, and left
// `synced.current` false. The delivery had "succeeded", so the wait stopped. One
// tick, one wasted delivery, no error anywhere.
//
// EVERY TEST BELOW WALKS THROUGH THE PUBLISHED PHASE, because that is the state
// a green suite kept agreeing with a broken site about. `publishes()` is the
// object at byte 61890; `constructs()` is the same object once byte 105795 has
// run. No test here may skip the first for the second.
describe("onCookiebotConsent — published is not constructed (T-43)", () => {
  afterEach(closeSubscriptions);

  it("says nothing while Cookiebot is published but not yet constructed", () => {
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    cookiebot.publishes();

    // A full second of ticks against a hollow object. Reading `hasResponse` off
    // it would be the same premature read this module refuses everywhere else.
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([]);
    // And the wait is still alive — nothing landed, so nothing was spent.
    expect(vi.getTimerCount()).toBe(1);

    cookiebot.constructs();
    vi.advanceTimersByTime(100);
    expect(seen).toEqual([null]);
  });

  // THE PRODUCTION FAILURE, END TO END. On the deployed poll build this delivers
  // at t=0 into the hollow object, `submitConsentToCookiebot` returns false, the
  // wait stops, and the method arriving later reaches nobody — `submitCustomConsent`
  // is never called, which is exactly what `hasResponse: false` after 2500 ms
  // looked like at the objects.
  it("reaches the adoption path when the API is constructed, not when it is published", () => {
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();

    subscribe((cb) => {
      const cookie = readConsentCookie();
      if (!cookie || !consentCookieSupersedes(cookie, cb)) return;
      submitConsentToCookiebot(cookie);
    });
    cookiebot.publishes();

    vi.advanceTimersByTime(1000);
    expect(cookiebot.submitCustomConsent).not.toHaveBeenCalled();

    // uc.js finishes constructing. The wait is still there to notice.
    cookiebot.constructs();
    vi.advanceTimersByTime(100);

    expect(cookiebot.submitCustomConsent).toHaveBeenCalledTimes(1);
    expect(cookiebot.submitCustomConsent).toHaveBeenCalledWith(true, true, true);
  });

  it("does not deliver on an event either while the API is only published", () => {
    // Readiness gates EVERY route. An event carrying a state we cannot read
    // safely is not better evidence than a tick carrying the same state — and
    // treating it as such would spend the delivery and stop the wait, which is
    // the whole failure in a different costume.
    vi.useFakeTimers();
    stubDomainCookieJar([platformChoice(true, true, true)]);
    const cookiebot = cookiebotDouble();
    const seen: (ConsentPayload | null)[] = [];

    subscribe((consent) => seen.push(consent));
    cookiebot.publishes();
    cookiebot.fire("CookiebotOnLoad");

    expect(seen).toEqual([]);
    expect(vi.getTimerCount()).toBe(1);
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
    const fromCookie = readConsentCookie()!;
    expect(consentCookieSupersedes(fromCookie, stale)).toBe(true);

    // 3. Cookiebot is put into that choice and stamps the moment at NOW
    vi.stubGlobal("window", { Cookiebot: { submitCustomConsent } });
    submitConsentToCookiebot(fromCookie);
    expect(submitCustomConsent).toHaveBeenCalledWith(false, false, false);
    const echoed: ConsentPayload = { v: 1, t: "2026-08-08T09:30:00.000Z", p: false, s: false, m: false };

    // 4. its consent event reaches the write side, which must stay silent
    writeConsentCookie(echoed, "letsdog.nl");
    expect(writes).toHaveLength(1);
    expect(readConsentCookie()?.t).toBe(
      chosenOnPlatform,
    );

    // 5. and a second pass adopts nothing, whatever the clocks say
    expect(consentCookieSupersedes(fromCookie, echoed)).toBe(false);
  });
});

// The same sequence for the visitor D-4 is about: the choice was made on
// mijn.letsdog.nl and this host has NEVER been answered, so there is no
// Cookiebot record to be newer than. The read-back trap of step 4 is identical,
// and it is the reason the cookie's `t` survives a path that never wrote it.
describe("a choice made on the platform, never answered here, end to end", () => {
  it("adopts once and still leaves the cookie's own timestamp alone", () => {
    const chosenOnPlatform = "2026-08-13T08:00:00.000Z";
    const { writes } = stubCookieJar();
    const submitCustomConsent = vi.fn();

    // 1. the platform wrote the visitor's grant into the shared cookie
    writeConsentCookie(
      { v: 1, t: chosenOnPlatform, p: false, s: true, m: true },
      "letsdog.nl",
    );
    // 2. the visitor lands here for the first time: Cookiebot has no response
    const fromCookie = readConsentCookie()!;
    expect(consentCookieSupersedes(fromCookie, null)).toBe(true);

    // 3. Cookiebot is put into that choice and stamps the moment at NOW
    vi.stubGlobal("window", { Cookiebot: { submitCustomConsent } });
    expect(submitConsentToCookiebot(fromCookie)).toBe(true);
    expect(submitCustomConsent).toHaveBeenCalledWith(false, true, true);
    const echoed: ConsentPayload = { v: 1, t: "2026-08-13T09:45:00.000Z", p: false, s: true, m: true };

    // 4. its consent event reaches the write side, which must stay silent — the
    //    platform appends a row per newer timestamp, and nobody chose anything
    //    on this host.
    writeConsentCookie(echoed, "letsdog.nl");
    expect(writes).toHaveLength(1);
    expect(readConsentCookie()?.t).toBe(chosenOnPlatform);

    // 5. and a second pass adopts nothing
    expect(consentCookieSupersedes(fromCookie, echoed)).toBe(false);
  });

  it("shows the banner instead when the platform choice refused everything", () => {
    const { writes } = stubCookieJar();
    const submitCustomConsent = vi.fn();

    writeConsentCookie(
      { v: 1, t: "2026-08-13T08:00:00.000Z", p: false, s: false, m: false },
      "letsdog.nl",
    );
    const fromCookie = readConsentCookie()!;
    expect(consentCookieSupersedes(fromCookie, null)).toBe(false);

    // Nothing is submitted, so Cookiebot keeps no response and renders its
    // banner. The accepted price of the clamp: this visitor is asked once more
    // here. Asking is the safe direction; suppressing is not.
    vi.stubGlobal("window", { Cookiebot: { submitCustomConsent } });
    expect(submitCustomConsent).not.toHaveBeenCalled();
    expect(writes).toHaveLength(1);
  });
});

describe("recordConsentWithdrawal", () => {
  const withdrawnAt = "2026-08-08T07:15:00.000Z";

  it("turns a granted cookie into an explicit refusal", () => {
    stubCookieJar();
    writeConsentCookie({ ...payload, p: true, s: true, m: true }, "letsdog.nl");
    recordConsentWithdrawal("letsdog.nl", withdrawnAt);
    const after = readConsentCookie();
    expect(after).toEqual({ v: CONSENT_COOKIE_VERSION, t: withdrawnAt, p: false, s: false, m: false });
  });

  it("invents nothing for a visitor who never answered", () => {
    const { writes } = stubCookieJar();
    recordConsentWithdrawal("letsdog.nl", withdrawnAt);
    // No prior cookie means no choice to withdraw. Recording "refused" here
    // would tell the platform the visitor said no when nobody asked.
    expect(writes).toHaveLength(0);
    expect(readConsentCookie()).toBeNull();
  });

  it("leaves an already-refused cookie alone", () => {
    const { writes } = stubCookieJar();
    writeConsentCookie({ v: 1, t: "2026-08-08T06:00:00.000Z", p: false, s: false, m: false }, "letsdog.nl");
    recordConsentWithdrawal("letsdog.nl", withdrawnAt);
    expect(writes).toHaveLength(1);
    expect(readConsentCookie()?.t).toBe(
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

  // The other half of T-39, and the half that keeps the parser's refusal safe.
  // Number.isNaN only rejects a Date outside the representable range; everything
  // inside it used to be serialised, and toISOString() switches to an
  // expanded-year form outside years 0000-9999. So these values were a `t` this
  // site could WRITE and neither reader could read — ours or the platform's.
  it("returns null for a moment outside the contract's range", () => {
    // in extended-year territory but a perfectly valid Date, so the old
    // Number.isNaN guard passed it straight through
    expect(toIsoTimestamp(3e14)).toBeNull(); // -> +011476-08-15T05:20:00.000Z
    expect(toIsoTimestamp(Date.UTC(10000, 0, 1))).toBeNull(); // -> +010000-01-01T…
    expect(toIsoTimestamp(8.64e15)).toBeNull(); // the MAXIMUM valid Date
    expect(toIsoTimestamp(new Date(8.64e15))).toBeNull(); // same, arriving as a Date
    expect(toIsoTimestamp(-62167219201000)).toBeNull(); // year -1, negative form
    // and the boundary still holds on the good side
    expect(toIsoTimestamp(Date.UTC(9999, 11, 31))).toBe("9999-12-31T00:00:00.000Z");
  });

  // THE INVARIANT, pinned as a property rather than as two lists of examples:
  // this site can only write a moment its own parser accepts. Writer and reader
  // share one definition of the shape (ISO_INSTANT_WITH_Z), so they cannot drift
  // apart the way two separate checks would — and the drift is what would make
  // us read our own cookie as "no choice".
  it("never produces a moment parseConsentPayload would refuse", () => {
    const candidates: unknown[] = [
      new Date(),
      new Date("2026-08-08T06:35:12.618Z"),
      1786170912618,
      0,
      "2026-08-13T09:00:00Z",
      "2026-08-13T09:00:00+02:00", // an offset in, canonical Z out
      "August 13, 2026",
      3e14,
      8.64e15,
      Date.UTC(10000, 0, 1),
      -62167219201000,
      "+275760-09-13T00:00:00.000Z",
      "nonsense",
      NaN,
      null,
      undefined,
      true,
    ];
    let produced = 0;
    for (const value of candidates) {
      const t = toIsoTimestamp(value);
      if (t === null) continue;
      produced++;
      const label = `${String(value)} -> ${t}`;
      expect({ label, readBack: parseConsentPayload(withT(t))?.t }).toEqual({
        label,
        readBack: t,
      });
    }
    // the corpus must actually exercise the non-null branch, or this asserts
    // nothing at all
    expect(produced).toBeGreaterThan(0);
  });
});
