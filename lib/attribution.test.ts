import { describe, it, expect, afterEach, vi } from "vitest";
import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_COOKIE_VERSION,
  ATTRIBUTION_MAX_COOKIE_BYTES,
  ATTRIBUTION_MAX_LENGTH,
  ATTRIBUTION_MAX_TIMESTAMP_LENGTH,
  ATTRIBUTION_URL_PARAMS,
  MARKETING_PARAMS,
  STATISTICS_PARAMS,
  applyConsentToStored,
  attributionByteLength,
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

/**
 * The one browser behaviour this stub HAS to reproduce, or the size limit cannot
 * be tested at all: an assignment whose `name=value` runs past ~4096 bytes is
 * DROPPED, silently. No throw, no return value, no cookie afterwards. A stub
 * that stores everything it is handed makes both the broken and the fixed writer
 * look identical, and green then only proves the rig cannot see the bug.
 *
 * The number is written out here rather than imported from the module under
 * test on purpose. This is a statement about what browsers do, and it has to
 * stay true independently — importing `ATTRIBUTION_MAX_COOKIE_BYTES` would mean
 * raising that constant to 100 000 keeps every test green while production
 * writes cookies that vanish.
 */
const BROWSER_COOKIE_BYTE_LIMIT = 4096;

// Same jar stub as consent.test.ts: the repo's Vitest runs in the Node
// environment on purpose, so the cookie writers get a `document` without jsdom.
// Reads return every stored pair; a Max-Age=0 write deletes rather than stores;
// an over-sized write is accepted by the setter and kept by nothing, exactly as
// a browser does it. `writes` records what the code ATTEMPTED, the jar records
// what survived — telling those two apart is the whole point here.
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
      if (/Max-Age=0\b/.test(raw)) {
        jar.delete(name);
        return;
      }
      if (new TextEncoder().encode(pair).length > BROWSER_COOKIE_BYTE_LIMIT) return;
      jar.set(name, pair.slice(eq + 1));
    },
  });
  return { writes };
}

/**
 * `buildAttributionCookie`'s assignment, or a failure if it refused to build
 * one. Keeps the assertions about the cookie's SHAPE readable now that the
 * builder returns an outcome instead of a bare string.
 */
function builtCookie(payload: AttributionPayload, hostname: string): string {
  const built = buildAttributionCookie(payload, hostname);
  if (!built.fits) throw new Error(`expected an assignment that fits, got ${built.bytes} bytes`);
  return built.cookie;
}

/**
 * console.error is the only error sink this repo has, so a report is asserted
 * through it. Silenced as well as captured: a deliberate report should not print
 * noise into a green run.
 */
function stubConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

/**
 * document.cookie exactly as given, duplicates and all. The Map-backed jar holds
 * one value per name, and two cookies sharing one name is the whole failure mode
 * in `readAttributionCookie` below.
 */
function stubRawCookieJar(jar: string) {
  vi.stubGlobal("document", { cookie: jar });
}

afterEach(() => {
  vi.unstubAllGlobals();
  // unstubAllGlobals does not undo a spy, and a console.error left mocked would
  // swallow the next file's output as well as this one's.
  vi.restoreAllMocks();
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
    expect(builtCookie(payload, "letsdog.nl")).toContain("Domain=.letsdog.nl");
    expect(builtCookie(payload, "localhost")).not.toContain("Domain=");
  });

  it("carries the contract's cookie attributes", () => {
    const cookie = builtCookie(
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
    const cookie = builtCookie(
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

// Contract rule 4, and the failure it names is silent in both directions.
// ld_attribution has to be readable from every *.letsdog.nl host, so it carries
// no `__Host-` prefix and ANY sibling host can script-write it. All seven
// campaign parameters are capped at 200 on the way in AND on the way back out;
// `t` was capped nowhere. An oversized `t` therefore pushed the narrowing
// rewrite in narrowStoredToConsent past the browser's ~4096-byte per-cookie
// limit — and a browser drops an oversized Set-Cookie WITHOUT A WORD, so this
// side went on believing it had narrowed the record while the un-narrowed one
// sat exactly where it was. That turns consent erasure into a switch a co-writer
// can flip: withdraw marketing, and the fbclid stays.
//
// THE CAP CUTS, IT DOES NOT REFUSE, and that half is a contract matter rather
// than a preference. The platform slices `t` at the same 64
// (MAX_TOUCH_MOMENT_LENGTH, packages/core/src/attribution.ts) and KEEPS the
// record. A record we refused but it kept is a record the two hosts disagree
// about the EXISTENCE of — and "does a touch already exist" is the only question
// either side asks of this cookie. Being stricter than the co-writer is a failure
// mode of its own, so these tests pin the direction and not just the number.
describe("parseAttributionPayload — the cut on t (contract rule 4)", () => {
  /** What no contracted writer can produce: a real stamp with 5 000 characters glued on. */
  const oversizedT = `2026-08-11T09:00:00.000Z${"0".repeat(5000)}`;
  const cutT = oversizedT.slice(0, ATTRIBUTION_MAX_TIMESTAMP_LENGTH);
  const oversized = encodeURIComponent(
    JSON.stringify({ v: 1, t: oversizedT, utm_source: "facebook", fbclid: "f1" }),
  );

  /** That same record after the cut — what BOTH hosts' parsers hand back. */
  const oversizedParsed: AttributionPayload = {
    v: 1,
    t: cutT,
    utm_source: "facebook",
    fbclid: "f1",
  };

  /** A legitimate record, as either host writes it. */
  const valid: AttributionPayload = {
    v: 1,
    t: "2026-08-11T09:00:00.000Z",
    utm_source: "facebook",
    utm_campaign: "zomer",
  };
  const shared = serializeAttributionPayload(valid);

  const record = (t: string) =>
    encodeURIComponent(JSON.stringify({ v: 1, t, utm_source: "facebook" }));

  it("cuts t at the platform's own bound, far below the 200 a campaign parameter gets", () => {
    // 64 is MAX_TOUCH_MOMENT_LENGTH in the platform's
    // packages/core/src/attribution.ts. toISOString() is exactly 24 characters, 27
    // in the extended-year form; the headroom above that is for a legitimate
    // variant the platform might write, not for a shape we are guessing at. The
    // number has to match on both sides — one host cutting at a different length
    // than the other is how identical records stop being identical.
    expect(ATTRIBUTION_MAX_TIMESTAMP_LENGTH).toBe(64);
    expect(new Date().toISOString()).toHaveLength(24);
    expect(ATTRIBUTION_MAX_TIMESTAMP_LENGTH).toBeLessThan(ATTRIBUTION_MAX_LENGTH);
  });

  it("truncates an oversized t to the bound and KEEPS the record", () => {
    const parsed = parseAttributionPayload(oversized);
    expect(parsed).toEqual(oversizedParsed);
    expect(parsed?.t).toHaveLength(ATTRIBUTION_MAX_TIMESTAMP_LENGTH);
    // And the cut manufactures no plausible wrong moment on the way, which is
    // what makes cutting affordable here. Only an already-broken value is ever
    // shortened, and what comes out is unreadable as a date — the platform's
    // buildFbcFromFbclid answers an unreadable moment with null, so the cost is
    // the click id's creation_time and not the record.
    expect(Number.isNaN(new Date(parsed!.t).getTime())).toBe(true);
  });

  it("leaves a t exactly at the bound untouched and cuts the first character past it", () => {
    // The pair is what makes it a bound rather than a coincidence.
    const at = "2".repeat(ATTRIBUTION_MAX_TIMESTAMP_LENGTH);
    expect(parseAttributionPayload(record(at))?.t).toBe(at);
    expect(parseAttributionPayload(record(`${at}2`))?.t).toBe(at);
  });

  it("still refuses a t that is not a string at all", () => {
    // The one rejection left on this field, and the platform keeps exactly the
    // same one: typeof, nothing more. A number or an object is not a moment in
    // any shape either writer could have meant.
    for (const t of [0, 1_760_000_000_000, null, {}, ["2026-08-11T09:00:00.000Z"], true]) {
      expect(parseAttributionPayload(encodeURIComponent(JSON.stringify({ v: 1, t })))).toBeNull();
    }
  });

  it("keeps a real timestamp byte-identical, never normalised into another shape", () => {
    // `t` is the one field both contracts say is never restamped, so a value the
    // other repo wrote has to survive unchanged or not at all. This is also why
    // toIsoTimestamp() from lib/consent.ts is deliberately NOT reused here: it
    // canonicalises (…T09:15:00Z becomes …T09:15:00.000Z), which is exactly right
    // when writing Cookiebot's consentUTC and exactly wrong when reading bytes
    // the platform chose.
    for (const t of [
      "2026-08-11T09:15:00.000Z", // what toISOString() produces
      "2026-08-11T09:15:00Z", // valid ISO 8601 with Z, no sub-second part
      "+275760-09-13T00:00:00.000Z", // the 27-character extended-year form
    ]) {
      expect(parseAttributionPayload(record(t))?.t).toBe(t);
    }
  });

  it("caps the length without pinning the format, so a variant the platform writes is never touched", () => {
    // Deliberately not a regex on toISOString()'s exact output, and the platform
    // checks `t` for its type only for the same reason. Refusing a REAL first
    // touch hands the slot to a later visit for ninety days, silently — the
    // failure this whole module exists to prevent — so the only property looked
    // at is the one rule 4 is actually about.
    expect(parseAttributionPayload(record("2026-08-11T09:15:00+02:00"))?.t).toBe(
      "2026-08-11T09:15:00+02:00",
    );
  });

  it("still round-trips a full legitimate record unchanged", () => {
    const payload: AttributionPayload = {
      v: ATTRIBUTION_COOKIE_VERSION,
      t: "2026-08-11T09:15:00.000Z",
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "zomer",
      utm_term: "adset_a",
      utm_content: "video_1",
      gclid: "g123",
      fbclid: "IwAR0abc",
    };
    expect(parseAttributionPayload(serializeAttributionPayload(payload))).toEqual(payload);
  });

  // Rule 1 still decides WHICH copy is read — the first PARSEABLE one, and per
  // RFC 6265 §5.4 a sibling's host-only copy with a deeper Path is handed over
  // FIRST. What changed is that an oversized `t` no longer makes a copy
  // unparseable, so the sibling's copy is the answer here rather than the shared
  // record behind it. That is the intended outcome, not a hole in rule 1: the
  // platform walks the same list with the same tolerance and stops at the same
  // copy, so both hosts read ONE record. Skipping it here would leave us
  // reporting a different first touch than the platform reports from a byte-
  // identical jar. Rule 1's real job — a copy that is genuinely unreadable must
  // not mask the record behind it — is pinned in "the first PARSEABLE record"
  // below, with a corrupt copy rather than an oversized one.
  it("reads the same copy the platform would: the oversized one, cut", () => {
    stubRawCookieJar(
      `${ATTRIBUTION_COOKIE_NAME}=${oversized}; ${ATTRIBUTION_COOKIE_NAME}=${shared}; _ga=1`,
    );
    expect(readAttributionCookie()).toEqual(oversizedParsed);
    expect(readAttributionCookie()).not.toEqual(valid);
  });

  it("answers 'a touch exists' from an oversized record, so this visit cannot claim the slot", () => {
    // THE DIVERGENCE THIS CHANGE CLOSES, and the reason the cut beats a refusal.
    // The oversized record is the ONLY copy in the jar, so the answer cannot be
    // borrowed from a second one. The platform keeps this record; refusing it
    // here would report "no touch yet", write a fresh record straight over a
    // first touch that really existed, and leave the two hosts crediting two
    // different campaigns from one cookie — silently, for ninety days.
    const jar = `${ATTRIBUTION_COOKIE_NAME}=${oversized}`;
    stubRawCookieJar(jar);

    expect(recordFirstTouch({ utm_source: "google", gclid: "g2" }, ALL_GATES, "letsdog.nl")).toBe(
      false,
    );
    // A write would have replaced the stubbed property outright.
    expect(document.cookie).toBe(jar);
  });

  it("narrows an oversized record into a cookie the browser will actually keep", () => {
    // The failure end to end, and why the cap cuts instead of refusing. Before
    // the cut this read the oversized record, narrowed it, and handed
    // document.cookie a ~9 KB string — past the ~4096-byte per-cookie limit, so
    // the write vanished with no error at all and the fbclid stayed on the record
    // under a gate that had just closed. Refusing the record would "fix" the
    // silent drop by never writing at all, which leaves that same fbclid exactly
    // where it was; cutting fixes it by making the erasure land.
    //
    // THE PLANT IS A DIFFERENT FIXTURE FROM THE ONE THE PARSER TESTS ABOVE USE,
    // and the difference is the point. The jar stub now drops an over-sized
    // assignment exactly as a browser does, and the ~5 KB percent-encoded record
    // those tests hand the READER is not a record any browser would have STORED
    // — planting it here would leave an empty jar and prove nothing. There is
    // one shape that is genuinely reachable, and the contract names it: the
    // parser deliberately accepts UNENCODED JSON, so a sibling host on
    // `.letsdog.nl` can store a record that fits comfortably as raw bytes and
    // only crosses the limit once our own serializer percent-encodes it. Filling
    // `t` with a multibyte character is what opens that gap — three bytes stored,
    // nine bytes written back.
    const { writes } = stubCookieJar();
    const plantedT = `2026-08-11T09:00:00.000Z${"€".repeat(1000)}`;
    const plantedCut = plantedT.slice(0, ATTRIBUTION_MAX_TIMESTAMP_LENGTH);
    const planted = `${ATTRIBUTION_COOKIE_NAME}=${JSON.stringify({
      v: 1,
      t: plantedT,
      utm_source: "facebook",
      fbclid: "f1",
    })}`;

    // Premise one: a browser would have kept this, so the jar really holds it.
    expect(attributionByteLength(planted)).toBeLessThan(4096);
    // Premise two: rewriting it WITHOUT the cut on `t` is the ~9 KB assignment
    // that used to disappear — the failure this rule-4 cut exists to remove.
    expect(
      attributionByteLength(
        `${ATTRIBUTION_COOKIE_NAME}=${serializeAttributionPayload({
          v: 1,
          t: plantedT,
          utm_source: "facebook",
        })}`,
      ),
    ).toBeGreaterThan(4096);

    document.cookie = planted;
    const before = writes.length;

    narrowStoredToConsent(STATS_ONLY, "letsdog.nl");

    const emitted = writes.slice(before);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].length).toBeLessThan(4096);
    expect(readAttributionCookie()).toEqual({ v: 1, t: plantedCut, utm_source: "facebook" });
  });
});

// Contract rule 5, sitting directly on top of rule 4 above: A WRITE THAT WOULD
// NOT FIT IS NOT PERFORMED AT ALL. Rule 4 bounded the one field nothing else
// bounded; this bounds the finished assignment, because capping every field
// still leaves a record that is too big once they are added together and
// percent-encoded.
//
// Mirrored from the platform's implementation (T-564, commit 45a47cc:
// packages/core/src/attribution.ts + apps/app/src/lib/attribution.web.ts), not
// re-derived from the contract text. That is the explicit lesson of T-37, where
// this repo built "refuse" against the platform's "truncate": both suites were
// green, both implementations were internally consistent, and only laying the
// two sources side by side showed that the hosts had stopped agreeing about
// which records exist. Two of the three rules below are STRICTER than the
// contract's literal wording, and both deviations are the platform's:
//
//   1. `ld_attribution=` is measured along with the value, because a browser
//      spends its 4096 bytes on name and value together.
//   2. On the narrowing pass, "write nothing" is replaced by DELETE.
//   3. The refusal is reported, because a silent non-action is no better than
//      the silent failure it replaced.
describe("the size limit on a written record (contract rule 5)", () => {
  const AT = "2026-08-11T09:00:00.000Z";

  /** The finished `ld_attribution=<value>` assignment for this record, in UTF-8 bytes. */
  const assignmentBytes = (payload: AttributionPayload) =>
    attributionByteLength(`${ATTRIBUTION_COOKIE_NAME}=${serializeAttributionPayload(payload)}`);

  /**
   * A record whose finished assignment weighs EXACTLY `bytes`, so the boundary
   * can be pinned from both sides instead of approached from one.
   *
   * The filler is `x`: `encodeURIComponent` leaves it alone and UTF-8 stores it
   * in one byte, so one more character is one more byte and nothing else moves.
   */
  function recordOfExactly(bytes: number): AttributionPayload & { utm_campaign: string } {
    const envelope = { v: ATTRIBUTION_COOKIE_VERSION, t: AT, utm_campaign: "" };
    return { ...envelope, utm_campaign: "x".repeat(bytes - assignmentBytes(envelope)) };
  }

  it("pins the limit and the unit: 4096, counted in bytes and not in characters", () => {
    // Both halves matter. The number is the platform's
    // ATTRIBUTION_MAX_COOKIE_BYTES, and one host measuring in characters while
    // the other measures in bytes is two hosts disagreeing about what may be
    // written — which shows up as an empty column, never as an error.
    expect(ATTRIBUTION_MAX_COOKIE_BYTES).toBe(4096);
    expect(attributionByteLength("x")).toBe(1);
    expect("€").toHaveLength(1);
    expect(attributionByteLength("€")).toBe(3);
    expect(attributionByteLength(encodeURIComponent("€"))).toBe(9);
  });

  it("keeps an assignment of exactly the limit and refuses the first byte past it", () => {
    const atLimit = recordOfExactly(ATTRIBUTION_MAX_COOKIE_BYTES);
    const overLimit = recordOfExactly(ATTRIBUTION_MAX_COOKIE_BYTES + 1);
    expect(assignmentBytes(atLimit)).toBe(4096);
    expect(assignmentBytes(overLimit)).toBe(4097);

    const fits = buildAttributionCookie(atLimit, "letsdog.nl");
    expect(fits.fits).toBe(true);
    expect(fits.bytes).toBe(4096);
    expect(fits.cookie).toContain("Domain=.letsdog.nl");

    const refused = buildAttributionCookie(overLimit, "letsdog.nl");
    expect(refused.fits).toBe(false);
    // No assignment comes out at all — not a shortened one. A record with a
    // field quietly removed looks healthy and still holds the slot for ninety
    // days; absence is the state the next click can repair.
    expect(refused.cookie).toBeNull();
    expect(refused).toEqual({ fits: false, cookie: null, bytes: 4097, limit: 4096 });
  });

  it("counts `ld_attribution=` too, so a value of exactly 4096 bytes is refused", () => {
    // The first of the two deliberate deviations, and the reason for it is the
    // very failure rule 5 exists to stop: a browser weighs name and value
    // together (Chrome sums `name.size() + value.size()`), so a writer measuring
    // the value alone calls this record a fit and the browser drops it anyway.
    // 15 bytes stricter than the contract's wording, and that is the safe side.
    const prefix = `${ATTRIBUTION_COOKIE_NAME}=`;
    expect(attributionByteLength(prefix)).toBe(15);

    const valueAtLimit = recordOfExactly(ATTRIBUTION_MAX_COOKIE_BYTES + 15);
    expect(attributionByteLength(serializeAttributionPayload(valueAtLimit))).toBe(4096);
    expect(buildAttributionCookie(valueAtLimit, "letsdog.nl").fits).toBe(false);
  });

  it("stores a record that lands exactly on the limit", () => {
    // The under side of the boundary, driven through the real writer: the write
    // happens, and the jar — which drops an over-sized assignment exactly as a
    // browser does — keeps it.
    const { writes } = stubCookieJar();
    const atLimit = recordOfExactly(ATTRIBUTION_MAX_COOKIE_BYTES);

    expect(recordFirstTouch({ utm_campaign: atLimit.utm_campaign }, ALL_GATES, "letsdog.nl", AT))
      .toBe(true);
    expect(writes).toHaveLength(1);
    expect(attributionByteLength(writes[0].split(";")[0])).toBe(4096);
    expect(readAttributionCookie()?.t).toBe(AT);
  });

  it("writes nothing, reports it, and returns false one byte over", () => {
    // What this replaces: the assignment used to go out, the browser used to
    // throw it away without a word, and recordFirstTouch used to answer `true` —
    // the caller was told a touch had been recorded that existed nowhere.
    const { writes } = stubCookieJar();
    const reported = stubConsoleError();
    const overLimit = recordOfExactly(ATTRIBUTION_MAX_COOKIE_BYTES + 1);

    expect(recordFirstTouch({ utm_campaign: overLimit.utm_campaign }, ALL_GATES, "letsdog.nl", AT))
      .toBe(false);
    expect(writes).toHaveLength(0);
    expect(readAttributionCookie()).toBeNull();

    // Reporting is part of the rule: without it the fix only swaps a silent
    // failure for a silent non-action. The text is the platform's, so one
    // operator grepping one fixed string finds this on both hosts.
    expect(reported).toHaveBeenCalledTimes(1);
    expect(reported).toHaveBeenCalledWith(
      "[attributie] RECORD TE GROOT VOOR EEN COOKIE: niets geschreven",
      { cookie: ATTRIBUTION_COOKIE_NAME, bytes: 4097, limit: 4096 },
    );
  });

  it("refuses a record that a String.length check would wave straight through", () => {
    // THE BUG THIS RULE IS FOR, and it needs no co-writer — a plain URL is
    // enough. Every one of the seven fields passes the per-field cap of 200
    // CHARACTERS, and the whole record is a fraction of 4096 characters. But
    // `encodeURIComponent(JSON.stringify(...))` turns each three-byte `€` into
    // nine bytes, so the assignment lands at several times the limit. Measured
    // in the unit the browser uses, this record was never writable.
    const { writes } = stubCookieJar();
    const reported = stubConsoleError();
    const accented = "€".repeat(250);
    const params = readAttributionParams(
      `?${ATTRIBUTION_URL_PARAMS.map((n) => `${n}=${encodeURIComponent(accented)}`).join("&")}`,
    );

    // The premises, measured rather than assumed. Every field survived the
    // per-field cap at its full 200 characters...
    for (const name of ATTRIBUTION_URL_PARAMS) {
      expect(params[name]).toHaveLength(ATTRIBUTION_MAX_LENGTH);
    }
    const payload: AttributionPayload = { v: ATTRIBUTION_COOKIE_VERSION, t: AT, ...params };
    // ...the record is short when counted in characters, which is exactly why a
    // `String.length` guard passes it...
    expect(JSON.stringify(payload).length).toBeLessThan(ATTRIBUTION_MAX_COOKIE_BYTES);
    // ...and it is three times over the limit when counted in bytes.
    expect(assignmentBytes(payload)).toBeGreaterThan(ATTRIBUTION_MAX_COOKIE_BYTES * 3);

    expect(recordFirstTouch(params, ALL_GATES, "letsdog.nl", AT)).toBe(false);
    expect(writes).toHaveLength(0);
    expect(readAttributionCookie()).toBeNull();
    expect(reported).toHaveBeenCalledTimes(1);
  });

  it("DELETES on the narrowing pass rather than leaving the un-narrowed record standing", () => {
    // The second deliberate deviation, and the one place where rule 5's "write
    // nothing" is the wrong answer. On the capture path a refusal costs an empty
    // slot the next click can fill. Here it would leave the OLD record in place,
    // carrying exactly the click id the visitor has just withdrawn — a consent
    // failure, and a switch a co-writer can throw at will.
    //
    // Reachable because the parser deliberately accepts UNENCODED JSON: a
    // sibling host on `.letsdog.nl` can plant a record that fits comfortably as
    // raw bytes and only crosses the limit once our own serializer
    // percent-encodes it. That is precisely what is planted here.
    const { writes } = stubCookieJar();
    const reported = stubConsoleError();
    const accented = "€".repeat(ATTRIBUTION_MAX_LENGTH);
    const planted = `${ATTRIBUTION_COOKIE_NAME}=${JSON.stringify({
      v: ATTRIBUTION_COOKIE_VERSION,
      t: AT,
      utm_source: accented,
      utm_campaign: accented,
      utm_term: accented,
      fbclid: accented,
    })}`;

    // Premise one: the plant itself is under the limit, so a real browser keeps
    // it — otherwise this test would be proving nothing about narrowing.
    expect(attributionByteLength(planted)).toBeLessThan(ATTRIBUTION_MAX_COOKIE_BYTES);
    // Premise two: the NARROWED record is over it, once we re-encode.
    expect(
      assignmentBytes({
        v: ATTRIBUTION_COOKIE_VERSION,
        t: AT,
        utm_source: accented,
        utm_campaign: accented,
        utm_term: accented,
      }),
    ).toBeGreaterThan(ATTRIBUTION_MAX_COOKIE_BYTES);

    document.cookie = planted;
    expect(readAttributionCookie()?.fbclid).toBe(accented);
    const before = writes.length;

    narrowStoredToConsent(STATS_ONLY, "letsdog.nl");

    // Gone, not narrowed-and-silently-unchanged. Leaving it would keep the
    // withdrawn fbclid on the shared domain for the rest of the ninety days.
    expect(readAttributionCookie()).toBeNull();
    expect(reported).toHaveBeenCalledTimes(1);
    // Only deletions went out — no attempt to assign the over-sized record.
    for (const write of writes.slice(before)) expect(write).toContain("Max-Age=0");
  });

  it("still narrows normally when the narrowed record fits", () => {
    // The guard must not become "never narrow". An ordinary withdrawal still has
    // to reach the record, or rule 5 would have quietly disabled rule 4's fix.
    const { writes } = stubCookieJar();
    const reported = stubConsoleError();
    recordFirstTouch({ utm_source: "facebook", fbclid: "f1" }, ALL_GATES, "letsdog.nl", AT);
    const before = writes.length;

    narrowStoredToConsent(STATS_ONLY, "letsdog.nl");

    expect(writes.slice(before)).toHaveLength(1);
    expect(readAttributionCookie()).toEqual({ v: 1, t: AT, utm_source: "facebook" });
    expect(reported).not.toHaveBeenCalled();
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

// Rule 1 of the cross-host contract, on the side where getting it wrong costs
// the most. `ld_attribution` must be readable from every *.letsdog.nl host, so a
// __Host- prefix is ruled out and any subdomain — keuzehulp, agenda, the
// platform, a parked or expired one — can set its own host-only copy. Per RFC
// 6265 §5.4 document.cookie arrives sorted longest-Path first, so a copy with a
// deeper Path is handed over BEFORE the legitimate Domain=.letsdog.nl one.
describe("readAttributionCookie — the first PARSEABLE record", () => {
  const stored: AttributionPayload = {
    v: 1,
    t: "2026-08-11T09:00:00.000Z",
    utm_source: "facebook",
    utm_campaign: "zomer",
  };
  const shared = serializeAttributionPayload(stored);

  it("walks past a broken host-only copy to the shared record", () => {
    stubRawCookieJar(
      `${ATTRIBUTION_COOKIE_NAME}=corrupted; ${ATTRIBUTION_COOKIE_NAME}=${shared}; _ga=1`,
    );
    expect(readAttributionCookie()).toEqual(stored);
  });

  it("still takes the shared record when it comes first", () => {
    stubRawCookieJar(
      `_ga=1; ${ATTRIBUTION_COOKIE_NAME}=${shared}; ${ATTRIBUTION_COOKIE_NAME}=corrupted`,
    );
    expect(readAttributionCookie()).toEqual(stored);
  });

  it("reports no record when no copy is readable", () => {
    stubRawCookieJar(`${ATTRIBUTION_COOKIE_NAME}=corrupted; ${ATTRIBUTION_COOKIE_NAME}=%7Bnope`);
    expect(readAttributionCookie()).toBeNull();
  });

  it("reports no record when there is no ld_attribution at all", () => {
    // The prefix discipline, in its sharpest form: the value under the wrong
    // name is a perfectly valid record, so a loosened match would return it.
    stubRawCookieJar(`_ga=1; old_${ATTRIBUTION_COOKIE_NAME}=${shared}`);
    expect(readAttributionCookie()).toBeNull();
  });

  // THE COST, and why this reader matters more than the consent one.
  // recordFirstTouch only ever asks "does a touch exist". A shadowed read
  // answers no, and the slot is spent on the current visit for ninety days —
  // nothing errors, the columns fill, and the credit is on the wrong campaign.
  it("does not let a shadowing copy hand the first touch to a later visit", () => {
    const jar = `${ATTRIBUTION_COOKIE_NAME}=corrupted; ${ATTRIBUTION_COOKIE_NAME}=${shared}`;
    stubRawCookieJar(jar);

    expect(recordFirstTouch({ utm_source: "google", gclid: "g2" }, ALL_GATES, "letsdog.nl")).toBe(
      false,
    );
    // A write would have replaced the stubbed property outright.
    expect(document.cookie).toBe(jar);
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
