// THE CROSS-REPO CONTRACT SUITE: this repo's half of the shared vectors.
//
// The vectors live in the cross-knowledge hub (`<hub>/fixtures/*.vectors.json`)
// and the platform runs the SAME file through its own parsers. Neither side owns
// them; that is the entire mechanism. See `lib/contract-fixtures.test-helpers.ts`
// for why they are data and not a package, and what happens when the hub is
// missing (a hard failure, never a skip).
//
// THE VERDICT IS THIS REPO'S EFFECTIVE BEHAVIOUR, NOT ONE FUNCTION'S RETURN
// VALUE, and getting that wrong would have made the whole suite a liability. The
// two repos enforce the consent VERSION at different levels: the platform refuses
// an unknown `v` inside `parseConsentCookieValue`, while `parseConsentPayload`
// here does not look at `v` at all and the refusal happens in its callers
// (`newestRecordedConsent`, `consentCookieSupersedes`). Pin the lowest-level
// function on each side and this file reports a divergence that does not exist —
// after which somebody "fixes" a correct implementation, or tunes the vector
// until it is green. A tuned green fixture set is worse than none. So each
// adapter below composes whatever this repo actually uses to answer the
// contract's question, and nothing narrower.
//
// WHEN THE TWO SIDES GENUINELY DISAGREE, THIS SUITE HAS WORKED. Do not change
// the vector and do not change the parser to match the neighbour: write the
// disagreement down, and take it to the other repo. Where code and contract
// collide, the other repo's CODE wins over the contract text — that was the
// lesson of T-37 and of T-39 both.

import { describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  newestRecordedConsent,
  readConsentCookie,
  readConsentState,
} from "@/lib/consent";
import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_URL_PARAMS,
  buildAttributionCookie,
  readAttributionCookie,
  type AttributionParamName,
} from "@/lib/attribution";
import { stubDomainCookieJar } from "@/lib/cookie-jar.test-helpers";
import {
  describeMismatch,
  loadVectorFile,
  type Vector,
} from "@/lib/contract-fixtures.test-helpers";

// =============================================================================
// ld_consent — "does this govern?"
// =============================================================================

// `silent` sits ONLY on the non-governing branch, and it is REQUIRED there.
//
// It answers the second question the contract asks once the first is settled:
// no governing choice, fine — but may a destination running on LEGITIMATE
// INTEREST still receive anything? Silence (no cookie at all) says yes; a cookie
// that is present and unreadable says no, because somebody answered a banner and
// the bytes are unreadable almost only because our two repos drifted.
//
// REQUIRED rather than optional, agreed with PF on 2026-08-17 and for the reason
// this loader exists at all: an optional key lets a vector forget it and thereby
// assert nothing, which is indistinguishable from a vector that meant to. And
// refused on the governing branch, where it would claim nothing.
type ConsentExpectation =
  | { governs: false; silent: boolean }
  | { governs: true; categories: { p: boolean; s: boolean; m: boolean }; t: string };

function validateConsentExpectation(where: string, raw: unknown): ConsentExpectation {
  const value = asObject(where, raw);
  if (value.governs === false) {
    refuseExtraKeys(where, value, ["governs", "silent"]);
    if (typeof value.silent !== "boolean") {
      throw new Error(
        `${where}: "silent" is required when governs is false — it is what separates an ABSENT ` +
          `cookie (legitimate interest still applies) from a PRESENT but unreadable one (it does ` +
          `not). Omitting it would assert nothing while looking like an assertion.`,
      );
    }
    return { governs: false, silent: value.silent };
  }
  if (value.governs !== true) throw new Error(`${where}: "governs" must be a boolean`);
  refuseExtraKeys(where, value, ["governs", "categories", "t"]);
  const categories = asObject(`${where}.categories`, value.categories);
  refuseExtraKeys(`${where}.categories`, categories, ["p", "s", "m"]);
  for (const key of ["p", "s", "m"] as const) {
    if (typeof categories[key] !== "boolean") {
      throw new Error(`${where}.categories.${key} must be a boolean`);
    }
  }
  if (typeof value.t !== "string") throw new Error(`${where}: "t" must be a string`);
  return {
    governs: true,
    categories: {
      p: categories.p as boolean,
      s: categories.s as boolean,
      m: categories.m as boolean,
    },
    t: value.t,
  };
}

/**
 * What this site actually does with these bytes when its own CMP holds no
 * answer: is this a governing consent choice, or no choice at all?
 *
 * `readConsentCookie()` is the one read seam every consumer here goes through
 * (`consent-sync.tsx`, `meta-pixel.tsx`, `posthog-provider.tsx`, `lib/analytics.ts`,
 * `lib/attribution.ts` and this module's own writers), and
 * `newestRecordedConsent(null, …)` is where the version is enforced — the exact
 * composition `posthog-provider.tsx` and `lib/meta-consent.ts` use. Deliberately
 * NOT `consentCookieSupersedes`: that answers a different question (may this be
 * pushed INTO the CMP) and carries D-4's all-false clamp, which is a write-side
 * posture rather than a reading of the record.
 *
 * The stubbed jar rather than a bare string because `readConsentCookie` runs the
 * duplicate repair against a real `document.cookie`, and the point of this file
 * is the behaviour and not a convenient slice of it.
 */
function consentVerdict(raw: string | null): ConsentExpectation {
  // `null` = no cookie of this name at all, so the jar gets no entry. Note this
  // is NOT the same as an entry with an empty value: that one is a cookie
  // somebody wrote, and the contract puts the two on opposite sides of `silent`.
  stubDomainCookieJar(
    raw === null ? [] : [{ name: CONSENT_COOKIE_NAME, value: raw, domain: ".letsdog.nl" }],
  );
  try {
    const governing = newestRecordedConsent(null, readConsentCookie());
    if (governing === null) {
      // `silent` is composed from EFFECTIVE BEHAVIOUR, as the hub README
      // requires, not from a private state name: `readConsentState()` is the
      // seam posthog-provider.tsx actually gates on, so a vector that goes red
      // here is a vector about what this site really does.
      return { governs: false, silent: readConsentState().source === "absent" };
    }
    return {
      governs: true,
      categories: { p: governing.p, s: governing.s, m: governing.m },
      t: governing.t,
    };
  } finally {
    vi.unstubAllGlobals();
  }
}

/**
 * Every single-field corruption of a verdict. One per asserted field, so a
 * vector that pins a field nobody checks cannot survive the self-test below.
 */
function corruptConsent(expectation: ConsentExpectation): { label: string; expect: ConsentExpectation }[] {
  if (!expectation.governs) {
    return [
      {
        label: "governs flipped to true",
        expect: { governs: true, categories: { p: true, s: true, m: true }, t: "2026-01-01T00:00:00.000Z" },
      },
      // Without this the `silent` key would be green by construction — asserted
      // on ten vectors and checked by nothing, which is worse than not asserting
      // it, because it reads as covered.
      {
        label: "silent flipped",
        expect: { governs: false, silent: !expectation.silent },
      },
    ];
  }
  return [
    { label: "governs flipped to false", expect: { governs: false, silent: false } },
    ...(["p", "s", "m"] as const).map((key) => ({
      label: `category ${key} flipped`,
      expect: {
        ...expectation,
        categories: { ...expectation.categories, [key]: !expectation.categories[key] },
      } as ConsentExpectation,
    })),
    {
      label: "moment of the choice changed",
      expect: { ...expectation, t: "1999-12-31T23:59:59.000Z" },
    },
  ];
}

// =============================================================================
// ld_attribution — "does a touch already exist?"
// =============================================================================

type AttributionExpectation =
  | { recordExists: false }
  | { recordExists: true; t: string; params: Record<string, string>; rewriteFits: boolean };

function validateAttributionExpectation(where: string, raw: unknown): AttributionExpectation {
  const value = asObject(where, raw);
  if (value.recordExists === false) {
    refuseExtraKeys(where, value, ["recordExists"]);
    return { recordExists: false };
  }
  if (value.recordExists !== true) throw new Error(`${where}: "recordExists" must be a boolean`);
  refuseExtraKeys(where, value, ["recordExists", "t", "params", "rewriteFits"]);
  if (typeof value.t !== "string") throw new Error(`${where}: "t" must be a string`);
  if (typeof value.rewriteFits !== "boolean") {
    throw new Error(`${where}: "rewriteFits" must be a boolean`);
  }
  const params = asObject(`${where}.params`, value.params);
  refuseExtraKeys(`${where}.params`, params, [...ATTRIBUTION_URL_PARAMS]);
  for (const [key, item] of Object.entries(params)) {
    if (typeof item !== "string") throw new Error(`${where}.params.${key} must be a string`);
  }
  return {
    recordExists: true,
    t: value.t,
    params: params as Record<string, string>,
    rewriteFits: value.rewriteFits,
  };
}

/**
 * What this site actually does with these bytes: does it see a stored touch —
 * which is what stops `recordFirstTouch` from writing a new one — and would the
 * record it read still fit in a cookie if it had to be written back?
 *
 * `rewriteFits` is part of the verdict rather than a separate suite because
 * contract rule 5 is not about reading OR writing but about the seam between
 * them: `narrowStoredToConsent` reads a record and writes a narrowed one, and an
 * over-sized record is precisely the switch that turns that erasure path off.
 * Both repos answer it with `buildAttributionCookie(...).fits`.
 */
function attributionVerdict(raw: string | null): AttributionExpectation {
  // `null` = no cookie of this name at all, so the jar gets no entry — the same
  // rule `consentVerdict` follows, and for the same reason: a vector is bytes,
  // and "no cookie" has none. No attribution vector uses it today (measured
  // 2026-08-24: 0 of 18 in the hub file), but the vectors are SHARED with the
  // platform repo, whose adapter has taken `string | null` all along. Narrowing
  // it here is what made this file the odd one out and the gate permanently red.
  stubDomainCookieJar(
    raw === null ? [] : [{ name: ATTRIBUTION_COOKIE_NAME, value: raw, domain: ".letsdog.nl" }],
  );
  try {
    const stored = readAttributionCookie();
    if (stored === null) return { recordExists: false };
    const params: Record<string, string> = {};
    for (const name of ATTRIBUTION_URL_PARAMS) {
      const value = stored[name as AttributionParamName];
      if (value !== undefined) params[name] = value;
    }
    return {
      recordExists: true,
      t: stored.t,
      params,
      rewriteFits: buildAttributionCookie(stored, "letsdog.nl").fits,
    };
  } finally {
    vi.unstubAllGlobals();
  }
}

function corruptAttribution(
  expectation: AttributionExpectation,
): { label: string; expect: AttributionExpectation }[] {
  if (!expectation.recordExists) {
    return [
      {
        label: "recordExists flipped to true",
        expect: {
          recordExists: true,
          t: "2026-01-01T00:00:00.000Z",
          params: { utm_source: "facebook" },
          rewriteFits: true,
        },
      },
    ];
  }
  const names = Object.keys(expectation.params);
  const paramCorruptions =
    names.length === 0
      ? [
          {
            label: "a parameter invented",
            expect: { ...expectation, params: { utm_source: "facebook" } },
          },
        ]
      : [
          {
            label: `parameter ${names[0]} changed`,
            expect: {
              ...expectation,
              params: { ...expectation.params, [names[0]]: `${expectation.params[names[0]]}-x` },
            },
          },
          {
            label: `parameter ${names[0]} dropped`,
            expect: {
              ...expectation,
              params: Object.fromEntries(
                Object.entries(expectation.params).filter(([key]) => key !== names[0]),
              ),
            },
          },
        ];
  return [
    { label: "recordExists flipped to false", expect: { recordExists: false } },
    { label: "moment of the touch changed", expect: { ...expectation, t: "1999-12-31T23:59:59.000Z" } },
    { label: "rewriteFits flipped", expect: { ...expectation, rewriteFits: !expectation.rewriteFits } },
    ...paramCorruptions,
  ];
}

// =============================================================================
// The runs
// =============================================================================

const consentFile = loadVectorFile(
  "ld_consent.vectors.json",
  "ld_consent",
  validateConsentExpectation,
);
const attributionFile = loadVectorFile(
  "ld_attribution.vectors.json",
  "ld_attribution",
  validateAttributionExpectation,
);

describe("ld_consent — shared contract vectors", () => {
  it("loaded vectors from the hub", () => {
    // Not a formality. `it.each([])` produces NO tests and a file that ran
    // nothing still reports success, which is the exact shape of failure this
    // whole unit exists to abolish.
    expect(consentFile.vectors.length).toBeGreaterThan(0);
    expect(consentFile.conflictRule).toBe("newest wins");
  });

  runVectors(consentFile.vectors, consentVerdict);

  it("a wrong verdict on ANY vector turns this suite red", () => {
    assertEveryCorruptionIsCaught(consentFile.vectors, consentVerdict, corruptConsent);
  });
});

describe("ld_attribution — shared contract vectors", () => {
  it("loaded vectors from the hub", () => {
    expect(attributionFile.vectors.length).toBeGreaterThan(0);
    // Spelled out because copying the neighbour's rule is the single most likely
    // way to break this cookie, and the two files are otherwise near-identical.
    expect(attributionFile.conflictRule).toBe("first touch wins");
  });

  runVectors(attributionFile.vectors, attributionVerdict);

  it("a wrong verdict on ANY vector turns this suite red", () => {
    assertEveryCorruptionIsCaught(attributionFile.vectors, attributionVerdict, corruptAttribution);
  });
});

function runVectors<Expectation>(
  vectors: Vector<Expectation>[],
  verdict: (raw: string | null) => Expectation,
) {
  it.each(vectors.map((vector) => [vector.name, vector] as const))("%s", (_name, vector) => {
    const mismatch = describeMismatch(vector.expect, verdict(vector.raw));
    // The `why` rides along in the failure message: a year from now the useful
    // half of a red test is which contract rule it was pinning, not which field
    // differed.
    expect(mismatch, `${vector.name}\n  why: ${vector.why}\n  `).toBeNull();
  });
}

/**
 * THE SELF-TEST, and it is a requirement of this unit rather than a nicety.
 *
 * A fixture suite that stops executing its vectors goes green, and green is
 * indistinguishable from correct. So every vector's every asserted field is
 * corrupted one at a time and fed through the SAME adapter and the SAME
 * comparison the real run uses; each corruption must be caught. Two things this
 * buys that a hand-edited one-off does not:
 *
 *   - it proves the vectors are REACHING the parsers, on every run, forever;
 *   - it proves each asserted FIELD discriminates. A vector whose `t` nobody
 *     compares, or whose `rewriteFits` is ignored, is a vector pinning less than
 *     it appears to, and that is the quiet way a contract suite decays into
 *     decoration.
 */
function assertEveryCorruptionIsCaught<Expectation>(
  vectors: Vector<Expectation>[],
  verdict: (raw: string | null) => Expectation,
  corrupt: (expectation: Expectation) => { label: string; expect: Expectation }[],
) {
  let checked = 0;
  for (const vector of vectors) {
    const corruptions = corrupt(vector.expect);
    expect(corruptions.length, `${vector.name} produced no corruptions to check`).toBeGreaterThan(0);
    for (const corruption of corruptions) {
      const mismatch = describeMismatch(corruption.expect, verdict(vector.raw));
      expect(
        mismatch,
        `the harness did NOT notice a deliberately wrong verdict for "${vector.name}" ` +
          `(${corruption.label}). The vectors are not being executed, or this field is not asserted.`,
      ).not.toBeNull();
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThanOrEqual(vectors.length);
}

// =============================================================================
// Small validation helpers, shared by the two expectation validators
// =============================================================================

function asObject(where: string, raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${where} must be an object`);
  }
  return raw as Record<string, unknown>;
}

function refuseExtraKeys(where: string, value: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(
      `${where} carries key(s) [${unknown.join(", ")}] this adapter does not assert. ` +
        `Refused rather than ignored: an unasserted key is a vector claiming to pin something it does not.`,
    );
  }
}
