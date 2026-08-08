// The consent handover contract between this marketing site and the Let's Dog
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
 * `.letsdog.nl` on any Let's Dog host, null anywhere else.
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
 * Writes the handover cookie, skipping the write when an identical one is
 * already there. Skipping keeps `t` byte-stable across pageviews; because `t`
 * comes from Cookiebot, a cookie that expired (Safari caps script-written
 * cookies at seven days) is rewritten with the same value it had, so the
 * platform sees a repeat rather than a new choice.
 */
export function writeConsentCookie(payload: ConsentPayload, hostname: string): void {
  if (typeof document === "undefined") return;
  const existing = readConsentCookie();
  if (
    existing &&
    existing.v === payload.v &&
    existing.t === payload.t &&
    existing.p === payload.p &&
    existing.s === payload.s &&
    existing.m === payload.m
  ) {
    return;
  }
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
