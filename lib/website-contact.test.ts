import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

vi.mock("./error-sink", () => ({ reportRuleBreach: vi.fn() }));

import { reportRuleBreach } from "./error-sink";
import {
  formActionFor,
  readOutcome,
  reportOutcome,
  reportUnreachable,
  submitWebsiteForm,
  unreachableCause,
  WEBSITE_CONTACT_URL,
  type ContactOutcome,
  type WebsiteFormPayload,
} from "./website-contact";

const reported = vi.mocked(reportRuleBreach);

function answer(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": typeof body === "string" ? "text/html" : "application/json" },
  });
}

const PAYLOAD: WebsiteFormPayload = {
  name: "Anna de Vries",
  email: "anna@example.com",
  message: "Hoe lang duurt de cursus?",
  company: "",
  turnstileToken: "token-123",
};

beforeEach(() => {
  reported.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the entry (hub contract websiteformulier-ingang.md)", () => {
  it("is the platform's submit-website-contact, not submit-contact", () => {
    // PF D-444 corrected the D-355 row: submit-contact is the entry for
    // LOGGED-IN app users (verify_jwt) and refuses every visitor.
    expect(WEBSITE_CONTACT_URL).toBe(
      "https://adzrridmqfoemturcepf.supabase.co/functions/v1/submit-website-contact",
    );
  });
});

describe("readOutcome — one row per answer in the contract", () => {
  it("shows the confirmation only on ok:true in the body", async () => {
    expect(await readOutcome(answer(200, { ok: true }))).toEqual({ kind: "ok" });
    // A 200 that does not SAY ok is not a confirmation we can show.
    expect(await readOutcome(answer(200, { ok: false }))).toEqual({
      kind: "failed",
      status: 200,
      code: "unexpected",
    });
    expect(await readOutcome(answer(200, "<html>ok</html>"))).toEqual({
      kind: "failed",
      status: 200,
      code: "unexpected",
    });
  });

  it.each(["name", "email", "message", "collaboration"] as const)(
    "puts a 400 %s on that field",
    async (field) => {
      expect(await readOutcome(answer(400, { ok: false, error: field }))).toEqual({
        kind: "field",
        field,
      });
    },
  );

  it("tells a failed security check apart", async () => {
    expect(await readOutcome(answer(400, { ok: false, error: "captcha" }))).toEqual({
      kind: "captcha",
    });
  });

  it("reads 429 as the rate limit, whatever the body says", async () => {
    expect(await readOutcome(answer(429, { ok: false, error: "rate_limited" }))).toEqual({
      kind: "rate_limited",
    });
    expect(await readOutcome(answer(429, "Too Many Requests"))).toEqual({ kind: "rate_limited" });
  });

  it.each([
    [403, "forbidden"],
    [400, "invalid_json"],
    [400, "invalid_request"],
    [500, "unavailable"],
  ])("fails on %i %s and keeps the code", async (status, code) => {
    expect(await readOutcome(answer(status, { ok: false, error: code }))).toEqual({
      kind: "failed",
      status,
      code,
    });
  });

  it("does not mistake a field code on another status for a field refusal", async () => {
    expect(await readOutcome(answer(500, { ok: false, error: "email" }))).toEqual({
      kind: "failed",
      status: 500,
      code: "email",
    });
  });

  it("reduces an off-contract error text to 'unexpected' so it cannot carry an address", async () => {
    // This code goes to Sentry. An upstream free-text field is exactly where a
    // submitter's address could ride along, so only the contract's own codes
    // pass — an exact list, because a shape check lets a name through.
    expect(await readOutcome(answer(500, { ok: false, error: "anna_de_vries" }))).toEqual({
      kind: "failed",
      status: 500,
      code: "unexpected",
    });
    expect(
      await readOutcome(answer(502, { ok: false, error: "delivery to anna@example.com failed" })),
    ).toEqual({ kind: "failed", status: 502, code: "unexpected" });
    expect(await readOutcome(answer(502, "<html>Bad gateway</html>"))).toEqual({
      kind: "failed",
      status: 502,
      code: "unexpected",
    });
  });

  it("counts an abort during the body of a 2xx as delivered", async () => {
    // The platform stores the message before it answers, and its only 2xx is
    // ok:true. Cutting off those bytes (dialog closed, our 10s timer) must not
    // tell the visitor a sent message failed, or leave it in the form for a
    // second send. Found in the T-83 review.
    const res = answer(200, { ok: true });
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.spyOn(res, "json").mockRejectedValue(abort);
    expect(await readOutcome(res)).toEqual({ kind: "ok" });
  });

  it("hands an abort during the body of anything else to the caller", async () => {
    // Only the caller knows whether the dialog closed or the timer fired.
    const res = answer(500, { ok: false, error: "unavailable" });
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.spyOn(res, "json").mockRejectedValue(abort);
    await expect(readOutcome(res)).rejects.toBe(abort);
  });
});

describe("what gets reported, and what never does", () => {
  it("reports a refusal outside the visitor's control, with status and code", () => {
    reportOutcome({ kind: "failed", status: 403, code: "forbidden" });
    expect(reported).toHaveBeenCalledWith("contact.platform_refused", {
      status: 403,
      errorCode: "forbidden",
    });
  });

  it("reports a captcha refusal, which is the only trace of a mismatched secret", () => {
    reportOutcome({ kind: "captcha" });
    expect(reported).toHaveBeenCalledWith("contact.platform_captcha_refused", { status: 400 });
  });

  it("never reports the visitor's own outcomes", () => {
    reportOutcome({ kind: "ok" });
    reportOutcome({ kind: "field", field: "email" });
    reportOutcome({ kind: "rate_limited" });
    expect(reported).not.toHaveBeenCalled();
  });

  it("reports an unreachable platform with a cause from a fixed vocabulary", () => {
    reportUnreachable(new TypeError("Failed to fetch"), false);
    expect(reported).toHaveBeenCalledWith("contact.platform_unreachable", { cause: "network" });
  });
});

describe("unreachableCause — never the error's message", () => {
  it("names our own timer, whatever the error says", () => {
    expect(unreachableCause(new DOMException("aborted", "AbortError"), true)).toBe("timeout");
  });

  it("calls every browser's network or CORS TypeError 'network'", () => {
    // Chrome says "Failed to fetch", Safari "Load failed", Firefox "NetworkError
    // when attempting to fetch resource." — the message adds nothing but risk.
    expect(unreachableCause(new TypeError("Failed to fetch"), false)).toBe("network");
    expect(unreachableCause(new TypeError("Load failed"), false)).toBe("network");
  });

  it("keeps only a plain error name, and drops any message text", () => {
    const leaky = Object.assign(new Error("could not send for anna@example.com"), {
      name: "SecurityError",
    });
    expect(unreachableCause(leaky, false)).toBe("error:SecurityError");
    expect(unreachableCause({ name: "anna@example.com" }, false)).toBe("error");
    expect(unreachableCause("a thrown string", false)).toBe("error");
    expect(unreachableCause(null, false)).toBe("error");
  });
});

describe("formActionFor — the form's half of the contract's table", () => {
  const CONTACT = ["name", "email", "message"] as const;
  const CREATOR = ["name", "email", "message", "collaboration"] as const;

  it("shows the confirmation only on ok", () => {
    expect(formActionFor({ kind: "ok" }, CONTACT)).toEqual({ type: "success" });
    const others: ContactOutcome[] = [
      { kind: "field", field: "email" },
      { kind: "captcha" },
      { kind: "rate_limited" },
      { kind: "failed", status: 500, code: "unavailable" },
    ];
    for (const outcome of others) {
      expect(formActionFor(outcome, CONTACT).type).not.toBe("success");
    }
  });

  it("puts a field refusal on a field the form has", () => {
    expect(formActionFor({ kind: "field", field: "message" }, CONTACT)).toEqual({
      type: "field",
      field: "message",
    });
    expect(formActionFor({ kind: "field", field: "collaboration" }, CREATOR)).toEqual({
      type: "field",
      field: "collaboration",
    });
  });

  it("shows the generic banner for a field this form does not have", () => {
    // collaboration on the contact form can only be a client out of step with
    // the contract; there is no field to put it on.
    expect(formActionFor({ kind: "field", field: "collaboration" }, CONTACT)).toEqual({
      type: "banner",
      kind: "generic",
    });
  });

  it("picks the captcha, rate-limit and generic banners", () => {
    expect(formActionFor({ kind: "captcha" }, CONTACT)).toEqual({ type: "banner", kind: "captcha" });
    expect(formActionFor({ kind: "rate_limited" }, CONTACT)).toEqual({
      type: "banner",
      kind: "rate_limited",
    });
    expect(formActionFor({ kind: "failed", status: 403, code: "forbidden" }, CREATOR)).toEqual({
      type: "banner",
      kind: "generic",
    });
  });
});

describe("submitWebsiteForm", () => {
  it("POSTs the fields as JSON to the entry and returns the classified answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    const outcome = await submitWebsiteForm({ ...PAYLOAD, kind: "creator", channels: ["TikTok"] }, signal);

    expect(outcome).toEqual({ kind: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBSITE_CONTACT_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.signal).toBe(signal);
    expect(JSON.parse(init.body)).toEqual({ ...PAYLOAD, kind: "creator", channels: ["TikTok"] });
    expect(reported).not.toHaveBeenCalled();
  });

  it("reports and returns a refusal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(500, { ok: false, error: "unavailable" })));
    const outcome = await submitWebsiteForm(PAYLOAD, new AbortController().signal);
    expect(outcome).toEqual({ kind: "failed", status: 500, code: "unavailable" });
    expect(reported).toHaveBeenCalledWith("contact.platform_refused", {
      status: 500,
      errorCode: "unavailable",
    });
  });

  it("lets a rejected fetch through, so the caller can tell a close from a timeout", async () => {
    const cors = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cors));
    await expect(submitWebsiteForm(PAYLOAD, new AbortController().signal)).rejects.toBe(cors);
    // Not reported here: an abort from a closing dialog is not a failure.
    expect(reported).not.toHaveBeenCalled();
  });
});
