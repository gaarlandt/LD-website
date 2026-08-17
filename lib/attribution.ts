// The attribution handover contract between this marketing site and the Let's
// Dog platform (mijn.letsdog.nl), plus the first-touch rule that governs it.
//
// WHY THIS EXISTS. Ads land on BOTH hosts — Facebook and Instagram campaigns
// point at /rassenkeuze/ here, others go straight to the platform — so this site
// is a landing host in its own right, not a pass-through. The platform reads the
// seven campaign parameters off the URL of the CHECKOUT
// (apps/app/src/lib/attribution.web.ts, ATTRIBUTION_URL_PARAMS) and has no
// persistence of its own, so a click that lands anywhere else arrives at the
// checkout with empty columns. Nothing errors; the fields are simply blank,
// which is the worst shape a measurement bug can take.
//
// FIRST TOUCH WINS, AND THAT IS THE OPPOSITE OF ld_consent. Same mechanism, same
// cookie domain, same two repos, inverted conflict rule:
//
//     ld_consent      NEWEST wins — a later choice replaces an earlier one
//     ld_attribution  FIRST  wins — the first click keeps the credit
//
// Do not reach for lib/consent.ts as the worked example. Consent asks "what does
// the visitor want NOW", so the freshest answer is the true one. Attribution
// asks "which ad earned this visit", and that is settled at the first click; a
// later direct visit is not new information, it is the same person coming back.
// Copying the newest-wins comparison here would hand every conversion to
// whatever the visitor happened to click last, which is precisely the silent
// kind of wrong: the columns fill up, the numbers look healthy, and the credit
// is on the wrong campaign.
//
// THE RECORD IS TAKEN WHOLE, NOT FIELD BY FIELD. Once a touch is stored, a later
// touch adds nothing at all — not even a field the first one left empty. Merging
// would blend two campaigns into one record that never happened (a Google click
// carrying a Facebook click id), and a fabricated combination is worse than a
// missing one.
//
// TWO CONSENT GATES, NOT ONE. The utm set plus gclid ride on STATISTICS; fbclid
// rides on MARKETING. That split is the platform's too (its Attribution type
// groups them the same way), and code that flattens it into one "may we measure"
// boolean silently picks a side for the visitor.

import {
  buildHostOnlyDeletion,
  consentCookieDomain,
  consentCookieSupersedes,
  countCookiesNamed,
  createDuplicateCookieRepair,
  readConsentCookie,
  readFirstParseableCookie,
  type ConsentPayload,
} from "./consent";
import { reportRuleBreach } from "./error-sink";

export const ATTRIBUTION_COOKIE_NAME = "ld_attribution";
export const ATTRIBUTION_COOKIE_VERSION = 1;

/**
 * The truncation limit, mirroring the platform's `ATTRIBUTION_MAX_LENGTH` and
 * the CHECK on the `profiles` columns behind it.
 *
 * Cutting here rather than there is the point: the database must never be the
 * FIRST line of defence. A value that only fails at the far end of the chain
 * comes back as a rejected checkout for someone who is trying to pay.
 */
export const ATTRIBUTION_MAX_LENGTH = 200;

/**
 * The truncation limit on `t` — contract rule 4, and the only field in the
 * record that nothing else caps.
 *
 * Every parameter is cut at `ATTRIBUTION_MAX_LENGTH`, but `t` used to pass
 * through at whatever length it arrived, and this cookie is script-writable by
 * ANY host on `.letsdog.nl` — that is the contract's own mechanism, not a
 * hypothetical. An oversized `t` was therefore enough to push the narrowing
 * rewrite in `narrowStoredToConsent` past the browser's ~4096-byte per-cookie
 * limit, where a Set-Cookie is dropped SILENTLY: this side believes it narrowed
 * the record, the un-narrowed one survives, and the consent erasure path becomes
 * something a co-writer can switch off at will.
 *
 * 64 rather than the 200 the parameters get, because this field has a known
 * shape: `new Date().toISOString()` is exactly 24 characters, and 27 in the
 * extended-year form. The headroom is for a legitimate variant the platform might
 * write — an offset instead of `Z`, more sub-second digits — and deliberately not
 * for a shape we would have to guess at.
 *
 * IT IS THE PLATFORM'S NUMBER TOO — `MAX_TOUCH_MOMENT_LENGTH` in its
 * packages/core/src/attribution.ts — and the platform CUTS at it rather than
 * refusing the record. So does the parser below, which is where the reason lives.
 *
 * This cap covers only the ONE field nothing else bounded. The size of the
 * finished assignment is a separate rule with a separate guard —
 * `ATTRIBUTION_MAX_COOKIE_BYTES` below — because capping every field still
 * leaves a record that is too big once they are added up and percent-encoded.
 */
export const ATTRIBUTION_MAX_TIMESTAMP_LENGTH = 64;

/**
 * 90 days — the usual campaign attribution window, and longer than any of the
 * ad platforms' own click windows (Meta's default is 7 days).
 *
 * An explicit Max-Age is not optional. Without one this is a session cookie, and
 * a visitor who clicks an ad today and buys tomorrow arrives with nothing, which
 * reads exactly like organic traffic.
 */
const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

/** The parameters that ride on STATISTICS consent. */
export const STATISTICS_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;

/** The parameters that ride on MARKETING consent. */
export const MARKETING_PARAMS = ["fbclid"] as const;

/**
 * The seven names, byte-identical to the platform's `ATTRIBUTION_URL_PARAMS`.
 *
 * This is an allowlist on both sides, and the platform ignores anything outside
 * it without a word. So a name invented here does not arrive as an error — it
 * arrives as nothing. Add a name only by changing both repos together, and never
 * rename one in passing.
 */
export const ATTRIBUTION_URL_PARAMS = [...STATISTICS_PARAMS, ...MARKETING_PARAMS] as const;

export type AttributionParamName = (typeof ATTRIBUTION_URL_PARAMS)[number];

/** What the visitor brought with them. Every field optional; usually empty. */
export type AttributionParams = Partial<Record<AttributionParamName, string>>;

/** The stored record: the parameters plus a version and the moment of the touch. */
export type AttributionPayload = AttributionParams & {
  /** contract version */
  v: number;
  /** moment of the FIRST touch, ISO 8601 with Z — never restamped */
  t: string;
};

/** The consent categories this module cares about, as `lib/consent.ts` reports them. */
export type ConsentGates = {
  /** statistics */
  s: boolean;
  /** marketing */
  m: boolean;
};

/**
 * Trim, truncate, and drop what is left empty.
 *
 * The trim mirrors the platform's `cleanAttributionValue` byte for byte, and it
 * is not tidiness. An agency tag whose template variable resolves to blank
 * renders as `?utm_source=%20`: a non-empty string here, nothing at all after
 * the platform trims it. Without this the two writers disagree about what counts
 * as a captured value, and the disagreement is expensive in one specific way —
 * this side would store `{v,t,utm_source:" "}`, the platform would read a record
 * carrying no campaign, and the first-touch slot would be spent on it. The next
 * genuine ad click then loses to a touch that recorded nothing.
 */
function cleanValue(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, ATTRIBUTION_MAX_LENGTH);
}

/**
 * The seven parameters as they appear in a URL query string, cleaned.
 *
 * Reading a URL is not storage and needs no consent — the gate applies to
 * keeping the values, not to seeing them.
 */
export function readAttributionParams(search: string): AttributionParams {
  const query = new URLSearchParams(search);
  const params: AttributionParams = {};
  for (const name of ATTRIBUTION_URL_PARAMS) {
    const value = cleanValue(query.get(name));
    if (value !== undefined) params[name] = value;
  }
  return params;
}

/** Did the visitor bring anything at all? */
export function hasAnyParam(params: AttributionParams): boolean {
  return ATTRIBUTION_URL_PARAMS.some((name) => params[name] !== undefined);
}

/**
 * The subset the visitor's consent actually allows us to keep.
 *
 * Two gates evaluated separately, so a visitor who accepts statistics but
 * refuses marketing keeps their utm attribution and loses only the Meta click
 * id — instead of all-or-nothing in whichever direction a single boolean
 * happened to round to.
 */
export function consentedParams(
  params: AttributionParams,
  consent: ConsentGates,
): AttributionParams {
  const allowed: AttributionParams = {};
  if (consent.s) {
    for (const name of STATISTICS_PARAMS) {
      if (params[name] !== undefined) allowed[name] = params[name];
    }
  }
  if (consent.m) {
    for (const name of MARKETING_PARAMS) {
      if (params[name] !== undefined) allowed[name] = params[name];
    }
  }
  return allowed;
}

/** Serialise to the wire format the platform parses: URL-encoded JSON. */
export function serializeAttributionPayload(payload: AttributionPayload): string {
  const ordered: Record<string, unknown> = {
    v: payload.v,
    t: payload.t,
  };
  for (const name of ATTRIBUTION_URL_PARAMS) {
    if (payload[name] !== undefined) ordered[name] = payload[name];
  }
  return encodeURIComponent(JSON.stringify(ordered));
}

/**
 * The inverse. Null for anything that is not a well-formed record.
 *
 * DELIBERATELY TOLERANT OF AN UNKNOWN VERSION, which is the opposite of what
 * `parseConsentPayload`'s reader does, and for a reason that follows from
 * first-touch. The only question asked of a stored record here is "does a touch
 * already exist" — and a record written by a newer version of the other repo
 * answers yes just as well as one of ours. Refusing it would report "no touch
 * yet" and overwrite a first touch with a later one, which is the single failure
 * this whole module exists to prevent. Unknown fields are dropped on read but
 * left untouched in the cookie, because nothing here ever rewrites a record it
 * did not fully understand.
 *
 * AND TOLERANT OF `t` IN THE SAME DIRECTION, for the same reason: the only
 * question asked of it is whether it is a string, and an over-long one is CUT
 * rather than refused. The argument sits at the cut itself, below.
 */
export function parseAttributionPayload(raw: string): AttributionPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  if (typeof record.v !== "number" || typeof record.t !== "string") return null;

  // `t` is CUT here, never refused, and this line is where that is decided.
  //
  // BEING STRICTER THAN THE CO-WRITER IS A FAILURE MODE OF ITS OWN. The platform
  // keeps a record with an oversized `t`, cutting it at the same 64
  // (`MAX_TOUCH_MOMENT_LENGTH` in its packages/core/src/attribution.ts), so a
  // record we threw away is a record the two hosts disagree about the EXISTENCE
  // of. Ours would answer "no touch yet" to `recordFirstTouch` and overwrite a
  // first touch that really was there — the single failure this whole module
  // exists to prevent, and the one direction every rule in this file leans away
  // from. A bound both sides share, applied two different ways, is not a shared
  // bound at all.
  //
  // Cutting costs a real record nothing. At 64 a legitimate stamp is never
  // touched (24 characters canonical, 27 in the extended-year form), so only an
  // already-broken value is ever shortened, and a shortened broken value is not a
  // plausible wrong moment: it parses as Invalid Date. The platform's
  // `buildFbcFromFbclid` answers that with `null`, so an unreadable moment costs
  // the click id's `creation_time` and not the record.
  //
  // Note what is NOT checked, and note it is the same reasoning: `t` is asked for
  // its type and nothing else, matching the platform exactly. A regex pinned to
  // `toISOString()`'s output would refuse the next legitimate variant the platform
  // writes — an offset instead of `Z`, more sub-second digits — and refusing is
  // the expensive direction. Nor is it normalised: `toIsoTimestamp` from
  // lib/consent.ts canonicalises an untrusted value for WRITING, while this is
  // bytes the other repo already chose, on the one field both contracts say is
  // never restamped.
  const payload: AttributionPayload = {
    v: record.v,
    t: record.t.slice(0, ATTRIBUTION_MAX_TIMESTAMP_LENGTH),
  };
  for (const name of ATTRIBUTION_URL_PARAMS) {
    const value = cleanValue(record[name]);
    if (value !== undefined) payload[name] = value;
  }
  return payload;
}

/**
 * `.letsdog.nl` on a Let's dog host, null anywhere else — the same rule the
 * consent handover uses, and shared rather than copied so the two cookies can
 * never disagree about which hosts count as ours.
 *
 * Off production (a *.pages.dev preview, localhost) the Domain attribute has to
 * be omitted or the browser drops the write silently. The cookie is then
 * host-only: still fully observable for verification, just not crossing to the
 * platform. Only the crossing itself is production-only.
 */
export function attributionCookieDomain(hostname: string): string | null {
  return consentCookieDomain(hostname);
}

/**
 * The size a record may reach before the browser stops keeping it — contract
 * rule 5, and the platform's `ATTRIBUTION_MAX_COOKIE_BYTES` to the byte.
 *
 * WHY A SECOND LIMIT ON TOP OF THE PER-FIELD ONE. `ATTRIBUTION_MAX_LENGTH` caps
 * each field at 200 CHARACTERS, and characters are not what a browser weighs.
 * `encodeURIComponent(JSON.stringify(...))` turns one three-byte character into
 * nine (`€` becomes `%E2%82%AC`), so seven fields that each pass the per-field
 * cap add up to roughly 12 kB against a ~4096-byte limit. That record passes
 * every local check we had and the browser then drops the write SILENTLY —
 * `document.cookie = <too big>` throws nothing, returns nothing, and leaves no
 * cookie behind. It is reachable from a plain URL, not just from a co-writer.
 *
 * WHY `ld_attribution=` IS MEASURED ALONG WITH THE VALUE, which is deliberately
 * STRICTER than the contract's wording ("the complete cookie value"). A browser
 * spends its 4096 bytes on the name and the value TOGETHER — Chrome literally
 * sums `name.size() + value.size()` — so a writer that measures only the value
 * calls a 4090-byte record "fits" and the browser discards it anyway, which is
 * precisely the hole rule 5 exists to close. The 15 bytes of difference are only
 * reachable with about 4 kB of campaign values, and erring in this direction
 * costs at most a record the platform would have written and we refuse. Erring
 * the other way is the silent failure this whole contract is built against.
 * The platform made the same call first (its T-564); this mirrors it.
 *
 * The ATTRIBUTES are deliberately outside the measurement. Browsers bound name
 * and value together and give attributes their own, far looser budget, and ours
 * are short fixed strings either way.
 */
export const ATTRIBUTION_MAX_COOKIE_BYTES = 4096;

/**
 * The length of a string in UTF-8 BYTES, which is the only number a browser
 * cares about here.
 *
 * `String.length` counts UTF-16 code units, and for everything outside ASCII
 * that is a different number from the one the browser weighs — a check written
 * against it passes on exactly the records this limit exists to stop.
 */
export function attributionByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * What building a cookie produces: either an assignment that fits, or an
 * explicit refusal carrying the measurement that caused it.
 *
 * DELIBERATELY NOT A BARE STRING ANY MORE. A builder that always hands back
 * something assignable makes the size limit an optional extra check a caller can
 * forget, and forgetting it is invisible: the over-limit assignment throws
 * nothing, so every line of the calling code looks like it worked. With the
 * union there is no way to reach the assignment without reading `fits` first.
 */
export type AttributionCookieResult =
  | { fits: true; cookie: string; bytes: number }
  | { fits: false; cookie: null; bytes: number; limit: number };

/**
 * The document.cookie string. Script-readable by contract — the platform reads
 * it in the client.
 *
 * `Secure` is conditional, matching the platform's writer. Production is https
 * so the attribute is always there in practice; on a plain-http dev server the
 * browser refuses a Secure cookie and the capture would vanish with no error at
 * all — which reads as "the feature is broken" to whoever is trying to verify
 * it, and is the fastest way to have somebody "fix" code that was correct.
 *
 * OVER THE LIMIT, NOTHING COMES OUT — not a shortened record. Dropping fields to
 * make one fit was the considered alternative and it loses on the argument that
 * runs through this whole module: a record with `utm_term` quietly removed looks
 * perfectly healthy, nobody can tell afterwards that anything was taken out, and
 * it still holds the first-touch slot for ninety days. Absence is a state the
 * next click can repair; a plausible wrong answer is not.
 */
export function buildAttributionCookie(
  payload: AttributionPayload,
  hostname: string,
): AttributionCookieResult {
  const nameAndValue = `${ATTRIBUTION_COOKIE_NAME}=${serializeAttributionPayload(payload)}`;
  const bytes = attributionByteLength(nameAndValue);
  if (bytes > ATTRIBUTION_MAX_COOKIE_BYTES) {
    return { fits: false, cookie: null, bytes, limit: ATTRIBUTION_MAX_COOKIE_BYTES };
  }

  const domain = attributionCookieDomain(hostname);
  const secure = typeof location === "undefined" || location.protocol === "https:";
  return {
    fits: true,
    bytes,
    cookie: [
      nameAndValue,
      "Path=/",
      "SameSite=Lax",
      ...(secure ? ["Secure"] : []),
      `Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_SECONDS}`,
      ...(domain ? [`Domain=${domain}`] : []),
    ].join("; "),
  };
}

/**
 * The deletion that carries NO Domain, and leaving that attribute off is the
 * entire function — contract rule 6, and the platform's
 * `buildAttributionHostOnlyDeletion` to the byte.
 *
 * An assignment without a Domain can only reach the HOST-ONLY copy on the host
 * where it happens; the shared `.letsdog.nl` record is guaranteed to survive it.
 * That is exactly the instrument the duplicate repair needs, because
 * `document.cookie` never reveals the Domain of what you READ — deleting the
 * host-only copy and looking again is the only way to learn which copy you were
 * holding.
 *
 * IT HAS ITS OWN NAME SO THE DANGEROUS VARIANT CANNOT BE PICKED BY ACCIDENT.
 * Add a Domain to this string and the same line wipes the SHARED record off both
 * hosts — a first touch nobody gets back, on the one cookie where neither host
 * can tell afterwards that anything was lost.
 *
 * The string is BUILT IN `lib/consent.ts` now that `ld_consent` carries the same
 * rule (its contract adopted it 2026-08-13), for the same reason
 * `attributionCookieDomain` delegates: one spelling of a deletion the browser has
 * to recognise, so the two cookies cannot drift apart. This name stays because
 * callers and tests use it, and because a deletion that must never grow a Domain
 * is worth a name at the point of use.
 */
export function buildAttributionHostOnlyDeletion(): string {
  return buildHostOnlyDeletion(ATTRIBUTION_COOKIE_NAME);
}

/**
 * The cookie strings that delete the record.
 *
 * Two of them: a cookie can only be deleted with the same Domain it was written
 * with, and the host-only attempt covers a preview host where there is none.
 * Same reasoning as the `_fbp`/`_fbc` clearing in meta-pixel.tsx.
 *
 * The host-only string is REUSED rather than restated, mirroring the platform.
 * Two spellings of one deletion is one spelling that can drift, and the drift
 * that matters is silent: a deletion the browser does not recognise as matching
 * leaves the record exactly where it was.
 */
export function buildAttributionDeletion(hostname: string): string[] {
  const domain = attributionCookieDomain(hostname);
  const base = buildAttributionHostOnlyDeletion();
  return domain ? [base, `${base}; Domain=${domain}`] : [base];
}

/**
 * How many copies of this cookie does this header carry — contract rule 6, and
 * the platform's `countAttributionCookies`.
 *
 * ALL of them, parseable or not. The question is deliberately not "is there a
 * valid record" (`readAttributionCookie` answers that) but "did MORE THAN ONE
 * assignment with this name arrive", because that count is the only hint
 * `document.cookie` gives. The Domain attribute is not among the things it
 * hands back, which is precisely why the repair below is a host-only delete and
 * a re-read rather than a comparison on domain.
 *
 * Exact name match on the FIRST `=`, the same discipline as
 * `readFirstParseableCookie`: the value is URL-encoded JSON and may carry an `=`
 * of its own, and a cookie called `old_ld_attribution` must never be counted as
 * one of ours — a miscount here fabricates a duplicate and makes the repair
 * delete a record that was alone and correct.
 *
 * Counted by `lib/consent.ts` now that `ld_consent` carries the same rule; this
 * name stays because the platform's mirror carries it and the tests pin it.
 */
export function countAttributionCookies(cookieHeader: string | null | undefined): number {
  return countCookiesNamed(cookieHeader, ATTRIBUTION_COOKIE_NAME);
}

/**
 * MORE THAN ONE COOKIE OF THIS NAME: delete the HOST-ONLY copy, re-read,
 * continue with whatever survives — contract rule 6, mirrored from the
 * platform's `readStoredTouch` (T-564, commit 45a47cc,
 * apps/app/src/lib/attribution.web.ts).
 *
 * THIS IS NOT THE GAP RULE 1 ALREADY COVERS, and the difference is the whole
 * reason it exists. `readFirstParseableCookie` takes the first PARSEABLE record
 * instead of the first match, so a CORRUPT host-only copy can no longer mask the
 * shared one. A perfectly VALID host-only copy still can: it parses, RFC 6265
 * §5.4 hands the more specific copy over FIRST, and it therefore wins. Any host
 * under `.letsdog.nl` can plant one — a `__Host-` prefix is not available as a
 * defence, because both hosts must read this cookie by design — and there is
 * nothing at all to see when it happens: no error, full columns, and the wrong
 * campaign holding the first-touch slot for ninety days.
 *
 * WHY DELETE-AND-RE-READ AND NOT A COMPARISON ON DOMAIN. `document.cookie`
 * yields names and values and nothing else; the Domain of what you read is not
 * derivable from it. Wiping the host-only copy and seeing what is left is the
 * only way to learn which copy you were holding. Anyone who replaces this with a
 * Domain-based check is building something that cannot work.
 *
 * FIRST TOUCH IS STILL THE CONFLICT RULE, and still the inverse of `ld_consent`.
 * The repair decides which COPY is real, never which RECORD wins: what survives
 * it is the existing touch, and the capture path leaves that alone. The two
 * cookies now share the repair and keep their opposite conflict rules — that is
 * exactly the split the mechanism was designed around.
 *
 * THE ACCEPTED PRICE, mirrored from the platform along with the rule. On
 * localhost and on a *.pages.dev preview this site writes host-only itself
 * (`attributionCookieDomain` returns null there, because a Domain the browser
 * cannot match makes the write vanish), so a repair firing there would delete
 * our own record. It cannot fire there: the shared parent domain does not exist
 * on those hosts, so there is no second writer and never a second copy.
 *
 * THE BODY MOVED TO `lib/consent.ts` on 2026-08-13, when that contract adopted
 * the same rule (its section "More than one cookie of this name"). The factory
 * there holds the once-per-page-session latch — every read runs the repair,
 * including one per CTA click, and the second read of a duplicate that is still
 * there is the same incident, not a new one. The message text, the error/warning
 * split and the `[attributie]` prefix are unchanged, byte for byte, because the
 * platform's mirror greps for them.
 */
const repairDuplicateAttributionCookies = createDuplicateCookieRepair(
  ATTRIBUTION_COOKIE_NAME,
  "attributie",
);

/**
 * The stored record as it currently stands, or null.
 *
 * THE FIRST PARSEABLE RECORD, NOT THE FIRST MATCH — contract rule 1, and it
 * costs more here than on `ld_consent`. Any *.letsdog.nl subdomain can set its
 * own host-only `ld_attribution`, and RFC 6265 §5.4 puts a deeper Path first, so
 * a corrupt copy would be read before the shared one. The caller's next question
 * is "does a touch exist" (`recordFirstTouch`), so a shadowed read answers "no"
 * and spends the first-touch slot on the current visit — for ninety days, with
 * nothing logged and the columns full of the wrong campaign.
 *
 * Shared with `readConsentCookie` rather than copied, for the same reason
 * `attributionCookieDomain` delegates: the two cookies must not drift apart on a
 * rule the platform implements once on its side.
 *
 * AND RULE 6 RUNS HERE, WHICH IS WHAT PUTS IT ON EVERY READ PATH AT ONCE. The
 * contract asks for the repair on both paths — the capture, and the read that
 * supplies the campaign claiming the sale — because a planted copy answers "does
 * a touch already exist" just as convincingly as it hands over a campaign. This
 * module has one read seam and three callers through it (`recordFirstTouch`,
 * `narrowStoredToConsent`, and components/analytics/cta-tracker.tsx, which is
 * this site's analogue of the platform's read at checkout), so placing the
 * repair here covers all three and leaves no fourth caller to remember.
 */
export function readAttributionCookie(): AttributionPayload | null {
  if (typeof document === "undefined") return null;
  repairDuplicateAttributionCookies();
  // Read AFTER the repair: `document.cookie` is a different string once the
  // host-only copy is gone, and reading the old one would defeat the point.
  return readFirstParseableCookie(
    document.cookie,
    ATTRIBUTION_COOKIE_NAME,
    parseAttributionPayload,
  );
}

/**
 * The one place in this module that assigns a record to `document.cookie`.
 * `false` means NOTHING IS STORED, and that it has been reported.
 *
 * WHY THE REPORT IS PART OF THE RULE AND NOT A NICETY. Refusing an over-sized
 * write only swaps a silent error for a silent non-action unless somebody can
 * see it happen — which is the same objection that killed "drop a field to make
 * it fit". So the two halves ship together: an outcome the caller can tell apart
 * from success, and a line an operator can find.
 *
 * IT NOW GOES TO A REAL SINK AS WELL, and the console line stays. Until
 * 2026-08-15 this comment said `console.error` rather than an error service
 * "because this repo has no error sink at all" — that decision was taken on its
 * own terms as D-6 and built as T-44, so the report is now also sent to Sentry
 * (`reportRuleBreach`, tagged `runtime: browser`). The console line is not
 * redundant: the DSN lives only in the Cloudflare dashboard, so on localhost and
 * on any deploy made before that variable is set, the console is still the whole
 * of it — and it is the message the platform's mirror greps for, byte for byte.
 * Still deliberately NOT routed through `trackEvent`: GA4 is consent-gated and
 * denied by default, so that sink would fall silent exactly when this fires, and
 * an analytics event is not an error report in the first place. What travels is
 * the MEASUREMENT that caused the refusal — the byte count and the limit — not
 * merely that something broke.
 *
 * The message text is the platform's, byte for byte
 * (apps/app/src/lib/attribution.web.ts), so one operator grepping one fixed
 * string finds the same failure on both hosts. Error and not warning: this does
 * not say something is odd about one visitor, it says a record on the shared
 * domain has grown past what can be written — either a campaign with absurd
 * values or a co-writer trying to jam the erasure path shut, and both belong in
 * front of somebody's eyes.
 */
function writeAttributionCookie(payload: AttributionPayload, hostname: string): boolean {
  const built = buildAttributionCookie(payload, hostname);
  if (!built.fits) {
    console.error("[attributie] RECORD TE GROOT VOOR EEN COOKIE: niets geschreven", {
      cookie: ATTRIBUTION_COOKIE_NAME,
      bytes: built.bytes,
      limit: built.limit,
    });
    reportRuleBreach("handover_cookie.record_too_large", {
      cookie: ATTRIBUTION_COOKIE_NAME,
      bytes: built.bytes,
      limit: built.limit,
    });
    return false;
  }
  document.cookie = built.cookie;
  return true;
}

/**
 * Store this visit as the first touch — unless one is already recorded.
 *
 * Returns whether anything was written, so a caller can tell "declined, a touch
 * already exists" from "nothing worth storing".
 *
 * THE EXISTING-RECORD CHECK IS THE WHOLE FEATURE. Any parseable record wins,
 * including one written by the platform: two hosts write this cookie and neither
 * can tell which of them got there first, so "already present" is the only
 * question either side can answer honestly.
 *
 * It never writes an empty record either. A direct visit with no parameters, or
 * an ad click from someone who refused both gates, must leave the slot open —
 * writing `{v,t}` with no campaign in it would consume the first touch and make
 * the NEXT real ad click look like a returning visitor.
 *
 * A FOURTH WAY TO GET `false`, ADDED WITH CONTRACT RULE 5: the record does not
 * fit in a cookie. It stays a boolean rather than growing a reason code because
 * the meaning documented above — "was anything written" — is exactly the
 * question a too-large record also answers, and because the platform's writer
 * returns the same boolean. What changed is that the answer is now TRUE. Before
 * this, an over-sized record was assigned, dropped by the browser without a
 * word, and reported back as a success; the caller was told a touch had been
 * recorded that did not exist anywhere.
 */
export function recordFirstTouch(
  params: AttributionParams,
  consent: ConsentGates,
  hostname: string,
  at: string = new Date().toISOString(),
): boolean {
  if (typeof document === "undefined") return false;
  if (readAttributionCookie() !== null) return false;

  const allowed = consentedParams(params, consent);
  if (!hasAnyParam(allowed)) return false;

  return writeAttributionCookie({ v: ATTRIBUTION_COOKIE_VERSION, t: at, ...allowed }, hostname);
}

/**
 * The stored record narrowed to what the CURRENT consent still allows, or null
 * when nothing survives.
 *
 * `t` is carried over untouched. The record's moment is when the touch happened,
 * not when we last looked at it, and the platform's own first-touch rule reads
 * that field — restamping it would make an old visit look new.
 */
export function applyConsentToStored(
  stored: AttributionPayload,
  consent: ConsentGates,
): AttributionPayload | null {
  const allowed = consentedParams(stored, consent);
  if (!hasAnyParam(allowed)) return null;
  return { v: stored.v, t: stored.t, ...allowed };
}

/**
 * Do these two records hold the same parameters? Envelope (`v`, `t`) excluded.
 *
 * Used to keep a narrowing pass silent when it would change nothing — a cookie
 * rewritten on every page load is churn the platform would have to ignore.
 */
export function isSameAttribution(a: AttributionParams, b: AttributionParams): boolean {
  return ATTRIBUTION_URL_PARAMS.every((name) => a[name] === b[name]);
}

/** Removes the record, with and without the Domain it may have been written with. */
export function deleteAttributionCookie(hostname: string): void {
  if (typeof document === "undefined") return;
  for (const cookie of buildAttributionDeletion(hostname)) document.cookie = cookie;
}

/**
 * Narrows an already-stored record to what the CURRENT consent still allows.
 *
 * This is the half that handles a visitor who takes marketing back but keeps
 * statistics: the utm attribution stays, the Meta click id goes. Deleting only
 * on a full withdrawal would leave `fbclid` sitting there under a gate that had
 * just closed.
 *
 * IT REFUSES TO REWRITE A RECORD IT DOES NOT FULLY UNDERSTAND. The parser keeps
 * a record at an unknown version on purpose, but keeping and rewriting are
 * different rights: this module can only serialise the seven names it knows, so
 * rewriting a newer record would silently drop whatever the other repo added
 * while still stamping the cookie with that newer version. Deletion is the one
 * exception, because "no gate is open" needs no understanding of the payload to
 * be the right answer — and it is the answer that protects the visitor.
 */
export function narrowStoredToConsent(consent: ConsentGates, hostname: string): void {
  const stored = readAttributionCookie();
  if (stored === null) return;

  const narrowed = applyConsentToStored(stored, consent);
  if (narrowed === null) {
    deleteAttributionCookie(hostname);
    return;
  }
  if (stored.v !== ATTRIBUTION_COOKIE_VERSION) return;
  // Silent when nothing changed: this runs on every consent event, and a cookie
  // rewritten per pageview is churn the platform would have to learn to ignore.
  if (isSameAttribution(stored, narrowed)) return;

  // THE ONE PLACE WHERE "WRITE NOTHING" IS THE WRONG ANSWER (contract rule 5
  // read next to rule 4). Rule 5 says an over-sized record is not written, and
  // on the capture path that is the whole of it — the slot simply stays open.
  // Here it is not: stopping would leave the UN-NARROWED record standing,
  // carrying precisely the click id the visitor has just withdrawn. That is a
  // consent failure on its own, and worse, it is a switch: this parser
  // deliberately accepts UNENCODED JSON, so a co-writer on `.letsdog.nl` can
  // plant a 3 kB record that only crosses the limit once our serializer
  // percent-encodes it, and thereby disable our erasure path entirely. Deleting
  // is always permitted, always fits, and leaves the first-touch slot open for
  // the next real click. The platform's narrowing pass ends on the same line.
  if (!writeAttributionCookie(narrowed, hostname)) deleteAttributionCookie(hostname);
}

/**
 * The choice that actually governs, which is NOT always the one Cookiebot just
 * reported.
 *
 * Cookiebot only knows what it was told on THIS host. A visitor can have
 * answered on mijn.letsdog.nl since, and `ld_consent` carries that answer —
 * which is the entire reason `ConsentSync` exists. Everything else subscribing
 * to Cookiebot can afford to act on the stale answer for the millisecond before
 * the sync lands, because their actions are recoverable: a cookie write is
 * corrected by newest-wins, a pixel that did not load loads on the next event.
 *
 * ATTRIBUTION IS THE ONE THAT CANNOT BE UNDONE. First touch never re-adds a
 * dropped field, and a deleted record is gone — so acting a moment too early on
 * a stale refusal permanently destroys a real first touch, including one the
 * platform wrote. Resolving the newer choice HERE, with the platform's own
 * comparison, makes this independent of which subscriber's effect happens to run
 * first, which is the same reason the consent contract states its merge rule at
 * every writer instead of ordering the writers.
 *
 * A null from Cookiebot passes straight through: `consentCookieSupersedes`
 * answers no without a local timestamp to be newer than, so a withdrawal stays a
 * withdrawal.
 */
export function effectiveConsent(cookiebot: ConsentPayload | null): ConsentPayload | null {
  const cookie = readConsentCookie();
  return cookie && consentCookieSupersedes(cookie, cookiebot) ? cookie : cookiebot;
}

/**
 * The handler that keeps the attribution record in step with consent: hand it
 * every state Cookiebot reports, in the order it reports them.
 *
 * A closure for the same reason `createConsentRecorder` is one — one of its
 * rules is about a SEQUENCE, and the subscription's life is what bounds it.
 *
 * ABSENCE OF AN ANSWER IS NOT AN EVENT, with one exception that matters. A
 * withdrawal and "never asked on this host" reach us as the same null, so acting
 * on the first null would delete a record belonging to a visitor who has not
 * seen the banner yet — including one the platform wrote. But a withdrawal made
 * in an EARLIER session would then never be honoured at all, and the campaign
 * identifiers would outlive it by up to ninety days. The two are distinguishable
 * after all, just not from Cookiebot: `ld_consent` records a real refusal as an
 * explicit all-false, while a visitor nobody asked has no such cookie. That is
 * the same distinction `lib/consent.ts` already draws, read from the other side.
 *
 * `landedAt` IS THE MOMENT OF THE LANDING, NOT THE MOMENT OF THE CONSENT EVENT,
 * and the default evaluates once — when the recorder is built, which is when the
 * effect that read `landing` off the URL ran. It has to be stamped here for the
 * same reason `landing` is captured here: both describe the arrival, and both
 * have to survive every later event on that page view.
 *
 * WITHOUT IT THIS HANDLER RESTAMPS, and it took six days and a production
 * measurement to see (loop T-58, introduced 2026-08-11 by the commit that added
 * the handover). Neither of the two calls below is wrong on its own —
 * `recordFirstTouch` refuses when a record exists and `applyConsentToStored`
 * carries `t` over untouched — so the fault lives on the seam, and only when a
 * THIRD party removes the record between them: `ld_attribution` is classified
 * Statistics at the CMP (T-57), so withdrawing statistics makes Cookiebot delete
 * it, correctly. This handler then runs on that same event, finds an empty jar,
 * sees no existing record, and captures the landing parameters again — which the
 * URL still carries. Stamped with "now", that hands the platform a first touch
 * that is really a last touch, and it builds Meta's `fbc` from this field as the
 * click moment.
 */
export function createAttributionRecorder(
  landing: AttributionParams,
  hostname: string,
  landedAt: string = new Date().toISOString(),
): (consent: ConsentPayload | null) => void {
  let sawConsent = false;

  return (cookiebot) => {
    if (cookiebot) {
      sawConsent = true;
    } else if (!sawConsent) {
      const recorded = readConsentCookie();
      const refusedEverywhere = recorded && !recorded.p && !recorded.s && !recorded.m;
      if (refusedEverywhere) narrowStoredToConsent({ s: false, m: false }, hostname);
      return;
    }

    // A witnessed withdrawal is just both gates closed, so it needs no branch of
    // its own — it falls through the same two calls and ends in a delete.
    const consent = effectiveConsent(cookiebot);
    const gates: ConsentGates = consent ? { s: consent.s, m: consent.m } : { s: false, m: false };

    if (hasAnyParam(landing)) recordFirstTouch(landing, gates, hostname, landedAt);
    narrowStoredToConsent(gates, hostname);
  };
}
