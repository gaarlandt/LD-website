// The round trip of the site's two forms — the contact modal and the /partners
// creator modal — to the platform's entry `submit-website-contact` (T-83,
// executing LDplatform D-355 / D-444, built there as PF T-1320).
//
// THE CONTRACT IS NOT OURS. The URL, the fields and their closed sets, the
// answers and the rate limits are owned by the platform and written down in the
// knowledge hub: `contracts/websiteformulier-ingang.md`. This site owns the form,
// the Turnstile widget, and what it DOES with each answer. A change to a field
// or a set is reported to the platform FIRST — its validator is stricter than
// ours and silently drops what it does not know (a channel outside the set, for
// one), so drift here fails quietly rather than loudly.
//
// WHY THE BROWSER POSTS DIRECTLY AND NOTHING PROXIES IT. Until 2026-09-14 a
// Cloudflare Pages Function (`functions/api/contact.ts`) received the form and
// mailed it through Postmark. Putting that Function in front of the platform
// would have been the smaller diff and the wrong one: the platform verifies the
// Turnstile token against the visitor's IP (`CF-Connecting-IP`) and rate-limits
// per IP in the database — behind a proxy both would see ONE address, ours, and
// twenty messages an hour from the whole site would trip the limit. The platform
// answers CORS for letsdog.nl and www.letsdog.nl only (measured 2026-09-14:
// preflight 204 with the Origin echoed and `content-type` allowed; a foreign
// Origin gets 403). A branch preview is not on that list, and its always-pass
// test token would fail the real secret anyway, so the form cannot deliver from
// a preview: that is by design, and the real submission is measured on the apex.
//
// Pure apart from `fetch` and the error sink, so the answer table below is
// unit-tested in the Node environment (lib/website-contact.test.ts).

import { reportRuleBreach } from "./error-sink";

export const WEBSITE_CONTACT_URL =
  "https://adzrridmqfoemturcepf.supabase.co/functions/v1/submit-website-contact";

/** The fields the platform reads — the same the retired Pages Function read. */
export type WebsiteFormPayload = {
  /** `"creator"` for the /partners application; absent means a contact message. */
  kind?: "creator";
  name: string;
  email: string;
  message: string;
  /** The honeypot. Filled in = the platform answers ok and does nothing. */
  company: string;
  turnstileToken: string;
  collaboration?: string;
  channels?: string[];
  profile?: string;
  reach?: string;
  camera?: string;
};

export type FieldCode = "name" | "email" | "message" | "collaboration";

export type ContactOutcome =
  /** 200 `{ ok: true }` — show the confirmation. */
  | { kind: "ok" }
  /** 400 on one field — show it there. */
  | { kind: "field"; field: FieldCode }
  /** 400 `captcha` — say so and get a fresh token. */
  | { kind: "captcha" }
  /** 429 — "try again later". */
  | { kind: "rate_limited" }
  /**
   * Anything else: 403 `forbidden` (an Origin the platform does not allow),
   * 400 `invalid_json`/`invalid_request` (a client that sent what the contract
   * does not describe — that client is us), 500 `unavailable`, or a status or
   * body the contract does not name at all.
   */
  | { kind: "failed"; status: number; code: string };

const FIELD_CODES: readonly string[] = ["name", "email", "message", "collaboration"];

// The platform's codes are a closed set of snake_case words. Anything else in
// `error` — a gateway's HTML, a message we never agreed on — is summarised as
// "unexpected" rather than forwarded: it goes to Sentry, and an upstream
// free-text field is exactly where a submitter's address could ride along.
const CODE_SHAPE = /^[a-z_]{1,40}$/;

async function readBody(res: Response): Promise<{ ok?: unknown; error?: unknown }> {
  try {
    const data: unknown = await res.json();
    return typeof data === "object" && data !== null ? data : {};
  } catch (err) {
    // An abort while the body is still arriving is not an answer: the dialog
    // closed, or our timeout fired. Hand it to the caller, which knows which of
    // the two it was — swallowing it here would report a closed dialog as a
    // platform refusal.
    if ((err as { name?: unknown } | null)?.name === "AbortError") throw err;
    // A 5xx from a gateway can carry an HTML page; res.json() throws on it.
    return {};
  }
}

/** Map one answer onto what the form does with it. Throws only on an abort. */
export async function readOutcome(res: Response): Promise<ContactOutcome> {
  const body = await readBody(res);
  // `ok` in the BODY, not the status alone: the contract says to read it, and a
  // 200 that does not say ok:true is not a confirmation we can show.
  if (res.ok && body.ok === true) return { kind: "ok" };

  const code = typeof body.error === "string" ? body.error : "";
  if (res.status === 400 && FIELD_CODES.includes(code)) {
    return { kind: "field", field: code as FieldCode };
  }
  if (res.status === 400 && code === "captcha") return { kind: "captcha" };
  if (res.status === 429) return { kind: "rate_limited" };
  return { kind: "failed", status: res.status, code: CODE_SHAPE.test(code) ? code : "unexpected" };
}

/**
 * Report the answers that mean something is broken on OUR side of the line, or
 * between the two sides — never the visitor's own mistakes (a field, a limit).
 *
 * `captcha` is reported, as a warning, and on purpose. One is a visitor who
 * failed the check. A run of them is the failure nobody else can see: a
 * `WEBSITE_TURNSTILE_SECRET_KEY` on the platform that does not belong to this
 * site's widget turns EVERY submission into a captcha refusal, and the platform
 * does not report an invalid secret separately (PF T-1320, "niet gemeten").
 */
export function reportOutcome(outcome: ContactOutcome): void {
  if (outcome.kind === "failed") {
    reportRuleBreach("contact.platform_refused", {
      status: outcome.status,
      errorCode: outcome.code,
    });
  } else if (outcome.kind === "captcha") {
    reportRuleBreach("contact.platform_captcha_refused", { status: 400 });
  }
}

/**
 * The request never got an answer: a network error, a CORS refusal, or our own
 * timeout. The one failure the platform cannot see at all, because nothing
 * arrived — so this side is the only witness. `cause` is `String(err)` for a
 * throw (a CORS refusal reads as a bare "TypeError: Failed to fetch") or
 * "timeout" when our AbortController fired.
 */
export function reportUnreachable(cause: string): void {
  reportRuleBreach("contact.platform_unreachable", { cause });
}

/**
 * POST one form to the platform and classify the answer. A fetch that REJECTS
 * (network, CORS, abort) propagates: only the caller knows whether an abort was
 * its own timeout or the dialog closing, and those two are reported differently.
 */
export async function submitWebsiteForm(
  payload: WebsiteFormPayload,
  signal: AbortSignal,
): Promise<ContactOutcome> {
  const res = await fetch(WEBSITE_CONTACT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const outcome = await readOutcome(res);
  reportOutcome(outcome);
  return outcome;
}
