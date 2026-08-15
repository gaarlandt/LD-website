import { describe, expect, it } from "vitest";

import {
  buildSentryEnvelope,
  buildSentryEvent,
  MAX_MEASUREMENT_CHARS,
  MEASUREMENT_KEYS,
  newEventId,
  parseSentryDsn,
  redactMeasurements,
  REPORT_RULES,
  ruleLevel,
  ruleMessage,
  type ParsedDsn,
  type ReportRule,
} from "./error-report";

// The shared core of the error sink (T-44, executing loop decision D-6). Both
// runtimes route through this module, so this file is where the two things that
// must not drift are pinned: the REDACTION, and the bytes on the wire.
//
// A DSN shaped like the real one (EU ingest, project `website`) with a made-up
// key and project id. The real value lives only in the Cloudflare Pages
// dashboard and is never committed — not even here.
const DSN = "https://abc123def456@o4511218925699072.ingest.de.sentry.io/4511300000000000";

function parsed(): ParsedDsn {
  const dsn = parseSentryDsn(DSN);
  if (!dsn) throw new Error("fixture DSN must parse");
  return dsn;
}

// =============================================================================
// THE HARD LIMIT: no consent categories in the payload.
// =============================================================================
// D-6 puts the SDK OUTSIDE the consent layer on purpose — a contract breach can
// happen precisely to someone who refused everything, and a gated sink falls
// silent at the moment it has the most to say. The price of that is this clamp,
// and it has to be a property of the module rather than a rule each call site
// remembers, because the call site that forgets is the one that ships a
// refuser's refusal to a third party.
describe("the redaction rule", () => {
  // Every spelling of a consent category this repo actually uses: the wire
  // format of ld_consent (p/s/m), the Cookiebot object's field names, and the
  // words a future call site would reach for.
  const CONSENT_SHAPED = {
    p: true,
    s: false,
    m: true,
    v: 1,
    t: "2026-08-15T10:00:00.000Z",
    necessary: true,
    preferences: true,
    statistics: false,
    marketing: false,
    consent: { p: true, s: false, m: false },
    categories: "p,s",
    choice: "denied",
    ld_consent: '{"v":1,"t":"2026-08-15T10:00:00.000Z","p":false,"s":false,"m":false}',
    CookieConsent: "{stamp:'x',necessary:true,preferences:false}",
    value: "anything",
  };

  it("drops every consent category, under every name this repo spells them", () => {
    expect(redactMeasurements(CONSENT_SHAPED)).toEqual({});
  });

  it("cannot be bypassed by going through buildSentryEvent", () => {
    // The clamp is worth nothing if the event builder is a second door. It is
    // not: `measured` is typed loosely and filtered hard, because a type is gone
    // at runtime and the object that actually arrives is what has to be clamped.
    const event = buildSentryEvent({
      rule: "handover_cookie.duplicate_persists",
      runtime: "browser",
      environment: "production",
      eventId: "0".repeat(32),
      timestampMs: 1_755_000_000_000,
      measured: { ...CONSENT_SHAPED, cookie: "ld_consent", copies: 2, persists: true },
    });

    expect(event.extra).toEqual({ cookie: "ld_consent", copies: 2, persists: true });
    // And not smuggled in anywhere else in the event either.
    const wire = JSON.stringify(event);
    for (const forbidden of ["statistics", "marketing", "preferences", "categories", "denied"]) {
      expect(wire, `"${forbidden}" reached the wire`).not.toContain(forbidden);
    }
  });

  it("keeps every allowlisted key when it carries a usable value", () => {
    const all = Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, 1]));
    expect(Object.keys(redactMeasurements(all)).sort()).toEqual([...MEASUREMENT_KEYS].sort());
  });

  it("caps a string measurement, so upstream error text cannot become a payload", () => {
    const { cause } = redactMeasurements({ cause: "x".repeat(MAX_MEASUREMENT_CHARS + 500) });
    expect(cause).toHaveLength(MAX_MEASUREMENT_CHARS);
  });

  it("drops a non-finite number rather than letting JSON turn it into null", () => {
    // JSON.stringify(NaN) is `null`, so a measurement that FAILED to be taken
    // would arrive looking like one that was taken and came back empty — the same
    // erasure the whole sink exists to prevent, one level down.
    expect(redactMeasurements({ bytes: Number.NaN, limit: Number.POSITIVE_INFINITY })).toEqual({});
  });

  it("drops values that are not a string, finite number or boolean", () => {
    expect(
      redactMeasurements({
        cookie: { name: "ld_consent" },
        cause: null,
        status: undefined,
        hostname: ["letsdog.nl"],
      }),
    ).toEqual({});
  });
});

describe("the rule table", () => {
  it("gives every rule a fixed message and a level", () => {
    // The message is derived from the rule id rather than passed in: that is the
    // second half of the clamp, because a free-text parameter is a channel a call
    // site could narrate a consent choice into.
    for (const rule of REPORT_RULES) {
      expect(ruleMessage(rule).length, rule).toBeGreaterThan(0);
      expect(["error", "warning"]).toContain(ruleLevel(rule));
    }
  });

  it("covers the eight failure paths of the contact Function, one id each", () => {
    // D-6 named these eight as the strongest justification for having a sink at
    // all: each one is a lost lead. Collapsing two of them into one id would be
    // the exact failure the platform's lesson is about.
    const contactRules = REPORT_RULES.filter((rule) => rule.startsWith("contact."));
    expect(contactRules).toHaveLength(8);
    expect(new Set(contactRules).size).toBe(8);
  });

  it("keeps the duplicate-cookie error/warning split as two ids, not one at two levels", () => {
    expect(ruleLevel("handover_cookie.duplicate_persists")).toBe("error");
    expect(ruleLevel("handover_cookie.duplicate_repaired")).toBe("warning");
  });
});

describe("the event", () => {
  const base = {
    runtime: "pages-function" as const,
    environment: "production" as const,
    eventId: "a".repeat(32),
    timestampMs: 1_755_000_000_000,
  };

  it("tags the runtime, so two runtimes share one project", () => {
    const browser = buildSentryEvent({ ...base, runtime: "browser", rule: "contact.postmark_token_missing" });
    const fn = buildSentryEvent({ ...base, rule: "contact.postmark_token_missing" });
    expect(browser.tags.runtime).toBe("browser");
    expect(fn.tags.runtime).toBe("pages-function");
    expect(browser.tags.rule).toBe("contact.postmark_token_missing");
  });

  it("groups on the rule and carries its fixed message", () => {
    const rule: ReportRule = "contact.postmark_batch_non_2xx";
    const event = buildSentryEvent({ ...base, rule, measured: { status: 503 } });
    expect(event.fingerprint).toEqual([rule]);
    expect(event.transaction).toBe(rule);
    expect(event.message.formatted).toBe(ruleMessage(rule));
    expect(event.extra).toEqual({ status: 503 });
  });

  it("uses the rule's level unless the call site overrides it", () => {
    const rule: ReportRule = "handover_cookie.duplicate_repaired";
    expect(buildSentryEvent({ ...base, rule }).level).toBe("warning");
    expect(buildSentryEvent({ ...base, rule, level: "error" }).level).toBe("error");
  });

  it("reports the timestamp in seconds, which is what Sentry reads", () => {
    expect(buildSentryEvent({ ...base, rule: "contact.postmark_token_missing" }).timestamp).toBe(
      1_755_000_000,
    );
  });
});

describe("the DSN", () => {
  it("builds an envelope endpoint with the key in the query string", () => {
    // Query auth rather than an X-Sentry-Auth header: from the browser a custom
    // header turns this into a CORS preflight.
    const dsn = parsed();
    expect(dsn.publicKey).toBe("abc123def456");
    expect(dsn.projectId).toBe("4511300000000000");
    expect(dsn.envelopeUrl).toBe(
      "https://o4511218925699072.ingest.de.sentry.io/api/4511300000000000/envelope/" +
        "?sentry_key=abc123def456&sentry_version=7",
    );
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["not a URL", "not-a-dsn"],
    ["no public key", "https://o1.ingest.de.sentry.io/123"],
    ["no project id", "https://key@o1.ingest.de.sentry.io/"],
    ["non-numeric project id", "https://key@o1.ingest.de.sentry.io/website"],
    ["wrong protocol", "ftp://key@o1.ingest.de.sentry.io/123"],
  ])("refuses a DSN that is %s, so the sink is a silent no-op", (_label, value) => {
    // UNSET IS THE NORMAL STATE, not an error case: the DSN lives only in the
    // Cloudflare dashboard, so localhost, this test run, and every deploy made
    // before somebody sets it all land here. It must never throw — the callers
    // are all on a failure path already.
    expect(parseSentryDsn(value)).toBeNull();
  });
});

describe("the envelope", () => {
  const event = buildSentryEvent({
    rule: "contact.turnstile_siteverify_non_2xx",
    runtime: "pages-function",
    environment: "preview",
    eventId: "b".repeat(32),
    timestampMs: 1_755_000_000_000,
    measured: { status: 502, hostname: "feat-x.website-letsdog.pages.dev" },
  });

  it("is three newline-terminated JSON lines: header, item header, item", () => {
    const body = buildSentryEnvelope(event, parsed(), "2026-08-15T10:00:00.000Z");
    expect(body.endsWith("\n")).toBe(true);
    const lines = body.split("\n").filter((line) => line.length > 0);
    expect(lines).toHaveLength(3);

    expect(JSON.parse(lines[0])).toEqual({
      event_id: "b".repeat(32),
      sent_at: "2026-08-15T10:00:00.000Z",
      dsn: "https://abc123def456@o4511218925699072.ingest.de.sentry.io/4511300000000000",
    });
    expect(JSON.parse(lines[1])).toEqual({ type: "event" });
    expect(JSON.parse(lines[2])).toEqual(event);
  });

  it("omits the item length, which is optional and easy to get wrong", () => {
    // A length in UTF-16 code units where UTF-8 bytes were meant silently
    // truncates the one report we get. Leaving it out cannot be wrong.
    const body = buildSentryEnvelope(event, parsed(), "2026-08-15T10:00:00.000Z");
    expect(body).not.toContain('"length"');
  });
});

describe("the event id", () => {
  it("is 32 hex characters", () => {
    expect(newEventId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("does not repeat itself", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newEventId()));
    expect(ids.size).toBe(50);
  });
});
