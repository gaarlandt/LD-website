import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_BROWSER_REPORTS_PER_PAGE, reportRuleBreach, resetErrorSinkForTests } from "./error-sink";

// The browser half of the error sink (T-44, executing loop decision D-6).
//
// The env is Node, so `window` and `fetch` are stubbed. That is enough for
// everything that can be pinned here — the guard conditions, the request shape,
// and the ceiling. What CANNOT be pinned in Node, and is stated rather than
// implied: that a real browser accepts this request without a CORS preflight,
// and that Sentry ingests it. Neither is verified by this file.

const DSN = "https://abc123def456@o4511218925699072.ingest.de.sentry.io/4511300000000000";
const ENVELOPE_URL =
  "https://o4511218925699072.ingest.de.sentry.io/api/4511300000000000/envelope/" +
  "?sentry_key=abc123def456&sentry_version=7";

type FetchCall = { url: string; init: RequestInit };

function stubBrowser({ hostname = "letsdog.nl" }: { hostname?: string } = {}): {
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  vi.stubGlobal("window", { location: { hostname } });
  vi.stubGlobal("fetch", (url: unknown, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return Promise.resolve(new Response("", { status: 200 }));
  });
  return { calls };
}

/** The single envelope line carrying the event, parsed. */
function eventFrom(call: FetchCall): Record<string, unknown> {
  const lines = String(call.init.body).split("\n").filter(Boolean);
  return JSON.parse(lines[2]);
}

beforeEach(() => {
  resetErrorSinkForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("when the sink is not configured", () => {
  it("sends nothing and throws nothing without a DSN", () => {
    // THE NORMAL STATE, not an error case. NEXT_PUBLIC_SENTRY_DSN lives only in
    // the Cloudflare dashboard and is inlined at build time, so localhost, this
    // test run, and every deploy made before somebody sets that variable land
    // here. Every caller is on a failure path already; a throw would turn a
    // logged problem into a broken page.
    const { calls } = stubBrowser();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(() => reportRuleBreach("contact.postmark_token_missing")).not.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("sends nothing and throws nothing on a malformed DSN", () => {
    const { calls } = stubBrowser();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "not-a-dsn");
    expect(() => reportRuleBreach("contact.postmark_token_missing")).not.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("sends nothing outside a browser", () => {
    // lib/consent.ts and lib/attribution.ts are imported by Node tests and could
    // be imported by a server component; the sink has to be inert there.
    vi.stubGlobal("window", undefined);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(() => reportRuleBreach("contact.postmark_token_missing")).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the request it makes", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
  });

  it("POSTs one envelope to the endpoint the DSN addresses", () => {
    const { calls } = stubBrowser();
    reportRuleBreach("handover_cookie.record_too_large", {
      cookie: "ld_attribution",
      bytes: 4300,
      limit: 4096,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ENVELOPE_URL);
    expect(calls[0].init.method).toBe("POST");
  });

  it("sends no Content-Type header, so the browser makes no CORS preflight", () => {
    // Read off @sentry/browser's own transports/fetch.js: the official browser
    // transport omits it for exactly this reason. The Cloudflare Function, which
    // has no CORS to satisfy, does send `application/x-sentry-envelope`.
    const { calls } = stubBrowser();
    reportRuleBreach("contact.postmark_token_missing");
    expect(calls[0].init.headers).toBeUndefined();
  });

  it("keeps the request alive across a navigation and leaks no referrer", () => {
    const { calls } = stubBrowser();
    reportRuleBreach("contact.postmark_token_missing");
    expect(calls[0].init.keepalive).toBe(true);
    expect(calls[0].init.referrerPolicy).toBe("strict-origin");
  });

  it("tags the browser runtime and the rule, and carries what was measured", () => {
    const { calls } = stubBrowser();
    reportRuleBreach("handover_cookie.duplicate_persists", {
      cookie: "ld_consent",
      copies: 2,
      persists: true,
    });

    const event = eventFrom(calls[0]);
    expect(event.tags).toEqual({ runtime: "browser", rule: "handover_cookie.duplicate_persists" });
    expect(event.extra).toEqual({ cookie: "ld_consent", copies: 2, persists: true });
    expect(event.level).toBe("error");
  });

  it("redacts a consent choice a call site tried to attach", () => {
    // The clamp is enforced in lib/error-report.ts, but this is the path a real
    // call site takes, so it is pinned end to end as well: an ungated sink that
    // shipped a refuser's refusal to a third party would be doing the one thing
    // that person declined.
    const { calls } = stubBrowser();
    reportRuleBreach("handover_cookie.duplicate_persists", {
      cookie: "ld_consent",
      // @ts-expect-error — not an allowlisted measurement key, which is the point:
      // the type refuses it AND the runtime drops it, because types are gone at
      // runtime and the clamp has to hold against the object that actually arrives.
      statistics: false,
      marketing: false,
    });

    expect(eventFrom(calls[0]).extra).toEqual({ cookie: "ld_consent" });
    expect(String(calls[0].init.body)).not.toContain("statistics");
  });

  it("marks a preview host as preview, matching GA4 and PostHog", () => {
    const { calls } = stubBrowser({ hostname: "feat-x.website-letsdog.pages.dev" });
    reportRuleBreach("contact.postmark_token_missing");
    expect(eventFrom(calls[0]).environment).toBe("preview");
  });

  it("marks the apex as production", () => {
    const { calls } = stubBrowser({ hostname: "letsdog.nl" });
    reportRuleBreach("contact.postmark_token_missing");
    expect(eventFrom(calls[0]).environment).toBe("production");
  });
});

describe("it cannot become the problem", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
  });

  it("stops at the per-page ceiling", () => {
    const { calls } = stubBrowser();
    for (let i = 0; i < MAX_BROWSER_REPORTS_PER_PAGE + 5; i += 1) {
      reportRuleBreach("handover_cookie.duplicate_repaired", { cookie: "ld_consent" });
    }
    expect(calls).toHaveLength(MAX_BROWSER_REPORTS_PER_PAGE);
  });

  it("does not throw when fetch throws synchronously", () => {
    vi.stubGlobal("window", { location: { hostname: "letsdog.nl" } });
    vi.stubGlobal("fetch", () => {
      throw new Error("blocked by an extension");
    });
    expect(() => reportRuleBreach("contact.postmark_token_missing")).not.toThrow();
  });

  it("does not produce an unhandled rejection when the POST fails", async () => {
    vi.stubGlobal("window", { location: { hostname: "letsdog.nl" } });
    const rejection = Promise.reject(new Error("network down"));
    vi.stubGlobal("fetch", () => rejection);

    expect(() => reportRuleBreach("contact.postmark_token_missing")).not.toThrow();
    // If the rejection were not swallowed at the source, this microtask drain is
    // where Vitest would surface it.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
