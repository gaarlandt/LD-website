// The consent handover contract between this marketing site and the Let's dog
// platform (mijn.letsdog.nl), plus the small Cookiebot reader both consumers
// share.
//
// WHY A COOKIE OF OUR OWN. The visitor answers the banner here, on letsdog.nl,
// but the platform is the surface that has to honour that answer. Cookiebot's
// own CookieConsent cookie cannot carry it: it is written host-only, so
// mijn.letsdog.nl cannot read it, and Cookiebot's Cross-domain Consent Sharing
// cannot repair that either — since Chrome 115 and Storage Partitioning it only
// shares from a subdomain UP to the root domain, which is the opposite of the
// direction we need. A plain first-party cookie on the shared parent domain
// does work; that was measured with a control cookie on 2026-08-07, and it is
// the same mechanism by which _ga and _fbp are already visible on both hosts.
// Full reasoning in loop decision D-93 (option b4).
//
// THE CONTRACT IS FIXED — take it literally, invent nothing. It is KTD0 in
// docs/plans/2026-08-07-006 in the platform repo, and the platform's reader
// (packages/core/src/consent.ts) must agree byte for byte. If the name, the
// domain, the version or a field name differs by one character, the platform
// reads nothing and falls back to "everything refused" — safe, but silent, and
// that silence looks exactly like working code. Change it on both sides in the
// same week or not at all.
//
// "necessary" deliberately has no field: it is always true, and a cookie that
// records a consent choice is itself strictly necessary (R4), so this cookie
// does not require consent to be written.

import { reportRuleBreach } from "./error-sink";

export const CONSENT_COOKIE_NAME = "ld_consent";
export const CONSENT_COOKIE_VERSION = 1;
export const CONSENT_COOKIE_DOMAIN = ".letsdog.nl";

// Mirrors Cookiebot's own consentLifetime (12 months, read off the live banner
// on 2026-08-08) so the handover never outlives the choice it reports. Without
// a Max-Age this would be a session cookie and a returning visitor would arrive
// at the platform as "no choice recorded" — which reads as a refusal.
const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** The three optional Cookiebot categories. `necessary` is always true. */
export type ConsentCategories = {
  /** preferences */
  p: boolean;
  /** statistics */
  s: boolean;
  /** marketing */
  m: boolean;
};

export type ConsentPayload = ConsentCategories & {
  /** contract version */
  v: number;
  /** moment of the choice, ISO 8601 with Z */
  t: string;
};

type CookiebotConsent = {
  necessary: boolean;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
  method: string | null;
};

type CookiebotApi = {
  hasResponse: boolean;
  consent: CookiebotConsent;
  /** a Date once a choice exists, null before (verified on the live banner) */
  consentUTC: Date | number | string | null;
  /**
   * Cookiebot's own public way to record a choice without the banner — the same
   * call its dialog makes, used on the live banner during T-23. Optional because
   * it is third-party state: an ad blocker or a failed uc.js leaves the object
   * absent or half-built, and a missing method must degrade to "no sync", not to
   * a TypeError in a consent path.
   */
  submitCustomConsent?: (
    preferences: boolean,
    statistics: boolean,
    marketing: boolean,
  ) => void;
  /**
   * Reopens Cookiebot's own preference dialog with the current choice filled in.
   * This is the withdrawal route the cookie declaration promises, surfaced as
   * the footer's "Cookie-instellingen" control. Optional for the same reason as
   * submitCustomConsent: it is third-party state, and a blocked or half-built
   * uc.js must degrade to a control that says so rather than to a TypeError.
   */
  renew?: () => void;
};

declare global {
  interface Window {
    Cookiebot?: CookiebotApi;
  }
}

/**
 * Serialise to the wire format the platform parses: URL-encoded JSON, keys in
 * the contract's order.
 */
export function serializeConsentPayload(payload: ConsentPayload): string {
  const { v, t, p, s, m } = payload;
  return encodeURIComponent(JSON.stringify({ v, t, p, s, m }));
}

/**
 * THE PLATFORM'S OWN TIMESTAMP CHECK, copied byte for byte from the mirror
 * reader this contract names — `ISO_INSTANT_WITH_Z` in the platform repo's
 * packages/core/src/consent.ts. Not a shape we chose, and not ours to tidy: an
 * ISO 8601 instant with Z, and nothing else. The platform's comment gives the
 * reason — a stamp without a zone makes "is this cookie newer than what I
 * already recorded" (R8) undecidable, which is a breach of the contract rather
 * than a detail.
 *
 * WHY THIS REFUSES WHERE `lib/attribution.ts` TRUNCATES. Both cookies had the
 * same unbounded-`t` hole, and they get opposite verbs on purpose — copying the
 * attribution fix over here would be the wrong repair:
 *
 * - `ld_attribution` asks "does a touch exist". A record the other side keeps
 *   but we discard costs a first touch that can never be recovered, so its rule
 *   4 cuts `t` at 64 and never refuses the record.
 * - `ld_consent` asks "which choice governs". Half-reading a choice is the
 *   expensive direction: a truncated `t` is a lie about WHEN, and R8 is decided
 *   on exactly that field. So both contracts say an unreadable consent degrades
 *   to a refusal, and the platform implements that literally — a failing `t`
 *   makes the WHOLE record unreadable there, which it treats as "everything
 *   refused". `return null` is how this parser already spells that.
 *
 * Mirroring it is what stops the two readers from disagreeing about the same
 * bytes, which is the failure this file's header calls silent because it looks
 * exactly like working code.
 *
 * THE LENGTH BOUND FALLS OUT OF THE SHAPE, and is what T-39 was actually about.
 * A matching `t` is at most 24 characters, so an oversized one can no longer
 * push a `writeConsentCookie` rewrite past the browser's ~4096-byte per-cookie
 * limit. This cookie lives on the shared parent domain and is script-writable by
 * both hosts BY CONTRACT, so an oversized `t` is that contract's own mechanism
 * rather than a hypothetical — and a Set-Cookie over the limit is dropped
 * SILENTLY, leaving the old state in place. On this cookie that means a consent
 * choice does not land: worse than the attribution equivalent, where the same
 * hole only costs measurement quality.
 *
 * `Date.parse` is part of the mirror, not a belt-and-braces extra. The regex
 * happily accepts a well-formed impossible instant — `2026-08-13T25:00:00.000Z`
 * matches it — and such a value would reach `isStrictlyNewer` as a NaN, which
 * silently answers "not newer" for every comparison it is ever in.
 *
 * Editing this regex is a cross-repo act: change it here and in the platform's
 * reader in the same week, or not at all.
 */
const ISO_INSTANT_WITH_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * The inverse. Returns null for anything that is not a well-formed payload —
 * a half-read or hand-edited cookie must degrade to "no choice", never to a
 * partially-trusted one.
 */
export function parseConsentPayload(raw: string): ConsentPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const c = parsed as Record<string, unknown>;
  if (typeof c.v !== "number" || typeof c.t !== "string") return null;
  if (!ISO_INSTANT_WITH_Z.test(c.t) || Number.isNaN(Date.parse(c.t))) return null;
  if (typeof c.p !== "boolean" || typeof c.s !== "boolean" || typeof c.m !== "boolean") {
    return null;
  }
  return { v: c.v, t: c.t, p: c.p, s: c.s, m: c.m };
}

/**
 * `.letsdog.nl` on any Let's dog host, null anywhere else.
 *
 * The Domain attribute is what makes the cookie cross to mijn.letsdog.nl, and a
 * browser silently drops a Set-Cookie whose Domain it does not own — so on a
 * *.pages.dev preview or localhost we must omit it and write host-only instead.
 * That keeps the write observable on a preview (you can still read the cookie
 * back and check its shape); only the crossing itself is production-only.
 */
export function consentCookieDomain(hostname: string): string | null {
  if (hostname === "letsdog.nl" || hostname.endsWith(".letsdog.nl")) {
    return CONSENT_COOKIE_DOMAIN;
  }
  return null;
}

/**
 * The document.cookie string. No HttpOnly — the platform reads this in the
 * client, so it has to be script-readable; that is a contract requirement, not
 * an oversight.
 */
export function buildConsentCookie(payload: ConsentPayload, hostname: string): string {
  const domain = consentCookieDomain(hostname);
  return [
    `${CONSENT_COOKIE_NAME}=${serializeConsentPayload(payload)}`,
    "Path=/",
    "SameSite=Lax",
    "Secure",
    `Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}`,
    ...(domain ? [`Domain=${domain}`] : []),
  ].join("; ");
}

/**
 * The first value for `name` in a raw document.cookie string that `parse`
 * accepts — deliberately NOT the first one carrying that name.
 *
 * THE DISTINCTION IS THE WHOLE FUNCTION. Both handover cookies have to be
 * readable from every *.letsdog.nl host, so they sit on the shared parent domain
 * and a `__Host-` prefix is ruled out by contract. That means any subdomain —
 * keuzehulp, agenda, the platform, an expired or parked one — can set its own
 * host-only `ld_consent` or `ld_attribution`. Per RFC 6265 §5.4 the browser
 * hands us document.cookie sorted longest-Path first, so a host-only copy with a
 * deeper Path arrives BEFORE the legitimate `Domain=.letsdog.nl` one. Stopping
 * at the first match lets that copy shadow the real record, and the caller then
 * reads "nothing stored": on ld_attribution that overwrites a first touch which
 * can never be recovered, on ld_consent it narrates a consent nobody gave.
 *
 * This is rule 1 of the cross-host attribution contract — "the reader takes the
 * first PARSEABLE record, not the first match" — and the platform implements the
 * same rule on its side. Both readers here go through this one function so the
 * two cookies cannot drift apart from each other or from that side.
 *
 * `parse` returning null is what "not parseable" means. The name match itself
 * stays exact, so `old_ld_consent` is still not `ld_consent`.
 */
export function readFirstParseableCookie<T>(
  cookieString: string,
  name: string,
  parse: (raw: string) => T | null,
): T | null {
  const prefix = `${name}=`;
  for (const part of cookieString.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const parsed = parse(trimmed.slice(prefix.length));
    if (parsed !== null) return parsed;
  }
  return null;
}

// =============================================================================
// CONTRACT RULE 6: MORE THAN ONE COOKIE OF THIS NAME
// =============================================================================
// Delete the HOST-ONLY copy, read again, continue with whatever survives. BOTH
// handover cookies carry this rule now — `cross-host-attribution-handover.md`
// has had it since 2026-08-12, `cross-host-consent-handover.md` since
// 2026-08-13 — and the two contracts call it the same mechanism in as many
// words. So the machinery lives here once, in the module that already holds the
// cookie-string plumbing both cookies share (`readFirstParseableCookie`,
// `consentCookieDomain`), and `lib/attribution.ts` delegates to it. Two spellings
// of one rule is one spelling that can drift, and this drift is silent: a repair
// that stops matching leaves the planted copy exactly where it was.
//
// WHAT THE RULE DOES NOT DECIDE: which RECORD wins. That stays each contract's
// own and the two are opposites — newest choice on `ld_consent`, first touch on
// `ld_attribution`. The repair only decides which COPY is real.

/**
 * How many copies of `name` does this header carry — contract rule 6, and the
 * platform's `countAttributionCookies` generalised to a name.
 *
 * ALL of them, parseable or not. The question is deliberately not "is there a
 * valid record" (`readFirstParseableCookie` answers that) but "did MORE THAN ONE
 * assignment with this name arrive", because that count is the only hint
 * `document.cookie` gives. The Domain attribute is not among the things it hands
 * back, which is precisely why the repair below is a host-only delete and a
 * re-read rather than a comparison on domain.
 *
 * Exact name match on the FIRST `=`, the same discipline as
 * `readFirstParseableCookie`: the value is URL-encoded JSON and may carry an `=`
 * of its own, and a cookie called `old_ld_consent` must never be counted as one
 * of ours — a miscount here fabricates a duplicate and makes the repair delete a
 * record that was alone and correct.
 */
export function countCookiesNamed(
  cookieHeader: string | null | undefined,
  name: string,
): number {
  if (!cookieHeader) return 0;
  let found = 0;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    found += 1;
  }
  return found;
}

/**
 * The deletion that carries NO Domain, and leaving that attribute off is the
 * entire function — contract rule 6 on both cookies.
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
 * hosts. On `ld_attribution` that is a first touch nobody gets back; on
 * `ld_consent` it is the visitor's answer erased on both hosts at once, which
 * reads on the platform as "everything refused" and here as "never asked".
 */
export function buildHostOnlyDeletion(name: string): string {
  return `${name}=; Max-Age=0; Path=/`;
}

/**
 * The repair itself, as a closure over its own once-per-page-session latch.
 *
 * WHY DELETE-AND-RE-READ AND NOT A COMPARISON ON DOMAIN. `document.cookie`
 * yields names and values and nothing else; the Domain of what you read is not
 * derivable from it. Wiping the host-only copy and seeing what is left is the
 * only way to learn which copy you were holding. Anyone who replaces this with a
 * Domain-based check is building something that cannot work.
 *
 * IT FIRES ONLY ON A REAL DUPLICATE, and that condition is load-bearing rather
 * than an optimisation. Both cookies are written HOST-ONLY on localhost and on
 * *.pages.dev previews (`consentCookieDomain` returns null there, because a
 * Domain the browser cannot match makes the write vanish without a word). In
 * those environments the host-only copy is the only copy and the legitimate one,
 * so an unconditional wipe would delete our own record on every read. With one
 * copy nothing fires and local development keeps working unchanged.
 *
 * WHY A FACTORY AND NOT A PLAIN FUNCTION TAKING A NAME. The report is latched
 * once per PAGE SESSION, and each cookie needs a latch of its own: they are read
 * by different callers at different rates (every CTA click reads
 * `ld_attribution`, every consent event reads `ld_consent`), and one shared flag
 * would let the first duplicate silence the report for the other cookie
 * entirely. A closure gives each caller its own latch without a module-level
 * variable per cookie and without a reset seam that only tests would use.
 *
 * `logPrefix` is the only thing that differs between the two, and the sentence
 * around it is shared ON PURPOSE: one operator grepping one fixed string finds
 * the same failure on either cookie and on either host.
 *
 * AND IT NOW REACHES A REAL SINK TOO (T-44, executing D-6). This comment used to
 * end "`console` rather than an error service because this repo has no error
 * sink at all"; it has one now. The console lines are unchanged — they are what
 * the platform's mirror greps for, and they are the whole of the report on any
 * deploy where `NEXT_PUBLIC_SENTRY_DSN` is unset. The error/warning split is
 * carried into the sink as two distinct RULE IDS rather than one id at two
 * levels, because the distinction is a distinction of cause and not of severity:
 * a copy that survives a host-only wipe is a second WRITER on the shared domain,
 * while one that does not was a planted host-only copy we just removed. Those are
 * different incidents and want different counts.
 *
 * WHAT TRAVELS, AND WHAT MAY NOT. The cookie NAME, how many copies arrived, and
 * whether one survived — never a cookie VALUE, and on `ld_consent` never the
 * choice it records. That clamp is enforced in `lib/error-report.ts`, not here.
 */
export function createDuplicateCookieRepair(name: string, logPrefix: string): () => void {
  let reported = false;
  return () => {
    const copies = countCookiesNamed(document.cookie, name);
    if (copies <= 1) return;

    // NEVER with a Domain — that variant destroys the shared record on both
    // hosts. The string comes from a function whose only job is leaving the
    // attribute off.
    document.cookie = buildHostOnlyDeletion(name);

    if (reported) return;
    reported = true;

    // Counted AFTER the deletion, because that answers a different question. A
    // copy that survives a host-only wipe sits on the shared domain or on
    // another path, and neither can be a planted host-only copy — it is a
    // genuine second writer, which is a bigger thing than a hijack attempt by
    // one subdomain.
    const persists = countCookiesNamed(document.cookie, name) > 1;
    const detail = { cookie: name, persists };
    const message = `[${logPrefix}] MEER DAN EEN ${name}-cookie${
      persists ? ": OOK NA de host-only wisopdracht" : ""
    }`;
    if (persists) console.error(message, detail);
    else console.warn(message, detail);

    reportRuleBreach(
      persists ? "handover_cookie.duplicate_persists" : "handover_cookie.duplicate_repaired",
      { cookie: name, copies, persists },
    );
  };
}

/** How many `ld_consent` cookies this header carries — contract rule 6. */
export function countConsentCookies(cookieHeader: string | null | undefined): number {
  return countCookiesNamed(cookieHeader, CONSENT_COOKIE_NAME);
}

/** The Domain-less deletion that can only reach a host-only `ld_consent`. */
export function buildConsentHostOnlyDeletion(): string {
  return buildHostOnlyDeletion(CONSENT_COOKIE_NAME);
}

/**
 * MORE THAN ONE `ld_consent`: delete the HOST-ONLY copy, re-read, continue with
 * whatever survives — `cross-host-consent-handover.md`, section "More than one
 * cookie of this name". We are FIRST with it: the platform carries the same rule
 * as its loop task T-575 and has not built it yet, so this side is the reference
 * rather than the mirror.
 *
 * THIS IS NOT THE GAP RULE 1 ALREADY COVERS, and the difference is the whole
 * reason it exists. `readFirstParseableCookie` takes the first PARSEABLE record
 * instead of the first match, so a CORRUPT host-only copy can no longer mask the
 * shared one. A perfectly VALID host-only copy still can: it parses, RFC 6265
 * §5.4 hands the more specific copy over FIRST, and it therefore wins. Any host
 * under `.letsdog.nl` can plant one — a `__Host-` prefix is ruled out because
 * both hosts must read this cookie by design.
 *
 * WHAT A PLANTED COPY IS WORTH HERE, which is more than on `ld_attribution` and
 * more than it was a week ago. A cookie that GRANTS a category is acted on: since
 * D-4 the return leg adopts a granting cookie when Cookiebot holds no answer, so
 * a planted grant takes the banner away from a visitor who was never asked AND
 * opens the Meta pixel's load gate. There is nothing to see when it happens — no
 * error, a quiet page, a pixel that loads as if consent had been given.
 *
 * THE READER MAY NOT PREFER A COPY BY POSITION, and that is the part of the
 * contract that changed. The platform's reader took the first match with the
 * reasoning "the browser puts the most specific one first, and that is the choice
 * made closest to this host". The contract withdrew it on 2026-08-13:
 * domain-specificity says WHERE a cookie was set, not WHEN the choice was made,
 * so picking by position hands an older answer to a visitor who has since changed
 * their mind — on the one cookie whose entire purpose is carrying the freshest
 * answer.
 *
 * NEWEST WINS IS STILL THE CONFLICT RULE. The repair decides which COPY is real,
 * never which RECORD governs: what survives it goes on to `newestRecordedConsent`
 * and `consentCookieSupersedes` exactly as before, and loses to a genuinely newer
 * choice.
 */
const repairDuplicateConsentCookies = createDuplicateCookieRepair(
  CONSENT_COOKIE_NAME,
  "consent",
);

/**
 * Cookiebot's consentUTC is a Date on the live banner, but it is third-party
 * state we don't own, so accept the shapes it could reasonably take and reject
 * the rest rather than writing "Invalid Date" into the contract.
 *
 * THE INVARIANT: THIS SITE CAN ONLY WRITE A MOMENT ITS OWN PARSER ACCEPTS.
 * The last line is what guarantees it, and it reuses `ISO_INSTANT_WITH_Z` rather
 * than restating the rule — writer and reader share ONE definition of the shape
 * by construction. Two separate checks would be two things to keep in step, and
 * the one that drifts is the one nobody notices: the site would write a `t` it
 * then refuses to read back, and `readConsentCookie` would report "no choice"
 * for a visitor who did choose.
 *
 * WHY `Number.isNaN` WAS NOT ALREADY ENOUGH, which is what made this necessary
 * rather than defensive. It only rejects a Date outside the representable range;
 * everything inside it is "valid" and gets serialised. But `toISOString()` only
 * produces the contract's 24-character form for years 0000-9999 and switches to
 * an expanded-year form outside it — measured: `3e14` yields
 * `+011476-08-15T05:20:00.000Z`, and `8.64e15`, the MAXIMUM valid Date, yields
 * `+275760-09-13T00:00:00.000Z`. Both are refused by the parser below and by the
 * platform's reader, so both were a `t` we could write and nobody could read.
 * The input is `Cookiebot.consentUTC` — third-party state, declared
 * `Date | number | string | null` — which is precisely why the guard belongs on
 * our side of the wire and not on the platform's.
 *
 * Deliberately NOT a numeric year bound. The contract fixes a wire format, not a
 * range, so the format is the thing to check.
 *
 * A null here is not a dead end: `readCookiebotConsent` already falls back to
 * `new Date().toISOString()` for "Cookiebot handed us something unusable", and
 * out-of-contract-range is simply one more way to be unusable.
 */
export function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const date =
    value instanceof Date ? value : new Date(value as string | number);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const iso = date.toISOString();
  return ISO_INSTANT_WITH_Z.test(iso) ? iso : null;
}

/**
 * The visitor's answer, or null while the banner is still unanswered.
 *
 * `t` comes from Cookiebot's own record of WHEN the choice was made, not from
 * now(). That matters downstream: the platform appends a row whenever it sees a
 * cookie newer than the last one it stored, so a timestamp that moved on every
 * page load would append a duplicate row per pageview.
 */
export function readCookiebotConsent(): ConsentPayload | null {
  const cb = typeof window === "undefined" ? undefined : window.Cookiebot;
  if (!cb || !cb.hasResponse || !cb.consent) return null;
  return {
    v: CONSENT_COOKIE_VERSION,
    t: toIsoTimestamp(cb.consentUTC) ?? new Date().toISOString(),
    p: !!cb.consent.preferences,
    s: !!cb.consent.statistics,
    m: !!cb.consent.marketing,
  };
}

// Which event fires depends on what was chosen and whether it is a fresh answer
// or a stored one being replayed on load (measured on letsdog.nl: a decline
// fires ConsentReady, then Load, then Decline). Rather than reason about which
// event means what, every one of them re-reads the state.
const COOKIEBOT_EVENTS = [
  "CookiebotOnConsentReady",
  "CookiebotOnAccept",
  "CookiebotOnDecline",
  "CookiebotOnLoad",
] as const;

/**
 * COOKIEBOT'S OWN COOKIE, and the only place an answer of its can be stored.
 *
 * Near-mirror of our `ld_consent` and easy to confuse while reading this file,
 * so state the difference once: `CookieConsent` is Cookiebot's record of what
 * the visitor told ITS banner, written host-only by uc.js and therefore unusable
 * as a handover (the reason this module exists at all — see the header);
 * `ld_consent` is ours, on the shared parent domain, and Cookiebot has never
 * heard of it.
 *
 * Script-readable by construction: uc.js writes it from the page, so it cannot
 * carry HttpOnly, and Cookiebot reads it back the same way we do here. It is the
 * `CookieConsent` row of the published cookie declaration
 * (`content/cookieverklaring.md`, Cookiebot, 1 year).
 */
const COOKIEBOT_COOKIE_NAME = "CookieConsent";

/**
 * Can Cookiebot's "no answer" still become an answer without the visitor doing
 * anything? The question `deliver` below needs, answered from a fact about the
 * browser rather than a guess about timing.
 *
 * A stored answer lives in `CookieConsent` and nowhere else, so if that cookie
 * is absent there is nothing for uc.js to settle FROM: the state we just read is
 * final until the visitor acts on the banner, and acting on the banner arrives
 * as an event we are subscribed to. If it is present, Cookiebot may be
 * mid-flight — the object exists, `hasResponse` is not true yet — and the read
 * we just took is premature rather than empty.
 *
 * That covers the half-built object too, and better than a `hasResponse` check
 * would: `readCookiebotConsent` also returns null when `hasResponse` is already
 * true but `cb.consent` has not been attached yet, and in that state the cookie
 * is by definition there.
 *
 * EXACT NAME MATCH, hence `countCookiesNamed` rather than a `startsWith`.
 * Cookiebot's neighbouring `CookieConsentBulkTicket` / `CookieConsentBulkSetting-…`
 * share the prefix, and counting one of those as "an answer is stored" would put
 * the guard back over the whole return leg — the exact failure this narrowing
 * repairs, silently.
 *
 * "CANNOT LOOK" ANSWERS YES, which is the conservative direction: without a
 * readable `document` we cannot prove there is nothing stored, and the cost of
 * being wrong is asymmetric (see `deliver`). Practically unreachable — a browser
 * with a `window` always has a `document` — but the polarity is the point.
 */
function cookiebotMayStillSettle(): boolean {
  if (typeof document === "undefined") return true;
  return countCookiesNamed(document.cookie, COOKIEBOT_COOKIE_NAME) > 0;
}

/**
 * HOW LONG WE WAIT FOR uc.js, and how often we look. Both numbers are measured
 * rather than picked (letsdog.nl resource timing, 2026-08-15 — the full figures
 * are in `onCookiebotConsent`).
 *
 * 50 ms because the LATENCY is the product here, not the CPU. Cookiebot's object
 * appears at ~221 ms and its dialog only after cc.js at ~549 ms, so a tick this
 * short lets the adoption land inside that gap and the returning visitor never
 * sees the banner flash at all. A tick is one property read, plus one
 * `document.cookie` read once the object exists.
 *
 * 10 s because the bound has to survive a bad connection without ever becoming
 * unbounded. Cookiebot's whole chain completes inside 550 ms on a normal load, so
 * this is roughly twenty times the measured need — and beyond it the visitor has
 * been reading the page for ten seconds, at which point silently rewriting their
 * consent state is worse than leaving the banner up. Giving up looks exactly like
 * a blocked uc.js, which is the behaviour that was already correct.
 */
const COOKIEBOT_WAIT_INTERVAL_MS = 50;
const COOKIEBOT_WAIT_TIMEOUT_MS = 10_000;

/**
 * Is Cookiebot CONSTRUCTED, not merely PUBLISHED? The precondition for reading
 * anything off it, and the third and last thing T-43 turned out to be.
 *
 * `window.Cookiebot` existing is not the same as Cookiebot being ready, and in
 * uc.js it is not even the same PHASE. Read out of the 121 KB vendor file on
 * 2026-08-15: `window.Cookiebot=this` sits at byte 61890, inside an init path,
 * while `submitCustomConsent=function` is at 105795 and `window.CookieConsent=`
 * at 120638 — and its three scripts land in waves (uc.js 221 ms,
 * configuration.js 441 ms, cc.js 549 ms). So there is a real interval in which
 * the object answers `!!window.Cookiebot` while its API does not exist yet.
 *
 * THAT INTERVAL IS WHERE THE SECOND FIX DIED, and it died quietly because the
 * object looked fine. A poll tick landing there read `hasResponse: false`, found
 * no `CookieConsent` cookie, and therefore DELIVERED — correctly, by the letter
 * of the guard. ConsentSync then called `submitConsentToCookiebot`, which found
 * no `submitCustomConsent`, returned false, and left `synced.current` false. And
 * because the delivery had "succeeded", the wait stopped. One tick, one wasted
 * delivery, no second chance, no error anywhere. Measured on the deployed poll
 * build: `hasResponse` still false after 2500 ms, dialog on screen, no `_ga`, no
 * `fbq` — while a hand-dispatched `CookiebotOnLoad` flipped it instantly, which
 * proves the listeners were attached and the whole downstream chain worked.
 *
 * WHY THIS METHOD IS THE RIGHT SIGNAL rather than a timer or a private flag. It
 * is the vendor's own evidence that the API surface is built: it is assigned
 * late in construction, it is public and documented, and in this deployment it is
 * unguarded — `if(!this.hasFramework||this.frameworkLoaded||this.frameworkBlocked)`
 * with `hasFramework` false here — so once present, calling it always takes effect
 * and sets `hasResponse` synchronously. Every other candidate is a guess about
 * timing; this is a fact about the object.
 *
 * IT GATES EVERY ROUTE, events included. A half-built object's `hasResponse` and
 * `consent` are not trustworthy for ANY consumer, not just for the one that
 * submits: reading them early is the same premature read this module already
 * refuses everywhere else. The cost is named and accepted: a Cookiebot that never
 * exposes `submitCustomConsent` would get no deliveries at all, which would also
 * silence the OUTBOUND leg (`ld_consent` would stop being written). The vendor
 * source has it, the live object has it, and it is documented public API — and
 * the failure is bounded by the wait, after which we behave exactly as we already
 * do for a blocked uc.js.
 */
function cookiebotIsUsable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Cookiebot?.submitCustomConsent === "function";
}

/**
 * THE CONSENT CHAIN'S ONE HEALTH SIGNAL, and it is latched for the whole page.
 *
 * WHAT IT WATCHES. `onCookiebotConsent` waits a bounded 10 s for a USABLE
 * Cookiebot and then gives up. Giving up is correct behaviour — it is
 * indistinguishable from a blocked uc.js, which is a thing that legitimately
 * happens — but until now it was also SILENT, and that silence is precisely the
 * failure of T-43: for a week every page load ended in this branch, the banner
 * sat there, no `_ga`, no `fbq`, the return leg never ran, the published cookie
 * declaration promised something the product did not do, and nothing anywhere
 * said so. It cost three deploys to find. This is the line that would have said
 * it on the first one.
 *
 * WHY IT IS LATCHED AT MODULE LEVEL AND NOT PER SUBSCRIPTION. All five
 * subscribers run their own wait, so a Cookiebot that never arrives times out
 * five times on one page load — five identical reports of one incident, against
 * a monthly volume quota shared with the platform. The latch is per page load,
 * which is the right grain: the incident is "on this page load the chain never
 * started", and it happens once no matter how many components asked.
 *
 * WHY IT IS NOT A SUBSCRIBER, WHICH MATTERS FOR T-38 AND IS A DELIBERATE CHOICE.
 * The obvious way to report consent-chain health is a sixth component that
 * subscribes to Cookiebot and reads `ld_consent` inside the handler — and that
 * would be the third such subscriber, which is T-38's own stated trigger
 * condition. It would also be worse instrumentation: a subscriber can only
 * observe states that were DELIVERED, and the failure being watched here is the
 * absence of any delivery at all. So the report sits inside the wait itself,
 * where that absence is a local fact, and it reads only Cookiebot's own
 * `CookieConsent` — by COUNT — plus whether the object and its API exist. It
 * never reads `ld_consent`, subscribes to nothing, and adds no component to
 * `app/layout.tsx`. T-38 does not fire.
 *
 * AND NOTHING ABOUT THE VISITOR'S CHOICE TRAVELS. Note what is measured: how
 * long we waited, whether the object was published, whether its API was
 * constructed, and how many `CookieConsent` cookies exist. Not their contents.
 * The counting is `countCookiesNamed`, which never returns a value — see the
 * hard limit at the top of `lib/error-report.ts` for why that matters more here
 * than anywhere else in the repo.
 */
let consentChainStallReported = false;

function reportConsentChainStall(waitedMs: number): void {
  if (consentChainStallReported) return;
  consentChainStallReported = true;
  reportRuleBreach("consent_chain.cookiebot_never_usable", {
    waitedMs,
    cookiebotPresent: typeof window !== "undefined" && !!window.Cookiebot,
    cookiebotUsable: cookiebotIsUsable(),
    cookiebotCookies:
      typeof document === "undefined"
        ? 0
        : countCookiesNamed(document.cookie, COOKIEBOT_COOKIE_NAME),
    deliveries: 0,
  });
}

/** Test seam: forget the page-load latch. Not used in production code. */
export function resetConsentChainReportForTests(): void {
  consentChainStallReported = false;
}

/**
 * Calls `handler` with the current state now and again on every change. `null`
 * means Cookiebot is loaded but records no choice. Returns an unsubscribe.
 *
 * The immediate call is not belt-and-braces: Cookiebot settles a stored consent
 * within milliseconds of uc.js loading, which can easily beat a React effect,
 * and a subscriber that only ever listens would then miss the only event of the
 * page for exactly the visitors who already consented.
 *
 * A `null` IS DELIVERED DIRECTLY, BUT ONLY ONCE NOTHING CAN STILL SETTLE — and
 * that narrowing is T-43. Until 2026-08-15 the subscribe-time read refused to
 * report `null` at all, on the reasoning that Cookiebot's object can exist while
 * its init is mid-flight, so a returning consenting visitor would momentarily
 * look like a refusing one. True, but the condition was drawn far too wide: it
 * also suppressed the one case the return leg exists FOR. A visitor who chose on
 * mijn.letsdog.nl and opens letsdog.nl has an `ld_consent` and no Cookiebot
 * answer, so the read is `null` — and on a normal page load Cookiebot's events
 * have already fired before React mounts ConsentSync, so no `fromEvent` delivery
 * ever came after it. Measured on production that day: an all-true `ld_consent`
 * on `.letsdog.nl` with no `CookieConsent` left `Cookiebot.hasResponse` false,
 * the banner at `display: flex`, no `_ga`, no `fbq`, and a dataLayer carrying
 * only the denied `consent default` and never an update — unchanged after three
 * seconds and after a second reload, so not a matter of patience. Dispatching
 * `CookiebotOnLoad` by hand flipped `hasResponse` immediately: every part worked
 * except the trigger. Meanwhile the published cookie declaration promised the
 * opposite in as many words ("Je keuze geldt op allebei"), which made it a legal
 * document describing something the product did not do.
 *
 * WHY THE GUARD WAS NARROWED AND NOT DELETED. A `null` is not inert downstream:
 * `consentCookieSupersedes(cookie, null)` ADOPTS a granting cookie (D-4), so a
 * `null` delivered while Cookiebot's own STORED REFUSAL has not settled yet would
 * push the other host's grant into the CMP and destroy that refusal — silently,
 * in exactly the direction D-4's clamp exists to prevent. The clamp does not
 * cover this: it refuses an all-false COOKIE, and here the cookie grants while
 * the refusal is the local answer that has not arrived. So the direct `null`
 * waits on the one thing that tells a premature read from a final one, and it is
 * an observable fact rather than a timing assumption: Cookiebot has nothing
 * stored to settle from. Delivering `null` then cannot overwrite a stored
 * refusal, because there is none.
 *
 * Read the two branches as one rule and the shape is exact: the guard now holds
 * precisely when an event is still owed to us, and gets out of the way when it
 * is not.
 *
 * STILL TRUE, AND STILL LOAD-BEARING: no USABLE Cookiebot means no delivery at
 * all. "No CMP here" is not "no choice made", and reporting `null` for it would
 * attribute a choice nobody made — an ad blocker or a failed uc.js would then
 * read as a refusal to MetaPixel and as an adoption trigger to ConsentSync. What
 * counts as "here" tightened on 2026-08-15 from "the object exists" to "its API
 * is constructed"; `cookiebotIsUsable` carries the reason and the measurement.
 *
 * And a withdrawal still reaches subscribers as an event: `withdraw()` clears
 * `hasResponse` AND its cookie, so "took it all back" and "never answered" stay
 * the same observable state, told apart only by having seen the consent go away
 * within one subscription (`createConsentRecorder`). What changes is that on the
 * NEXT page load that visitor now gets the direct `null` — where the all-false
 * `ld_consent` their withdrawal wrote meets D-4's clamp and the banner is shown,
 * which is what D-4 always said should happen and could not previously reach.
 *
 * SO WE WAIT FOR THE OBJECT, and that is the second half of T-43 — shipped a day
 * later because the first half was correct and still did nothing. Narrowing the
 * guard made the `null` deliverable; it did not make anything reach the guard.
 * `deliver` exits one line earlier, on `!window.Cookiebot`, and on production
 * that is where every page load ended. Resource timing on letsdog.nl, 2026-08-15,
 * after the narrowing was deployed and verified present in the served chunk:
 * domInteractive at 137 ms, all twelve app chunks finished at 210 ms, and
 * Cookiebot's own scripts at 221 ms (uc.js), 441 ms (configuration.js), 549 ms
 * (cc.js). React hydrates, the effects run, the subscriptions are created — and
 * `window.Cookiebot` does not exist yet. The narrowed guard was unreachable code
 * behind a `return` one line above it.
 *
 * AND THE EVENT PATH IS DEAD, WHICH IS NOW PROVEN RATHER THAN SUSPECTED. We
 * attach the listeners at ~210 ms, BEFORE uc.js runs, so anything Cookiebot
 * fired afterwards would reach us — and with the narrowing deployed a `fromEvent`
 * delivery skips the cookie check entirely and would have triggered the adoption.
 * `hasResponse` stayed false. A hand-dispatched `CookiebotOnLoad` flipped it
 * instantly, so the listener works: Cookiebot simply never fires one on a normal
 * page load here. That kills the last reason to treat the event list as the
 * primary route. It stays subscribed because a real banner click does fire and
 * costs nothing to catch — but nothing may depend on it.
 *
 * The wait is therefore the trigger, and it is a bounded poll rather than
 * anything cleverer: there is no event for "the CMP object now exists", and
 * `Object.defineProperty` on `window.Cookiebot` would fight uc.js for the same
 * property. It re-runs the SAME `deliver(false)` — a poll delivery is not
 * `fromEvent`, so it goes through the settle guard exactly like the subscribe-time
 * read did.
 *
 * WHAT IT WAITS FOR IS READINESS, NOT PRESENCE, and that distinction is what the
 * poll was missing when it shipped: uc.js publishes `window.Cookiebot` in an
 * earlier phase than the one that builds its API, so a tick could deliver into a
 * hollow object, satisfy itself that it had delivered, and stop. See
 * `cookiebotIsUsable` — that predicate is the whole of the third repair.
 *
 * IT STOPS ON A DELIVERY, NOT ON THE OBJECT APPEARING, and that difference earns
 * its keep in one case: Cookiebot arrives holding a `CookieConsent` it has not
 * settled yet. The guard correctly says nothing, and stopping there would hand
 * the rest of that visitor's page to the event path we just measured as dead. So
 * the wait keeps looking and delivers the real answer the moment it settles. It
 * still delivers AT MOST ONCE — the first delivery, by whichever route, ends it,
 * so an event arriving mid-wait cannot produce a second copy of the same state.
 *
 * ALL FIVE SUBSCRIBERS RUN THEIR OWN WAIT, which is fine and does not disturb the
 * one ordering that matters. ConsentSync must act only once ConsentCookie and
 * MetaPixel are LISTENING (its `submitCustomConsent` fires Cookiebot's events
 * synchronously) — and every subscription registers its listeners at mount, in
 * tree order, long before any timer ticks. The polls only stagger the direct
 * deliveries, and by then everyone is already subscribed.
 */
export function onCookiebotConsent(
  handler: (consent: ConsentPayload | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  let waiting: ReturnType<typeof setInterval> | undefined;
  const stopWaiting = () => {
    if (waiting === undefined) return;
    clearInterval(waiting);
    waiting = undefined;
  };

  // Reports whether it actually handed something over, which is what the wait
  // needs: "the object is there" and "we have said something" are different
  // facts, and the settle guard sits between them.
  const deliver = (fromEvent: boolean): boolean => {
    // No USABLE Cookiebot yet: we know nothing, so say nothing. Guessing would
    // read as "no choice", which is a claim we have no basis for — and a
    // published-but-unconstructed object is a guess wearing the object's clothes.
    if (!cookiebotIsUsable()) return false;
    const consent = readCookiebotConsent();
    if (consent === null && !fromEvent && cookiebotMayStillSettle()) return false;
    handler(consent);
    return true;
  };

  const onEvent = () => {
    // Whichever route speaks first ends the wait, so no state is delivered twice.
    if (deliver(true)) stopWaiting();
  };
  for (const event of COOKIEBOT_EVENTS) window.addEventListener(event, onEvent);

  if (!deliver(false)) {
    let attemptsLeft = Math.ceil(COOKIEBOT_WAIT_TIMEOUT_MS / COOKIEBOT_WAIT_INTERVAL_MS);
    waiting = setInterval(() => {
      // The two exits are now told apart, and that is the whole of the health
      // signal. Before T-44 both ended on the same `stopWaiting()`, so "the chain
      // started" and "the chain never started" left the same trace: none.
      if (deliver(false)) {
        stopWaiting();
        return;
      }
      if (--attemptsLeft <= 0) {
        stopWaiting();
        reportConsentChainStall(COOKIEBOT_WAIT_TIMEOUT_MS);
      }
    }, COOKIEBOT_WAIT_INTERVAL_MS);
  }

  return () => {
    // The timer FIRST: every caller runs this from a `useEffect` cleanup, and a
    // tick that outlives the component reads a `window` its page may no longer
    // have and calls a handler its subscriber has already torn down.
    stopWaiting();
    for (const event of COOKIEBOT_EVENTS) window.removeEventListener(event, onEvent);
  };
}

/**
 * The handover cookie as it currently stands, or null.
 *
 * The first PARSEABLE `ld_consent`, not the first one by that name — see
 * `readFirstParseableCookie` for the shadowing copy that distinction defends
 * against.
 *
 * AND RULE 6 RUNS HERE, WHICH IS WHAT PUTS IT ON EVERY READ PATH AT ONCE. The
 * contract asks a repo to cover its raw-value read as well as its parsing read,
 * because the platform has both and only one of them feeds its checkout. This
 * side has exactly ONE: nothing here hands a raw `ld_consent` value to a server —
 * the checkout lives on the platform — so every consumer comes through this
 * function (`consent-sync.tsx`, `meta-pixel.tsx`, `posthog-provider.tsx`,
 * `lib/analytics.ts`, `lib/attribution.ts`, and this module's own two writers).
 * Placing the repair here covers all of them and leaves no second path to
 * remember; add a raw-value reader later and it needs the repair too.
 */
export function readConsentCookie(): ConsentPayload | null {
  if (typeof document === "undefined") return null;
  repairDuplicateConsentCookies();
  // Read AFTER the repair: `document.cookie` is a different string once the
  // host-only copy is gone, and reading the old one would defeat the point.
  return readFirstParseableCookie(document.cookie, CONSENT_COOKIE_NAME, parseConsentPayload);
}

/**
 * Do these two payloads record the same CHOICE? The three categories and the
 * contract version — deliberately not `t`.
 *
 * `t` says when a choice was made, not what it was, and the two consumers of
 * this cookie only ever act on what it was. Keeping the distinction in one
 * function is what stops it from being quietly re-decided per call site.
 */
function isSameChoice(a: ConsentPayload, b: ConsentPayload): boolean {
  return a.v === b.v && a.p === b.p && a.s === b.s && a.m === b.m;
}

/**
 * Does this payload allow at least one optional category?
 *
 * THE PREDICATE THAT SEPARATES A CHOICE FROM A WITHDRAWAL, and it is load-bearing
 * in two places that must keep agreeing with each other:
 *
 * - `recordConsentWithdrawal` writes all-false BY DEFINITION — that is what a
 *   withdrawal looks like on the wire, because Cookiebot's `withdraw()` clears
 *   `hasResponse` instead of reporting a refusal.
 * - `consentCookieSupersedes` therefore treats "allows something" as proof that a
 *   payload did NOT come from this site's own withdrawal, which is the only thing
 *   that makes adopting a choice on a host with no local answer safe.
 *
 * One function so the two cannot drift: widen this and the clamp widens with it.
 */
function allowsAnyCategory(c: ConsentPayload): boolean {
  return c.p || c.s || c.m;
}

/**
 * Was `a` recorded strictly later than `b`?
 *
 * An unreadable stamp on either side answers no. Both consumers of this want the
 * same thing from a NaN — rather not act than act on a comparison that could not
 * be made — and it is the answer the platform's own `isConsentNewerThanRecord`
 * gives too.
 */
function isStrictlyNewer(a: ConsentPayload, b: ConsentPayload): boolean {
  const left = Date.parse(a.t);
  const right = Date.parse(b.t);
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return left > right;
}

/**
 * The newest choice on record across BOTH writers, or null when neither has one.
 *
 * WHO THIS IS FOR: a subscriber whose action cannot be taken back. Most consent
 * subscribers here may safely read Cookiebot alone, because their action is
 * self-correcting — a cookie gets rewritten by newest-wins on the next event, a
 * pixel that did not load loads on the next one. A subscriber that SENDS
 * something the moment it decides has no such second chance, and Cookiebot's
 * answer can legitimately be the older of the two: a choice made on
 * mijn.letsdog.nl arrives here in `ld_consent` first, and ConsentSync only pushes
 * it into Cookiebot a beat later. Reading Cookiebot at that instant means acting
 * on a stale refusal — the same shape as the bug review caught on T-27, where the
 * attribution recorder read the source instead of the merged state.
 *
 * Deliberately NOT the same function as `consentCookieSupersedes`. That one asks
 * "should the cookie be pushed INTO Cookiebot", and when Cookiebot holds nothing
 * it answers only for a cookie that allows something — an all-false cookie is
 * indistinguishable from this site's own withdrawal, so it is clamped there. This
 * is the read-side question and has no such ambiguity to resolve: it must report
 * the cookie whenever Cookiebot holds nothing, INCLUDING an all-false one, because
 * a refusal recorded on the platform still has to suppress an irreversible send.
 *
 * Ties go to Cookiebot: equal timestamps mean the two hosts already agree (the
 * measured rest state), so the choice is the same either way.
 */
export function newestRecordedConsent(
  cookiebot: ConsentPayload | null,
  cookie: ConsentPayload | null,
): ConsentPayload | null {
  const valid = cookie !== null && cookie.v === CONSENT_COOKIE_VERSION ? cookie : null;
  if (cookiebot === null) return valid;
  if (valid === null) return cookiebot;
  return isStrictlyNewer(valid, cookiebot) ? valid : cookiebot;
}

/**
 * Writes the handover cookie, staying silent when the choice it records is
 * already there — even if the timestamps differ.
 *
 * IGNORING `t` HERE IS THE POINT, not a shortcut. Two reasons, and the second
 * one is a trap this exact comparison used to walk into:
 *
 * 1. Byte-stability across pageviews. The platform appends a consent row for
 *    every cookie newer than its last one (R8), so a `t` that moved on each
 *    pageview would append a duplicate row per pageview.
 * 2. THE READ-BACK LOOP. `submitConsentToCookiebot` below adopts a newer choice
 *    made on the platform, and Cookiebot stamps its own `consentUTC` at NOW when
 *    it accepts one (measured 2026-08-08). Its consent event then arrives here
 *    carrying the same p/s/m with a fresher `t` — and comparing on `t` would
 *    rewrite the cookie with that fresher stamp. The platform would read a
 *    cookie newer than its last row and record a second choice that nobody made,
 *    timestamped as if it happened on the marketing site. No infinite loop, just
 *    a phantom row and a lying timestamp per platform change.
 *
 * The cost of ignoring `t`: re-answering the banner with the identical choice
 * does not refresh the stamp. That is the same thing the platform's own R8 rule
 * wants ("two starts with the same cookie yield one row"), because the recorded
 * decision is unchanged.
 *
 * AND IT NEVER OVERWRITES A NEWER CHOICE. The cookie is not this site's record of
 * what Cookiebot thinks; it is the latest choice known on EITHER host, and two
 * repos write it. Cookiebot only knows what it was told here, so replaying its
 * answer over a fresher one destroys a choice made on the platform — measured on
 * 2026-08-08 while building the return leg, where this ran first on Cookiebot's
 * consent event and overwrote the platform's refusal with the stale grant from
 * this host, before the read-back below ever got to compare them. The platform
 * would then have gone on measuring against a refusal it had recorded itself,
 * because its client-side gate reads this cookie. Newest choice wins, both ways;
 * it is the same rule as R8, and it makes the two directions independent of which
 * component's effect happens to run first.
 */
export function writeConsentCookie(payload: ConsentPayload, hostname: string): void {
  if (typeof document === "undefined") return;
  const existing = readConsentCookie();
  if (existing && isSameChoice(existing, payload)) return;
  if (existing && isStrictlyNewer(existing, payload)) return;
  document.cookie = buildConsentCookie(payload, hostname);
}

/**
 * Records a withdrawal: every category false, stamped at the moment we noticed.
 *
 * Needed because Cookiebot's `withdraw()` sets `hasResponse` back to false
 * instead of reporting an all-false choice, so a withdrawal reaches us as an
 * *absence* of consent rather than a refusal. Without this the handover cookie
 * would keep saying "granted" after the visitor took it back — the one failure
 * the contract cannot tolerate, because the platform would go on measuring on
 * the strength of a consent that no longer exists.
 *
 * Two things it deliberately does not do:
 * - It never writes for a visitor with no cookie. Without a prior choice there
 *   is nothing to withdraw, and recording "refused" would tell the platform the
 *   visitor said no when the truth is that nobody asked yet — which would also
 *   silence the legitimate-interest measurement the platform is allowed to do.
 * - It never rewrites an already-all-false cookie, so `t` stays put instead of
 *   moving on every pageview (the platform appends a row per newer timestamp).
 *
 * AND ONE THING IT CANNOT JUDGE FOR ITSELF, so the caller owes it: that a
 * withdrawal actually happened. A cookie holding a granted choice is no longer
 * proof of one, because the platform writes this cookie too — that choice may
 * have been made on a host where Cookiebot was never involved, and stamping a
 * refusal over it would fabricate a withdrawal. ConsentCookie only calls this
 * after it has seen a consent go away within one page load; the reasoning is
 * there, next to the subscription whose lifetime gives "one page load" a meaning.
 */
export function recordConsentWithdrawal(
  hostname: string,
  at: string = new Date().toISOString(),
): void {
  if (typeof document === "undefined") return;
  const existing = readConsentCookie();
  if (!existing) return;
  if (!allowsAnyCategory(existing)) return;
  document.cookie = buildConsentCookie(
    { v: CONSENT_COOKIE_VERSION, t: at, p: false, s: false, m: false },
    hostname,
  );
}

/**
 * The handler that keeps the handover cookie in step with Cookiebot: hand it
 * every consent state Cookiebot reports, in the order it reports them.
 *
 * It is a closure and not a plain function because one of its two rules is about
 * a SEQUENCE, and that rule is the reason this exists at all.
 *
 * A WITHDRAWAL IS ONLY A WITHDRAWAL IF WE SAW THE CONSENT IT TOOK BACK.
 * Cookiebot's `withdraw()` clears `hasResponse`, so a withdrawal arrives as an
 * absence — and "never answered on this host" is that same absence. Until the
 * platform started writing this cookie, an existing granting cookie told them
 * apart on its own: only this site wrote it, so it could only have come from a
 * Cookiebot answer here. That inference is now wrong, and expensively so.
 * Measured on 2026-08-08: a visitor who granted consent on mijn.letsdog.nl and
 * then opened letsdog.nl, where they had never answered the banner, had that
 * grant rewritten to an explicit refusal on Cookiebot's `OnLoad` event — and the
 * platform's own gate reads this cookie, so it would have stopped measuring on
 * the strength of a withdrawal nobody performed.
 *
 * What separates the two is a TRANSITION. A real withdrawal always follows a
 * consent within the life of one subscription, because it takes a widget that
 * Cookiebot only renders once it has a stored answer. A withdrawal made in an
 * earlier session needs no second opinion: the cookie already records it as
 * all-false.
 */
export function createConsentRecorder(
  hostname: string,
): (consent: ConsentPayload | null) => void {
  let sawConsent = false;
  return (consent) => {
    if (consent) {
      sawConsent = true;
      writeConsentCookie(consent, hostname);
    } else if (sawConsent) {
      recordConsentWithdrawal(hostname);
    }
  };
}

// =============================================================================
// THE RETURN LEG: a choice changed on mijn.letsdog.nl reaching Cookiebot here.
// =============================================================================
// Everything above carries a choice OUT of this site. This carries one back IN.
// The platform's Cookie preferences screen promises the visitor, in as many
// words, "Je keuze geldt op letsdog.nl en in de app" — and until now it did not:
// Cookiebot reads its own host-only CookieConsent cookie and has never heard of
// ld_consent, so changing your mind on the platform changed nothing here. At a
// withdrawal that is the worst possible place to be wrong.
//
// The rule is the platform's own (R8), pointed the other way: a strictly newer
// recorded choice wins, equal or older does nothing. And where Cookiebot has no
// answer to be newer than, a choice that ALLOWS something is adopted while an
// all-false one is not — see consentCookieSupersedes for why the line sits there.

/**
 * Should the handover cookie override what Cookiebot currently records?
 *
 * `cookiebot` is what Cookiebot reports right now, or null when it reports no
 * choice at all. Three ways to answer no when Cookiebot HOLDS an answer, and each
 * one is load-bearing:
 *
 * - A VERSION WE DO NOT KNOW. `parseConsentPayload` keeps an unrecognised `v` so
 *   that the reader can decide; this is the reader, and it declines. A later
 *   version may add a category, and pushing its three known fields into the CMP
 *   would silently drop whatever it added. Checked first, so it governs the
 *   no-local-answer branch below as well.
 * - THE SAME CHOICE. Nothing to change, and submitting anyway would move
 *   Cookiebot's `consentUTC` to now and re-fire its events for no reason. It
 *   also makes the sync idempotent by construction: one submit and the
 *   categories match, so no second submit can follow whatever the clocks say.
 * - AN UNREADABLE TIMESTAMP on either side. Same choice the platform makes on a
 *   NaN: rather not act than act on a comparison we could not make.
 *
 * WHEN COOKIEBOT RECORDS NOTHING, THE ANSWER IS THE ALL-FALSE CLAMP — and this
 * branch is the one to read before touching anything here (loop decision D-4,
 * settled by the owner on 2026-08-13; the posture is his call, not this file's).
 *
 * There is no timestamp to be newer than, so the question is not "which is newer"
 * but "could this cookie be our own withdrawal coming back at us". `withdraw()`
 * leaves Cookiebot with no response, so "the visitor took it all back" and "nobody
 * ever asked on this host" are the SAME observable state — and at the instant of a
 * withdrawal, `recordConsentWithdrawal` has just written an all-false `ld_consent`
 * stamped NOW. Adopting that would feed this site's own withdrawal straight back
 * into its own CMP, turning "withdrawn" into "declined" and taking the banner away
 * from a visitor who is entitled to see it again.
 *
 * What tells the two apart is `allowsAnyCategory`, and it tells them apart
 * PROVABLY rather than heuristically: `recordConsentWithdrawal` writes all-false
 * by definition, so a cookie allowing at least one category cannot have come from
 * it. Hence:
 *
 * - allows ≥1 category → ADOPT. The visitor really did choose this, on a host
 *   that shares the cookie (since platform decision D-103 that is the normal path
 *   for ad traffic: the ad lands on mijn.letsdog.nl, the prompt is answered there,
 *   and letsdog.nl is opened later). Honouring it is exactly what the platform's
 *   preferences screen promises — "Je keuze geldt op letsdog.nl en in de app".
 * - all-false → DO NOT ADOPT, so the banner is shown.
 *
 * THE PRICE, ACCEPTED AND NOT HIDDEN: someone who refused everything on the
 * platform is asked once more here. That is the direction that is always safe —
 * asking again costs a banner, suppressing one wrongly costs a consent nobody
 * gave. The clamp is drawn at all-false and nowhere else precisely because that is
 * the only line the withdrawal proof supports.
 *
 * A CLAIM THIS BRANCH USED TO MAKE AND NO LONGER CAN. Before D-4 the return leg
 * was provably one-directional: nothing written HERE could get past the predicate,
 * because such a cookie either carried Cookiebot's own `t` (equal, so it lost) or
 * was a withdrawal (no response, so it stopped here). A granting cookie written
 * here CAN now be adopted, in one narrow case: Cookiebot's own host-only cookie is
 * gone while `ld_consent` still stands (cleared selectively, or the two 12-month
 * lifetimes drifting apart). The visitor is then put back into the choice they
 * themselves made here, from a record that is still live — the same act as for a
 * platform choice, and not the failure the clamp exists to prevent, which is
 * strictly about resurrecting a WITHDRAWAL.
 */
export function consentCookieSupersedes(
  cookie: ConsentPayload,
  cookiebot: ConsentPayload | null,
): boolean {
  if (cookie.v !== CONSENT_COOKIE_VERSION) return false;
  if (cookiebot === null) return allowsAnyCategory(cookie);
  if (isSameChoice(cookie, cookiebot)) return false;
  return isStrictlyNewer(cookie, cookiebot);
}

/**
 * Puts Cookiebot into the choice the cookie records, through its own public API.
 *
 * Cookiebot then does the rest by itself, and that is why this is the whole
 * write: it pushes the full Consent Mode v2 update to the dataLayer (measured
 * during T-23, all seven signals) and fires the consent events that MetaPixel
 * and ConsentCookie already subscribe to. So one call reaches Google, Meta and
 * the handover cookie without any of them learning about this path.
 *
 * Returns whether the call was actually made, so a caller can tell "declined to
 * sync" from "Cookiebot was not there to sync with".
 */
export function submitConsentToCookiebot(payload: ConsentPayload): boolean {
  const cb = typeof window === "undefined" ? undefined : window.Cookiebot;
  if (typeof cb?.submitCustomConsent !== "function") return false;
  cb.submitCustomConsent(payload.p, payload.s, payload.m);
  return true;
}
