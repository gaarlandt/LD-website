// The error sink's shared core: what may be reported, what may travel with it,
// and the bytes that go on the wire (T-44, executing loop decision D-6).
//
// ONE RUNTIME SINCE 2026-09-14. Until then a second half ran in the Cloudflare
// Pages Function `functions/api/contact.ts`, tagged `runtime: pages-function`
// in the same Sentry project; that Function was retired when the forms moved to
// the platform (T-83), so every report now comes from the browser half
// (lib/error-sink.ts). The `runtime` tag stays on every event, because the
// project's history before that date is sorted by it.
//
// WHY THIS FILE IS STILL PURE AND IMPORTS NOTHING. It was written that way for
// the Function, which could not grow a dependency, and the property earns its
// keep without it: no npm packages, no Node APIs, no DOM access, no module-level
// state means every rule, the redaction and the envelope are tested as plain
// functions in the Node environment. There is one spelling of the rule list,
// one of the redaction, and one of the envelope.
//
// -----------------------------------------------------------------------------
// THE HARD LIMIT: NO CONSENT CATEGORIES IN THE PAYLOAD.
// -----------------------------------------------------------------------------
// The SDK is UNGATED by design (D-6): a contract breach can happen precisely to
// someone who refused everything, and a gated sink falls silent at the moment it
// has the most to say. That is the right call, and it is exactly why the payload
// has to be clamped from the other end. `sendDefaultPii: false` does not cover
// it — the problem is not a name or an e-mail address, it is THE CHOICE ITSELF.
// Shipping "this visitor refused statistics and marketing" to a third party is
// the very thing that visitor declined, and we would be doing it in the one code
// path that runs for them regardless.
//
// So the clamp is a property of THIS MODULE and not a rule each call site has to
// remember: a report carries a rule id from a closed list, a level, and
// measurements whose KEYS come from a closed allowlist. Anything else is dropped
// before an event object exists. `redactMeasurements` is the only door, and
// `buildSentryEvent` is the only way to reach the wire, so no call site can talk
// past it. `lib/error-report.test.ts` pins that by handing it the consent
// categories under every name they are spelled in this repo.
//
// The platform's own reporter already models this: its consent messages say THAT
// a cookie was unreadable and omit what it said.
//
// -----------------------------------------------------------------------------
// AND THE OTHER HALF: WHICH RULE BROKE, AND WHAT WAS MEASURED.
// -----------------------------------------------------------------------------
// The platform's build condition, and it is not decoration — their lesson of
// 2026-08-13 is `docs/solutions/design-patterns/
// a-tidy-failure-path-erases-the-cause-it-was-built-to-report.md`: three
// outages in one day, all three undiagnosable because the error handling was
// tidy and reported nothing but the outcome. Hence a report is not free text.
// It is a STABLE rule id you can filter and count on (their rule 3), plus the
// measurement that caused it — the byte count, the status, the copy count — so
// the reason travels instead of being collapsed into "something broke".

/**
 * Which runtime produced this report. A tag, never a second project. Only the
 * browser is left; `pages-function` exists in Sentry's history up to 2026-09-14.
 */
export type ErrorRuntime = "browser";

/** Sentry levels this sink uses. Nothing here is informational. */
export type ReportLevel = "error" | "warning";

export type SentryEnvironment = "production" | "preview";

/**
 * THE CLOSED LIST OF RULES, and it is closed on purpose.
 *
 * A stable id per failure is what makes the sink countable: "how often did
 * the platform refuse the form this week" is a filter, not a text search. It is
 * also the diagnosis itself — the platform's lesson is that a branch which sets
 * a failure card without naming which check refused has thrown the measurement
 * away. Every id below is one branch, never a family of them.
 *
 * Adding one is a deliberate edit here, in the file that also holds the redaction
 * allowlist, so the two are reviewed together.
 */
export const REPORT_RULES = [
  // --- The handover-cookie contracts (ld_attribution, ld_consent) -------------
  /** Rule 5: the record no longer fits in a cookie, so NOTHING was written. */
  "handover_cookie.record_too_large",
  /** Rule 6: a second copy survived the host-only wipe — a genuine second writer. */
  "handover_cookie.duplicate_persists",
  /** Rule 6: a planted host-only copy was found and removed. */
  "handover_cookie.duplicate_repaired",

  // --- The health of the consent chain ---------------------------------------
  /**
   * Cookiebot never became USABLE inside the bounded wait, so no consent state
   * was ever delivered to any subscriber on this page load. This is the failure
   * that cost three deploys in the week of 2026-08-15 (T-43) and was invisible
   * every time: the banner sits there, nothing errors, nothing measures.
   */
  "consent_chain.cookiebot_never_usable",

  // --- The forms' round trip to the platform (lib/website-contact.ts) --------
  // Until 2026-09-14 this block held the eight failure paths of the Pages
  // Function that mailed the forms through Postmark. That Function is gone (T-83):
  // the platform's `submit-website-contact` now verifies Turnstile, stores the
  // message and sends the mail, and reports its own failures there. What is
  // left for THIS side is what only the browser can witness.
  /** No answer at all: network error, CORS refusal, or our 10s timeout. */
  "contact.platform_unreachable",
  /** An answer that is neither ok nor the visitor's own mistake (403, 400 invalid_*, 500, off-contract). */
  "contact.platform_refused",
  /** 400 captcha. Warning: one is a visitor; a run of them is a secret that does not match our widget. */
  "contact.platform_captcha_refused",
] as const;

export type ReportRule = (typeof REPORT_RULES)[number];

/**
 * THE CLOSED ALLOWLIST OF MEASUREMENT KEYS — the mechanism behind the hard limit
 * at the top of this file.
 *
 * A denylist ("drop anything called `statistics`") was the obvious shape and it
 * is the wrong one: it has to anticipate every spelling of the thing it forbids,
 * and the one it misses ships. An allowlist fails the other way. A key nobody
 * thought about is DROPPED, so the worst case is a report with one measurement
 * missing — recoverable, visible in the test, and never a visitor's refusal
 * landing at a third party.
 *
 * Every key here answers "what was measured", never "what did the visitor
 * choose". Counts, sizes, statuses, host names, error text. Note what is
 * deliberately absent and cannot be added without editing this line: `p`, `s`,
 * `m`, `preferences`, `statistics`, `marketing`, `consent`, `categories`, and
 * any cookie VALUE.
 */
export const MEASUREMENT_KEYS = [
  /** Which cookie the contract rule was about — a NAME, never a value. */
  "cookie",
  /** Size of the refused `name=value`, in UTF-8 bytes. */
  "bytes",
  /** The limit it broke. */
  "limit",
  /** How many copies of that cookie name the header carried. */
  "copies",
  /** Did a copy survive the host-only wipe (a real second writer)? */
  "persists",
  /** Upstream HTTP status. */
  "status",
  /** The host this ran on. Ours, not the visitor's. */
  "hostname",
  /** `String(err)` for a thrown upstream call — bounded, see MAX_MEASUREMENT_CHARS. */
  "cause",
  /**
   * The platform's `error` code (`forbidden`, `unavailable`, …) — a word from a
   * closed set, reduced to "unexpected" by lib/website-contact.ts when it is not
   * one, so upstream free text can never ride in on it. (Until 2026-09-14 this
   * key carried Postmark's numeric ErrorCode.)
   */
  "errorCode",
  /** How long the consent-chain wait ran before giving up, in ms. */
  "waitedMs",
  /** Was `window.Cookiebot` published at all when we gave up? */
  "cookiebotPresent",
  /** Was its API constructed (`submitCustomConsent` present) when we gave up? */
  "cookiebotUsable",
  /** How many `CookieConsent` cookies existed — a COUNT, never the value. */
  "cookiebotCookies",
  /** How many consent states were delivered to subscribers (0 is the failure). */
  "deliveries",
] as const;

export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];
export type MeasurementValue = string | number | boolean;
export type Measurements = Partial<Record<MeasurementKey, MeasurementValue>>;

/**
 * How much of a string measurement travels.
 *
 * `cause` is the only unbounded one — it is `String(err)`, which is upstream text
 * we do not control. Cutting it keeps an envelope small enough to be sent from a
 * Worker without thought, and removes the last way a large blob could ride along
 * in a field nobody inspected.
 */
export const MAX_MEASUREMENT_CHARS = 300;

/**
 * The one door into a payload. Keys outside the allowlist are dropped; values
 * that are not a string, a finite number or a boolean are dropped.
 *
 * NON-FINITE NUMBERS GO TOO. `JSON.stringify(NaN)` is `null`, so a measurement
 * that failed to be taken would arrive looking like a measurement that was taken
 * and came back empty — the same erasure this whole file exists to prevent, one
 * level down.
 */
export function redactMeasurements(raw: Record<string, unknown>): Record<string, MeasurementValue> {
  const clean: Record<string, MeasurementValue> = {};
  for (const key of MEASUREMENT_KEYS) {
    const value = raw[key];
    if (typeof value === "string") {
      clean[key] = value.slice(0, MAX_MEASUREMENT_CHARS);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * What each rule SAYS, and the level it says it at.
 *
 * The message is derived from the rule id rather than passed in, which is the
 * second half of the clamp: a call site supplies a rule and measurements and has
 * no free-text channel at all, so it cannot narrate a consent choice into the
 * title of an issue. It also keeps Sentry's grouping stable — the same failure
 * reads the same way every time.
 *
 * The two handover-cookie texts deliberately echo the console lines they
 * accompany (`lib/attribution.ts`, `lib/consent.ts`), which are themselves the
 * platform's byte for byte, so one operator grepping one fixed string finds the
 * same failure on both hosts and now in both sinks.
 */
const RULE_DEFINITIONS: Record<ReportRule, { message: string; level: ReportLevel }> = {
  "handover_cookie.record_too_large": {
    message: "RECORD TE GROOT VOOR EEN COOKIE: niets geschreven",
    level: "error",
  },
  "handover_cookie.duplicate_persists": {
    message: "MEER DAN EEN handover-cookie: OOK NA de host-only wisopdracht",
    level: "error",
  },
  "handover_cookie.duplicate_repaired": {
    message: "MEER DAN EEN handover-cookie: host-only kopie verwijderd",
    level: "warning",
  },
  "consent_chain.cookiebot_never_usable": {
    message: "Cookiebot werd niet bruikbaar binnen de wachttijd: geen enkele consent-staat geleverd",
    level: "error",
  },
  "contact.platform_unreachable": {
    message: "[contact] submit-website-contact gaf geen antwoord (netwerk, CORS of time-out)",
    level: "error",
  },
  "contact.platform_refused": {
    message: "[contact] submit-website-contact weigerde buiten de bezoeker om",
    level: "error",
  },
  "contact.platform_captcha_refused": {
    message: "[contact] submit-website-contact weigerde het Turnstile-token",
    level: "warning",
  },
};

/** The fixed sentence for a rule. Exported so both halves and the tests agree. */
export function ruleMessage(rule: ReportRule): string {
  return RULE_DEFINITIONS[rule].message;
}

/** The level a rule reports at unless the call site overrides it. */
export function ruleLevel(rule: ReportRule): ReportLevel {
  return RULE_DEFINITIONS[rule].level;
}

/** The Sentry event body, in the subset of the schema this sink uses. */
export type SentryEvent = {
  event_id: string;
  timestamp: number;
  platform: "javascript";
  logger: string;
  level: ReportLevel;
  environment: SentryEnvironment;
  transaction: ReportRule;
  fingerprint: string[];
  message: { formatted: string };
  tags: { runtime: ErrorRuntime; rule: ReportRule };
  extra: Record<string, MeasurementValue>;
};

export type BuildEventInput = {
  rule: ReportRule;
  runtime: ErrorRuntime;
  environment: SentryEnvironment;
  eventId: string;
  /** Epoch milliseconds; Sentry wants seconds, converted here. */
  timestampMs: number;
  level?: ReportLevel;
  /** Untrusted by construction: everything goes through `redactMeasurements`. */
  measured?: Record<string, unknown>;
};

/**
 * The event, with the redaction applied on the way in.
 *
 * `measured` is typed `Record<string, unknown>` ON PURPOSE even though every
 * caller passes a typed `Measurements`. Types are gone at runtime, and the clamp
 * has to hold against the object that actually arrives — a spread of some other
 * record, a value read off third-party state. Typing the parameter loosely and
 * filtering hard is the honest arrangement; typing it tightly and trusting it
 * would be a compile-time promise standing in for a runtime guarantee.
 *
 * `fingerprint` is the rule, so Sentry groups by the thing you would filter on
 * rather than by a stack that says "our reporter".
 */
export function buildSentryEvent(input: BuildEventInput): SentryEvent {
  const { rule, runtime, environment, eventId, timestampMs } = input;
  return {
    event_id: eventId,
    timestamp: timestampMs / 1000,
    platform: "javascript",
    logger: "letsdog-website",
    level: input.level ?? ruleLevel(rule),
    environment,
    transaction: rule,
    fingerprint: [rule],
    message: { formatted: ruleMessage(rule) },
    tags: { runtime, rule },
    extra: redactMeasurements(input.measured ?? {}),
  };
}

/** The three pieces of a DSN this sink needs to address the envelope endpoint. */
export type ParsedDsn = {
  /** The full envelope URL, query string included. */
  envelopeUrl: string;
  publicKey: string;
  projectId: string;
};

/**
 * Parse `https://<publicKey>@<host>/<projectId>` into an envelope endpoint.
 *
 * NULL FOR ANYTHING UNPARSEABLE, AND THAT IS THE NO-OP THE WHOLE SINK RESTS ON.
 * `NEXT_PUBLIC_SENTRY_DSN` lives only in the Cloudflare Pages dashboard, so an
 * unset variable is the normal state on localhost, in unit tests, and on any
 * deploy made before somebody sets it. That must be a silent nothing — not a
 * throw, and above all not a throw inside a failure path, where the reporter
 * would then break the very request it was added to explain.
 *
 * The key is passed as `?sentry_key=` rather than an `X-Sentry-Auth` header:
 * from the browser a custom header turns this into a CORS preflight, and Sentry
 * documents the query form for exactly that reason.
 */
export function parseSentryDsn(dsn: string | undefined | null): ParsedDsn | null {
  if (!dsn) return null;
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  const publicKey = url.username;
  const projectId = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!publicKey || !projectId || !/^\d+$/.test(projectId)) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return {
    publicKey,
    projectId,
    envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`,
  };
}

export const SENTRY_ENVELOPE_CONTENT_TYPE = "application/x-sentry-envelope";

/**
 * The envelope: three newline-terminated JSON lines — header, item header, item.
 *
 * NO `length` ON THE ITEM HEADER, deliberately. It is optional when the payload
 * is newline-terminated, and a length computed in the wrong units (UTF-16 code
 * units instead of UTF-8 bytes) is a whole class of bug that silently truncates
 * the only report we get. Leaving it out cannot be wrong.
 */
export function buildSentryEnvelope(event: SentryEvent, dsn: ParsedDsn, sentAtIso: string): string {
  const header = JSON.stringify({ event_id: event.event_id, sent_at: sentAtIso, dsn: dsnUri(dsn) });
  return `${header}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`;
}

function dsnUri(dsn: ParsedDsn): string {
  const url = new URL(dsn.envelopeUrl);
  return `${url.protocol}//${dsn.publicKey}@${url.host}/${dsn.projectId}`;
}

/**
 * A 32-hex-character event id.
 *
 * `crypto.randomUUID` exists on the Workers runtime and in every browser that
 * reaches this code, but it is absent in a plain non-secure context and in some
 * test rigs, and an error reporter that throws while reporting an error is the
 * worst possible shape. So there is a fallback, and it is allowed to be weak:
 * this id only has to be unique enough for Sentry to deduplicate a retry.
 */
export function newEventId(): string {
  const c: Crypto | undefined = typeof crypto === "undefined" ? undefined : crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().replace(/-/g, "");
  let out = "";
  while (out.length < 32) out += Math.floor(Math.random() * 16).toString(16);
  return out.slice(0, 32);
}
