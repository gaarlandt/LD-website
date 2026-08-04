import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isPreviewOrLocalHost, onRequestPost } from "./contact";

// Unit tests for the contact Cloudflare Pages Function. This logic ships straight
// to production and CANNOT run under `next dev`, so these tests are the only
// pre-deploy coverage of its highest-risk branches: the fail-closed Turnstile host
// posture (#8), the no-echo / name-sanitized confirmation (#1), the upstream
// timeout + observability paths (#5/#6), and the Postmark batch result parsing.
//
// onRequestPost is exercised end-to-end with a hand-built Request, a structurally
// typed inline env (the Function's private Env/PagesContext need no export), and a
// global `fetch` stub standing in for Turnstile siteverify + the Postmark batch.

const VALID = { name: "Jan", email: "jan@example.nl", message: "Hallo, ik heb een vraag." };

// A branch-preview host: gets the always-pass Turnstile TEST secret when no real
// secret is set, so the default path reaches Postmark.
const PREVIEW_HOST = "feat-x.website-letsdog.pages.dev";

type EnvLike = {
  POSTMARK_SERVER_TOKEN?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
};

function makeRequest(
  body: Record<string, unknown>,
  { host = PREVIEW_HOST }: { host?: string } = {},
): Request {
  return new Request(`https://${host}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

// onRequestPost's PagesContext is structurally { request, env }; a plain object
// satisfies it without exporting the private interface.
function call(request: Request, env: EnvLike = { POSTMARK_SERVER_TOKEN: "pm-token" }) {
  return onRequestPost({ request, env });
}

type FetchScenario = {
  turnstile?: { ok?: boolean; status?: number; success?: boolean; abort?: boolean };
  postmark?: {
    ok?: boolean;
    status?: number;
    body?: unknown;
    raw?: string;
    abort?: boolean;
    bodyReadThrows?: boolean;
  };
};

// Minimal shape of the Postmark message objects the Function builds, so the U1
// content assertions are typed — a source rename (e.g. TextBody) is a tsc error,
// not a silent pass.
type PostmarkMessage = {
  From: string;
  To: string;
  ReplyTo?: string;
  Subject: string;
  TextBody: string;
  HtmlBody: string;
};

// Route the global fetch stub by URL. Captures every Postmark batch payload so the
// email-content assertions (U1) can read what would actually be sent. `abort:true`
// throws a TimeoutError, simulating AbortSignal.timeout() firing (U2).
function stubFetch(scenario: FetchScenario = {}) {
  const ts = { ok: true, status: 200, success: true, abort: false, ...scenario.turnstile };
  const pm = {
    ok: true,
    status: 200,
    body: [{ ErrorCode: 0, Message: "OK" }] as unknown,
    raw: undefined as string | undefined,
    abort: false,
    bodyReadThrows: false,
    ...scenario.postmark,
  };
  const postmarkPayloads: PostmarkMessage[][] = [];

  const fetchMock = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input);
    if (url.includes("challenges.cloudflare.com")) {
      if (ts.abort) throw timeoutError();
      if (!ts.ok) return new Response("upstream error", { status: ts.status });
      return jsonResponse({ success: ts.success });
    }
    if (url.includes("api.postmarkapp.com")) {
      if (typeof init?.body === "string") postmarkPayloads.push(JSON.parse(init.body));
      if (pm.abort) throw timeoutError();
      if (pm.bodyReadThrows) {
        // Headers arrive, but the body read throws — e.g. AbortSignal.timeout
        // firing during res.json(), or a torn body. Exercises the inner catch.
        return { ok: true, status: 200, json: async () => { throw timeoutError(); } } as unknown as Response;
      }
      if (!pm.ok) return new Response("upstream error", { status: pm.status });
      if (pm.raw !== undefined) return new Response(pm.raw, { status: 200 });
      return jsonResponse(pm.body);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, postmarkPayloads };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Shape of what AbortSignal.timeout() raises when it fires.
function timeoutError(): Error {
  return Object.assign(new Error("The operation timed out."), { name: "TimeoutError" });
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isPreviewOrLocalHost (U3 — fail-closed Turnstile host posture)", () => {
  it("allows localhost", () => {
    expect(isPreviewOrLocalHost("localhost")).toBe(true);
  });

  it("allows a branch-preview alias under *.pages.dev", () => {
    expect(isPreviewOrLocalHost("feat-contact-hardening.website-letsdog.pages.dev")).toBe(true);
  });

  it("ENFORCES the production Pages alias — the #8 regression guard", () => {
    expect(isPreviewOrLocalHost("website-letsdog.pages.dev")).toBe(false);
  });

  it("enforces the apex and www", () => {
    expect(isPreviewOrLocalHost("letsdog.nl")).toBe(false);
    expect(isPreviewOrLocalHost("www.letsdog.nl")).toBe(false);
  });

  it("does not treat a non-pages.dev lookalike as a preview", () => {
    expect(isPreviewOrLocalHost("website-letsdog.pages.dev.evil.com")).toBe(false);
  });
});

describe("onRequestPost — input validation", () => {
  it("invalid JSON → 400 invalid_json", async () => {
    stubFetch();
    const request = new Request(`https://${PREVIEW_HOST}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await call(request);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_json" });
  });

  it("honeypot filled → 200 ok and NOTHING sent", async () => {
    const { fetchMock } = stubFetch();
    const res = await call(makeRequest({ ...VALID, company: "bot" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing name → 400 name", async () => {
    stubFetch();
    const res = await call(makeRequest({ ...VALID, name: "   " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "name" });
  });

  it("over-long name → 400 name", async () => {
    stubFetch();
    const res = await call(makeRequest({ ...VALID, name: "a".repeat(101) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "name" });
  });

  it("invalid email → 400 email", async () => {
    stubFetch();
    const res = await call(makeRequest({ ...VALID, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "email" });
  });

  it("missing message → 400 message", async () => {
    stubFetch();
    const res = await call(makeRequest({ ...VALID, message: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "message" });
  });

  it("over-long email → 400 email", async () => {
    stubFetch();
    const res = await call(makeRequest({ ...VALID, email: `${"a".repeat(200)}@example.nl` }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "email" });
  });

  it("over-long message → 400 message", async () => {
    stubFetch();
    const res = await call(makeRequest({ ...VALID, message: "a".repeat(5001) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "message" });
  });
});

describe("onRequestPost — Turnstile fail-closed host posture (U3)", () => {
  it("apex host with no real secret → 500 server_not_configured, nothing sent, logged", async () => {
    const { fetchMock } = stubFetch();
    const res = await call(makeRequest(VALID, { host: "letsdog.nl" }), {
      POSTMARK_SERVER_TOKEN: "pm-token",
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("production Pages alias with no real secret → 500 (the #8 regression that must NOT reopen)", async () => {
    const { fetchMock } = stubFetch();
    const res = await call(makeRequest(VALID, { host: "website-letsdog.pages.dev" }), {
      POSTMARK_SERVER_TOKEN: "pm-token",
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("branch preview with no real secret → falls back to the test secret and proceeds", async () => {
    const { fetchMock } = stubFetch();
    const res = await call(makeRequest(VALID, { host: PREVIEW_HOST }), {
      POSTMARK_SERVER_TOKEN: "pm-token",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2); // siteverify + Postmark
  });

  it("localhost with no real secret → falls back to the test secret and proceeds", async () => {
    stubFetch();
    const res = await call(makeRequest(VALID, { host: "localhost" }), {
      POSTMARK_SERVER_TOKEN: "pm-token",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("apex host WITH a real secret → enforced and proceeds when verify passes", async () => {
    stubFetch();
    const res = await call(makeRequest(VALID, { host: "letsdog.nl" }), {
      POSTMARK_SERVER_TOKEN: "pm-token",
      TURNSTILE_SECRET_KEY: "real-secret",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("onRequestPost — Turnstile verification + timeout (U2)", () => {
  it("verify success:false → 400 captcha, no Postmark call", async () => {
    const { fetchMock } = stubFetch({ turnstile: { success: false } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "captcha" });
    expect(fetchMock).toHaveBeenCalledTimes(1); // siteverify only
  });

  it("siteverify non-2xx → 400 captcha and a logged error", async () => {
    stubFetch({ turnstile: { ok: false, status: 503 } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "captcha" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("siteverify fetch aborts (timeout) → 400 captcha, no Postmark call, logged", async () => {
    const { fetchMock } = stubFetch({ turnstile: { abort: true } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "captcha" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("onRequestPost — Postmark batch result handling (U2)", () => {
  it("Postmark token missing → 500 server_not_configured after Turnstile, no send, logged", async () => {
    const { fetchMock } = stubFetch();
    const res = await call(makeRequest(VALID), {}); // no POSTMARK_SERVER_TOKEN
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_not_configured" });
    expect(fetchMock).toHaveBeenCalledTimes(1); // siteverify ran; Postmark did not
    expect(errorSpy).toHaveBeenCalled();
  });

  it("support message ErrorCode 0 → 200 ok", async () => {
    stubFetch({ postmark: { body: [{ ErrorCode: 0 }, { ErrorCode: 0 }] } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("support message non-zero ErrorCode → 502 send_failed, logged", async () => {
    stubFetch({ postmark: { body: [{ ErrorCode: 300, Message: "Inactive recipient" }] } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("batch non-2xx → 502 send_failed, logged with status", async () => {
    stubFetch({ postmark: { ok: false, status: 422 } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("batch body is not an array → 502", async () => {
    stubFetch({ postmark: { body: { ErrorCode: 0 } } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
  });

  it("batch body is an empty array → 502", async () => {
    stubFetch({ postmark: { body: [] } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
  });

  it("batch returns an unparseable 200 body → 502, logged", async () => {
    stubFetch({ postmark: { raw: "<html>gateway</html>" } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("batch fetch aborts (timeout) → 502 send_failed, logged", async () => {
    stubFetch({ postmark: { abort: true } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("body read throws (post-headers timeout / torn body) → 502 send_failed, logged", async () => {
    stubFetch({ postmark: { bodyReadThrows: true } });
    const res = await call(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("onRequestPost — confirmation email content (U1: no echo, name sanitized)", () => {
  it("support body keeps the full message; the customer confirmation does NOT echo it", async () => {
    const marker = "swordfish-secret-message-body";
    const { postmarkPayloads } = stubFetch();
    const res = await call(makeRequest({ ...VALID, message: marker }));
    expect(res.status).toBe(200);
    expect(postmarkPayloads).toHaveLength(1);

    const [support, customer] = postmarkPayloads[0];

    // Support notification (index 0): the team must still see the full message.
    expect(support.To).toBe("support@letsdog.nl");
    expect(support.ReplyTo).toBe(VALID.email);
    expect(support.TextBody).toContain(marker);
    expect(support.HtmlBody).toContain(marker);

    // Customer confirmation (index 1): goes to the user-supplied address — it must
    // replay NOTHING the visitor submitted (the #1 amplification primitive).
    expect(customer.To).toBe(VALID.email);
    expect(customer.TextBody).not.toContain(marker);
    expect(customer.HtmlBody).not.toContain(marker);
    expect(customer.TextBody).not.toContain("Jouw bericht");
    expect(customer.HtmlBody).not.toContain("Jouw bericht");

    // ...but it is still a real, friendly acknowledgement.
    expect(customer.Subject).toBe("We hebben je bericht ontvangen");
    expect(customer.TextBody).toContain("Hoi Jan");
    expect(customer.TextBody).toContain("Bedankt voor je bericht");
  });

  it("collapses CR/LF in `name` in the support + confirmation bodies and the subject (field-injection guard)", async () => {
    const injecting = "Jan\r\nE-mail: attacker@evil.com\r\nBericht: nep";
    const { postmarkPayloads } = stubFetch();
    const res = await call(makeRequest({ ...VALID, name: injecting }));
    expect(res.status).toBe(200);
    expect(postmarkPayloads).toHaveLength(1);

    const [support, customer] = postmarkPayloads[0];

    // No raw CR/LF from the name survives into any plain-text body or the subject...
    expect(support.Subject).not.toMatch(/[\r\n]/);
    expect(support.TextBody).not.toMatch(/Jan[\r\n]/);
    expect(customer.TextBody).not.toMatch(/Jan[\r\n]/);

    // ...the SUPPORT body + subject keep the full flattened name (the team needs it)...
    expect(support.Subject).toContain("Jan E-mail: attacker@evil.com Bericht: nep");
    expect(support.TextBody).toContain("Naam: Jan E-mail: attacker@evil.com Bericht: nep");
    // ...while the CUSTOMER greeting is flattened AND capped at 20 chars, so the
    // injected tail can't ride along in the branded email to the recipient.
    expect(customer.TextBody).toContain("Hoi Jan E-mail: attacker,");
    expect(customer.TextBody).not.toContain("Bericht: nep");
  });

  it("caps the customer-greeting name at 20 chars while support keeps the full name (R-B)", async () => {
    const longName = "Christiaan-Alexander von Habsburg"; // 33 chars, valid (< MAX.name 100)
    const { postmarkPayloads } = stubFetch();
    const res = await call(makeRequest({ ...VALID, name: longName }));
    expect(res.status).toBe(200);
    expect(postmarkPayloads).toHaveLength(1);

    const [support, customer] = postmarkPayloads[0];
    // Support keeps the full name (the team needs the real thing).
    expect(support.TextBody).toContain(longName);
    // The customer greeting carries only the first 20 chars — bounds attacker text.
    expect(customer.TextBody).toContain("Hoi Christiaan-Alexander,");
    expect(customer.TextBody).not.toContain(longName);
    expect(customer.HtmlBody).not.toContain(longName);
  });
});

// The /partners creator application shares this Function via a `kind` discriminator
// (see the isCreator branch). These tests pin the three things that differ from a
// contact submission — required fields, recipient, and the closed value sets — plus
// the one property that must NOT differ: the security posture is shared, not forked.
const CREATOR = {
  kind: "creator",
  name: "Sanne",
  email: "sanne@example.nl",
  collaboration: "ambassador",
};

describe("onRequestPost — creator applications (kind: \"creator\")", () => {
  it("does not require a message, unlike a contact submission", async () => {
    stubFetch();
    const res = await call(makeRequest(CREATOR));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("still requires name and a valid email", async () => {
    stubFetch();
    const noName = await call(makeRequest({ ...CREATOR, name: "" }));
    expect(noName.status).toBe(400);
    await expect(noName.json()).resolves.toEqual({ ok: false, error: "name" });

    const badEmail = await call(makeRequest({ ...CREATOR, email: "nope" }));
    expect(badEmail.status).toBe(400);
    await expect(badEmail.json()).resolves.toEqual({ ok: false, error: "email" });
  });

  it("requires a collaboration value from the closed set", async () => {
    stubFetch();
    const missing = await call(makeRequest({ ...CREATOR, collaboration: "" }));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ ok: false, error: "collaboration" });

    const forged = await call(makeRequest({ ...CREATOR, collaboration: "admin" }));
    expect(forged.status).toBe(400);
    await expect(forged.json()).resolves.toEqual({ ok: false, error: "collaboration" });
  });

  it("routes to the creators inbox, not support", async () => {
    const { postmarkPayloads } = stubFetch();
    await call(makeRequest(CREATOR), {
      POSTMARK_SERVER_TOKEN: "pm-token",
      CONTACT_TO: "support@letsdog.nl",
    });
    const [support] = postmarkPayloads[0];
    expect(support.To).toBe("creators@letsdog.nl");
    expect(support.Subject).toContain("creator-aanmelding");
  });

  it("drops channel values outside the closed set instead of forwarding them", async () => {
    const { postmarkPayloads } = stubFetch();
    await call(
      makeRequest({
        ...CREATOR,
        channels: ["Instagram", "<script>alert(1)</script>", "TikTok"],
      }),
    );
    const [support] = postmarkPayloads[0];
    expect(support.TextBody).toContain("Kanalen: Instagram, TikTok");
    expect(support.TextBody).not.toContain("script");
  });

  it("omits optional rows that were left blank", async () => {
    const { postmarkPayloads } = stubFetch();
    await call(makeRequest(CREATOR));
    const [support] = postmarkPayloads[0];
    expect(support.TextBody).not.toContain("Profiel:");
    expect(support.TextBody).not.toContain("Bereik:");
    expect(support.TextBody).not.toContain("Over zichzelf:");
  });

  it("collapses CR/LF in creator fields so they cannot forge extra lines", async () => {
    const { postmarkPayloads } = stubFetch();
    await call(
      makeRequest({
        ...CREATOR,
        profile: "https://x.nl\nBereik: 1.000.000 volgers",
      }),
    );
    const [support] = postmarkPayloads[0];
    expect(support.TextBody).toContain("Profiel: https://x.nl Bereik: 1.000.000 volgers");
    expect(support.TextBody.split("\n").filter((l) => l.startsWith("Bereik:"))).toHaveLength(0);
  });

  it("shares the contact form's Turnstile gate rather than forking it", async () => {
    stubFetch({ turnstile: { success: false } });
    const res = await call(makeRequest(CREATOR));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "captcha" });
  });

  it("honours the honeypot the same way", async () => {
    const { postmarkPayloads } = stubFetch();
    const res = await call(makeRequest({ ...CREATOR, company: "bot" }));
    expect(res.status).toBe(200);
    expect(postmarkPayloads).toHaveLength(0);
  });

  it("sends the applicant a confirmation that does not echo their submission", async () => {
    const { postmarkPayloads } = stubFetch();
    await call(makeRequest({ ...CREATOR, message: "Ik film mijn hond elke dag." }));
    const [, customer] = postmarkPayloads[0];
    expect(customer.To).toBe("sanne@example.nl");
    expect(customer.Subject).toBe("We hebben je aanmelding ontvangen");
    expect(customer.TextBody).toContain("drie werkdagen");
    expect(customer.TextBody).not.toContain("Ik film mijn hond elke dag.");
    expect(customer.HtmlBody).not.toContain("Ik film mijn hond elke dag.");
  });
});
