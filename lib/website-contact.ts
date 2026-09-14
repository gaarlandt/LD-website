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
   * Anything else: 400 `invalid_json`/`invalid_request` (a client that sent
   * what the contract does not describe — that client is us), 500
   * `unavailable`, 403 `forbidden`, or a status or body the contract does not
   * name at all. (A browser never sees the 403 in practice: an Origin the
   * platform does not allow already fails the CORS preflight, so fetch rejects
   * and the report is contact.platform_unreachable. Only a non-browser caller
   * reaches that row.)
   */
  | { kind: "failed"; status: number; code: string };

const FIELD_CODES: readonly string[] = ["name", "email", "message", "collaboration"];

// Every `error` the contract names. `code` goes to Sentry as a measurement, so
// anything outside this list — a gateway's HTML, a code we never agreed on,
// a snake_case word that happens to be a name — is reported as "unexpected"
// rather than forwarded. An exact list, not a shape: a shape check would let
// `anna_de_vries` through, and the sink is ungated.
const CONTRACT_CODES: readonly string[] = [
  ...FIELD_CODES,
  "captcha",
  "invalid_json",
  "invalid_request",
  "forbidden",
  "rate_limited",
  "unavailable",
];

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

/**
 * Map one answer onto what the form does with it. Throws only on an abort, and
 * only when the answer was not a 2xx.
 *
 * AN ABORT DURING THE BODY OF A 2XX IS A DELIVERED MESSAGE. The platform stores
 * the message before it answers, and its only 2xx is `{ ok: true }` — so once
 * the status says 2xx, cutting off the eleven bytes after it (the dialog
 * closing, our 10s timer) does not undo anything. Treating it as a failure
 * would tell the visitor a sent message failed, keep it in the form for a
 * second send, and file a false contact.platform_unreachable. Found in review
 * (2026-09-14): the retired Function's client never read the body on success,
 * so this window did not exist before.
 */
export async function readOutcome(res: Response): Promise<ContactOutcome> {
  let body: { ok?: unknown; error?: unknown };
  try {
    body = await readBody(res);
  } catch (err) {
    if (res.ok) return { kind: "ok" };
    throw err;
  }
  // `ok` in the BODY, not the status alone: the contract says to read it, and a
  // 200 that does not say ok:true is not a confirmation we can show.
  if (res.ok && body.ok === true) return { kind: "ok" };

  const code = typeof body.error === "string" ? body.error : "";
  if (res.status === 400 && FIELD_CODES.includes(code)) {
    return { kind: "field", field: code as FieldCode };
  }
  if (res.status === 400 && code === "captcha") return { kind: "captcha" };
  if (res.status === 429) return { kind: "rate_limited" };
  return {
    kind: "failed",
    status: res.status,
    code: CONTRACT_CODES.includes(code) ? code : "unexpected",
  };
}

/** Which banner an unsuccessful answer shows. The copy per kind is the form's own. */
export type ErrorKind = "generic" | "captcha" | "rate_limited";

/** What a form does with an answer: its whole half of the contract's table. */
export type FormAction<F extends FieldCode = FieldCode> =
  | { type: "success" }
  | { type: "field"; field: F }
  | { type: "banner"; kind: ErrorKind };

function isOneOf<F extends string>(value: string, set: readonly F[]): value is F {
  return (set as readonly string[]).includes(value);
}

/**
 * One answer, as the form must act on it. Shared by both modals so the table
 * lives in one place and under a test (lib/website-contact.test.ts); the modals
 * only render. `fields` are the fields THIS form has: a field refusal for one
 * it does not show (collaboration on the contact form) can only be a client
 * out of step with the contract, so it gets the generic banner.
 *
 * Every action except `success` also means: reset the Turnstile widget. The
 * contract says a token is spent after any refusal, and a stale token is the
 * one input the visitor cannot fix.
 */
export function formActionFor<F extends FieldCode>(
  outcome: ContactOutcome,
  fields: readonly F[],
): FormAction<F> {
  switch (outcome.kind) {
    case "ok":
      return { type: "success" };
    case "field":
      return isOneOf(outcome.field, fields)
        ? { type: "field", field: outcome.field }
        : { type: "banner", kind: "generic" };
    case "captcha":
      return { type: "banner", kind: "captcha" };
    case "rate_limited":
      return { type: "banner", kind: "rate_limited" };
    case "failed":
      return { type: "banner", kind: "generic" };
  }
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
 * The `cause` of an unreachable platform, from a FIXED vocabulary: "timeout"
 * when our own timer fired, "network" for the TypeError every browser throws
 * on a network or CORS refusal, and `error:<Name>` for anything else. Never the
 * error's message: the sink is ungated, the message is text we do not control
 * (an extension, a service worker), and the name alone says which branch broke.
 */
export function unreachableCause(err: unknown, timedOut: boolean): string {
  if (timedOut) return "timeout";
  if (err instanceof TypeError) return "network";
  const name = (err as { name?: unknown } | null)?.name;
  return typeof name === "string" && /^[A-Za-z]{1,40}$/.test(name) ? `error:${name}` : "error";
}

/**
 * The request never got an answer: a network error, a CORS refusal (including
 * an Origin missing from the platform's list — see ContactOutcome), or our own
 * timeout. The one failure the platform cannot see at all, because nothing
 * arrived — so this side is the only witness.
 */
export function reportUnreachable(err: unknown, timedOut: boolean): void {
  reportRuleBreach("contact.platform_unreachable", { cause: unreachableCause(err, timedOut) });
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
