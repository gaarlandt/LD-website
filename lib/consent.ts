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

/** Reads a cookie value out of a raw document.cookie string. */
export function readCookie(cookieString: string, name: string): string | null {
  for (const part of cookieString.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return null;
}

/**
 * Cookiebot's consentUTC is a Date on the live banner, but it is third-party
 * state we don't own, so accept the shapes it could reasonably take and reject
 * the rest rather than writing "Invalid Date" into the contract.
 */
export function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const date =
    value instanceof Date ? value : new Date(value as string | number);
  const time = date.getTime();
  return Number.isNaN(time) ? null : date.toISOString();
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
 * Calls `handler` with the current choice now (if one already exists) and again
 * on every change. `null` means Cookiebot is loaded but records no choice.
 * Returns an unsubscribe.
 *
 * The immediate call is not belt-and-braces: Cookiebot settles a stored consent
 * within milliseconds of uc.js loading, which can easily beat a React effect,
 * and a subscriber that only ever listens would then miss the only event of the
 * page for exactly the visitors who already consented.
 *
 * WHY `null` IS ONLY EVER DELIVERED FROM AN EVENT. A withdrawal is not a fourth
 * category of consent — Cookiebot's `withdraw()` sets `hasResponse` back to
 * false, so "the visitor took it all back" and "the visitor has not answered
 * yet" are the same observable state, and the only thing separating them is
 * that a withdrawal arrives as an event. Reporting `null` from the subscribe-
 * time read as well would be actively wrong: at that moment Cookiebot's object
 * can already exist while its init is still mid-flight, so a returning
 * consenting visitor would momentarily look like a refusing one, and a
 * subscriber acting on that would delete the very cookies it is about to
 * recreate.
 */
export function onCookiebotConsent(
  handler: (consent: ConsentPayload | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const deliver = (fromEvent: boolean) => {
    // No Cookiebot object yet: we know nothing, so say nothing. Guessing would
    // read as "no choice", which is a claim we have no basis for.
    if (!window.Cookiebot) return;
    const consent = readCookiebotConsent();
    if (consent === null && !fromEvent) return;
    handler(consent);
  };

  const onEvent = () => deliver(true);
  for (const event of COOKIEBOT_EVENTS) window.addEventListener(event, onEvent);
  deliver(false);

  return () => {
    for (const event of COOKIEBOT_EVENTS) window.removeEventListener(event, onEvent);
  };
}

/** The handover cookie as it currently stands, or null. */
export function readConsentCookie(): ConsentPayload | null {
  if (typeof document === "undefined") return null;
  const raw = readCookie(document.cookie, CONSENT_COOKIE_NAME);
  return raw === null ? null : parseConsentPayload(raw);
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
 * Deliberately NOT the same function as `consentCookieSupersedes`: that one asks
 * "should the cookie be pushed INTO Cookiebot", answers no when Cookiebot holds
 * nothing (there is no local state to correct), and is a write-side question.
 * This is the read-side question, and it must answer with the cookie precisely
 * when Cookiebot holds nothing.
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
  if (!existing.p && !existing.s && !existing.m) return;
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
// recorded choice wins, equal or older does nothing.

/**
 * Should the handover cookie override what Cookiebot currently records?
 *
 * `cookiebot` is what Cookiebot reports right now, or null when it reports no
 * choice at all. Four ways to answer no, and each one is load-bearing:
 *
 * - A VERSION WE DO NOT KNOW. `parseConsentPayload` keeps an unrecognised `v` so
 *   that the reader can decide; this is the reader, and it declines. A later
 *   version may add a category, and pushing its three known fields into the CMP
 *   would silently drop whatever it added.
 * - COOKIEBOT RECORDS NOTHING. There is no timestamp to be newer than — but the
 *   real reason is sharper than that: `withdraw()` also leaves Cookiebot with no
 *   response, and at that moment ld_consent holds the all-false record that
 *   `recordConsentWithdrawal` just wrote, stamped NOW. Treating "nothing" as
 *   "older than anything" would feed this site's own withdrawal straight back
 *   into its own CMP, turning "withdrawn" into "declined" and taking the banner
 *   away from a visitor who is entitled to see it again. This branch is what
 *   makes the whole return leg provably one-directional: a cookie written HERE
 *   carries Cookiebot's own `t` (equal, so it loses) or is a withdrawal (no
 *   response, so it stops here). Anything that gets past this predicate was
 *   written by the other host.
 * - THE SAME CHOICE. Nothing to change, and submitting anyway would move
 *   Cookiebot's `consentUTC` to now and re-fire its events for no reason. It
 *   also makes the sync idempotent by construction: one submit and the
 *   categories match, so no second submit can follow whatever the clocks say.
 * - AN UNREADABLE TIMESTAMP on either side. Same choice the platform makes on a
 *   NaN: rather not act than act on a comparison we could not make.
 */
export function consentCookieSupersedes(
  cookie: ConsentPayload,
  cookiebot: ConsentPayload | null,
): boolean {
  if (cookie.v !== CONSENT_COOKIE_VERSION) return false;
  if (cookiebot === null) return false;
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
