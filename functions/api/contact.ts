// Cloudflare Pages Function — POST /api/contact
//
// The FIRST server-side code in this otherwise-static export. It relays the
// contact-form submission to Postmark in ONE batch call that sends two emails:
// the support notification (support@letsdog.nl) and a best-effort confirmation
// copy back to the submitter. The Postmark token lives ONLY here (Function env
// via context.env) and never reaches the client bundle.
//
// Runtime: Cloudflare Workers — web-standard Request/Response/fetch only, no
// Node APIs, no npm deps. Typed locally (no @cloudflare/workers-types) so
// `next build` (which typechecks **/*.ts) stays clean.
//
// NOTE: `next dev` does NOT execute this directory, so /api/contact 404s
// locally. Verify the real send on the Cloudflare branch-preview deploy after
// POSTMARK_SERVER_TOKEN is set (Preview scope). See
// docs/plans/2026-05-31-002-feat-contact-page-redesign-plan.md.

interface Env {
  POSTMARK_SERVER_TOKEN?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  CREATORS_TO?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const MAX = { name: 100, email: 200, message: 5000 };

// Creator-application extras (kind: "creator"). Every one of these is optional
// except `collaboration`, and all are attacker-controlled, so each is capped and
// — apart from `about`, which stays multi-line like `message` — collapsed to a
// single line before it can reach a Subject or a plain-text field label.
const CREATOR_MAX = { collaboration: 40, channels: 120, profile: 300, reach: 60, camera: 40 };

// Closed sets: the form's selects and checkboxes only ever submit these. Anything
// else is a hand-crafted payload, so reject rather than forward it into an email.
const COLLABORATION = ["ambassador", "ugc", "both", "unsure"] as const;
const CHANNELS = ["Instagram", "TikTok", "YouTube", "Facebook", "Overig"] as const;

const COLLABORATION_LABEL: Record<string, string> = {
  ambassador: "Als ambassadeur: ontvangt een persoonlijke code om te delen",
  ugc: "Als UGC-maker: maakt content voor Let's dog",
  both: "Allebei",
  unsure: "Weet het nog niet, wil meer horen",
};

/** Trim, collapse any CR/LF run to a space, and cap. Use for every single-line
 *  field that can reach a Subject, a header, or a `Label: value` line. */
function singleLine(value: unknown, max: number): string {
  return (typeof value === "string" ? value.trim() : "").replace(/[\r\n]+/g, " ").slice(0, max);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Cloudflare's always-passes TEST secret — used on non-production hosts when the
// real secret is unset, so dev/preview run the full check without real keys.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

// The production Pages alias. It is a live, publicly-reachable surface serving
// real pre-cutover production traffic (alongside the apex/www in
// lib/prod-hosts.ts PROD_HOSTS), so it must stay ENFORCED — never demoted to the
// always-pass test secret.
const PROD_PAGES_ALIAS = "website-letsdog.pages.dev";

// Fail-closed host posture (#8). The always-pass TEST-secret fallback is allowed
// ONLY on hosts that can never serve real traffic: localhost and *branch* previews
// (<branch>.website-letsdog.pages.dev). EVERY other host — the apex, www, and the
// production Pages alias above — requires a real TURNSTILE_SECRET_KEY and fails
// closed (500) if it is unset, so a forgotten prod secret can never silently
// disable Turnstile. A bare `*.pages.dev` wildcard must NOT be used here: it would
// match PROD_PAGES_ALIAS and demote the live deployment. Exported for unit tests.
export function isPreviewOrLocalHost(hostname: string): boolean {
  if (hostname === "localhost") return true;
  return hostname.endsWith(".pages.dev") && hostname !== PROD_PAGES_ALIAS;
}

// Verify a Turnstile token against Cloudflare's siteverify endpoint. Returns
// false on any failure (network, timeout, non-2xx, success:false) so the caller
// fails closed — a missing or invalid token never sends mail.
async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Fail closed if siteverify hangs — a stalled upstream must not tie up the
      // Worker invocation until the platform limit.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[contact] turnstile siteverify non-2xx", res.status);
      return false;
    }
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // Network error, timeout/abort, or unparseable body — all fail closed. A
    // normal success:false (bad-token) rejection does NOT reach here, so this log
    // marks an actual siteverify infrastructure problem, not bot traffic.
    console.error("[contact] turnstile siteverify failed", String(err));
    return false;
  }
}

// Only POST is exported, so Cloudflare auto-returns 405 for other methods.
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // Honeypot: real users never fill `company`. If filled, feign success and
  // send nothing — bots get no signal that they were dropped.
  const honeypot = typeof data.company === "string" ? data.company.trim() : "";
  if (honeypot) return json({ ok: true });

  // Collapse any CR/LF run in `name` to a single space at the source so it can
  // never be used for field-injection: `name` is interpolated UNESCAPED into the
  // plain-text support body and the support email Subject, where an embedded
  // newline could forge extra fields. (`email` is already whitespace-free via
  // EMAIL_RE; `message` stays multi-line by design and is escaped/quoted wherever
  // it is shown.)
  const name = (typeof data.name === "string" ? data.name.trim() : "").replace(/[\r\n]+/g, " ");
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  // Two submission kinds share this endpoint: the contact form and the /partners
  // creator application. They differ only in which fields are required and what
  // the two emails say — everything security-critical below (honeypot, Turnstile,
  // fail-closed secrets, Postmark batch, support-confirmation) is deliberately
  // shared rather than duplicated into a second Function.
  const isCreator = data.kind === "creator";

  if (!name || name.length > MAX.name) return json({ ok: false, error: "name" }, 400);
  if (!email || email.length > MAX.email || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "email" }, 400);
  }
  // The creator form's free-text field is optional — its required field is the
  // collaboration type instead. The contact form still requires a message.
  if (!isCreator && (!message || message.length > MAX.message)) {
    return json({ ok: false, error: "message" }, 400);
  }
  if (isCreator && message.length > MAX.message) {
    return json({ ok: false, error: "message" }, 400);
  }

  const collaboration = singleLine(data.collaboration, CREATOR_MAX.collaboration);
  const profile = singleLine(data.profile, CREATOR_MAX.profile);
  const reach = singleLine(data.reach, CREATOR_MAX.reach);
  const camera = singleLine(data.camera, CREATOR_MAX.camera);
  // Only keep values from the closed set, so a hand-crafted payload can't inject
  // arbitrary text into the notification through the channel list.
  const channels = Array.isArray(data.channels)
    ? data.channels
        .filter((c): c is string => typeof c === "string")
        .filter((c) => (CHANNELS as readonly string[]).includes(c))
        .join(", ")
        .slice(0, CREATOR_MAX.channels)
    : "";

  if (isCreator && !(COLLABORATION as readonly string[]).includes(collaboration)) {
    return json({ ok: false, error: "collaboration" }, 400);
  }

  // Turnstile: confirm the visitor is human before sending anything. Always on —
  // a missing/invalid token (or a verify failure) returns 400 and sends no mail.
  // A real secret is required on every production-reachable host; the always-pass
  // TEST-secret fallback is allowed ONLY on previews/localhost (see
  // isPreviewOrLocalHost), so a forgotten prod secret fails closed (500) instead
  // of silently disabling the gate.
  const turnstileToken = typeof data.turnstileToken === "string" ? data.turnstileToken : "";
  const hostname = new URL(request.url).hostname;
  const turnstileSecret =
    env.TURNSTILE_SECRET_KEY || (isPreviewOrLocalHost(hostname) ? TURNSTILE_TEST_SECRET : "");
  if (!turnstileSecret) {
    console.error("[contact] turnstile secret missing on enforced host", hostname);
    return json({ ok: false, error: "server_not_configured" }, 500);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (!(await verifyTurnstile(turnstileToken, turnstileSecret, ip))) {
    return json({ ok: false, error: "captcha" }, 400);
  }

  const token = env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    // Misconfiguration — surface clearly so an unset Preview/Prod secret is
    // obvious during verification rather than failing silently.
    console.error("[contact] postmark token missing");
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  // Creator applications go to their own inbox; everything else to support.
  const to = isCreator
    ? env.CREATORS_TO || "creators@letsdog.nl"
    : env.CONTACT_TO || "support@letsdog.nl";
  const from = env.CONTACT_FROM || "noreply@letsdog.nl";

  // Optional creator rows are omitted entirely when empty, so the notification
  // stays readable instead of carrying a column of blanks.
  const creatorRow = (label: string, value: string) => (value ? `${label}: ${value}\n` : "");
  const creatorRowHtml = (label: string, value: string) =>
    value ? `<strong>${label}:</strong> ${escapeHtml(value)}<br>` : "";

  // Support notification — the source of truth: the team must receive every
  // submission, with the full free-text intact.
  const supportSubject = isCreator
    ? `Nieuwe creator-aanmelding via de website — ${name}`
    : `Nieuw contactbericht via de website — ${name}`;

  const supportText = isCreator
    ? `Nieuwe creator-aanmelding via de website\n\n` +
      `Naam: ${name}\n` +
      `E-mail: ${email}\n` +
      `Samenwerking: ${COLLABORATION_LABEL[collaboration] ?? collaboration}\n` +
      creatorRow("Kanalen", channels) +
      creatorRow("Profiel", profile) +
      creatorRow("Bereik", reach) +
      creatorRow("Zelf in beeld", camera) +
      (message ? `\nOver zichzelf:\n${message}\n` : "")
    : `Nieuw contactbericht via de website\n\n` +
      `Naam: ${name}\n` +
      `E-mail: ${email}\n\n` +
      `Bericht:\n${message}\n`;

  const supportHtml = isCreator
    ? `<h2>Nieuwe creator-aanmelding via de website</h2>` +
      `<p><strong>Naam:</strong> ${escapeHtml(name)}<br>` +
      `<strong>E-mail:</strong> ${escapeHtml(email)}<br>` +
      `<strong>Samenwerking:</strong> ${escapeHtml(COLLABORATION_LABEL[collaboration] ?? collaboration)}<br>` +
      creatorRowHtml("Kanalen", channels) +
      creatorRowHtml("Profiel", profile) +
      creatorRowHtml("Bereik", reach) +
      creatorRowHtml("Zelf in beeld", camera) +
      `</p>` +
      (message
        ? `<p><strong>Over zichzelf:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`
        : "")
    : `<h2>Nieuw contactbericht via de website</h2>` +
      `<p><strong>Naam:</strong> ${escapeHtml(name)}<br>` +
      `<strong>E-mail:</strong> ${escapeHtml(email)}</p>` +
      `<p><strong>Bericht:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  // Customer confirmation — a NEUTRAL acknowledgement back to the submitter. It
  // deliberately does NOT echo the submitted message: the recipient (To) is
  // user-supplied, so replaying user-supplied content from our verified sender
  // would turn this into a branded-email amplification / phishing vector (#1).
  // Dutch, on-brand (lowercase "Let's dog"), plain-text + HTML. Best-effort: a
  // bounced confirmation must never regress the support send (see batch handling).
  const customerSubject = isCreator
    ? "We hebben je aanmelding ontvangen"
    : "We hebben je bericht ontvangen";

  // The greeting still personalizes with the visitor's name, but capped at 20
  // chars: enough for a real first name, while bounding how much attacker-controlled
  // text can ride along in this branded email to a user-supplied recipient
  // (defense-in-depth alongside the removed message echo, #1). The support email
  // keeps the full name.
  const greetingName = name.slice(0, 20).trimEnd();

  const customerBody = isCreator
    ? `Bedankt voor je aanmelding. We hebben hem goed ontvangen en nemen binnen ` +
      `drie werkdagen persoonlijk contact met je op.`
    : `Bedankt voor je bericht. We hebben het goed ontvangen en je hoort binnen ` +
      `1 werkdag van ons.`;

  const customerReason = isCreator
    ? `Je ontvangt deze e-mail omdat je je hebt aangemeld als creator op letsdog.nl.`
    : `Je ontvangt deze e-mail omdat je het contactformulier op letsdog.nl hebt ingevuld.`;

  const customerText =
    `Hoi ${greetingName},\n\n` +
    `${customerBody}\n\n` +
    `Tot snel,\n` +
    `Elien\n\n` +
    `${customerReason}\n` +
    `Let's dog BV · Naarderstraat 317 · 1272 NK Huizen · Nederland\n`;

  // The header logo is an <img> with the wordmark as alt-text fallback (email
  // clients strip SVG, so this is a committed PNG). Serve it from the origin that
  // handled this request — the same deploy that hosts the form — so it resolves
  // in every environment (preview, production, post-cutover apex) rather than a
  // hardcoded host. The alt inherits the white/bold styling when images are off.
  const logoOrigin = new URL(request.url).origin;

  const customerHtml =
    `<div style="background:#EFE8E4;padding:24px 0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">` +
      `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">` +
        `<div style="background:#75876D;padding:22px 28px;">` +
          `<img src="${logoOrigin}/images/logo-white.png" alt="Let's dog" width="130" height="38" style="display:block;border:0;line-height:1;width:130px;height:auto;color:#ffffff;font-size:20px;font-weight:600;" />` +
        `</div>` +
        `<div style="padding:28px;color:#141414;">` +
          `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hoi ${escapeHtml(greetingName)},</p>` +
          `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${customerBody}</p>` +
          `<p style="margin:0;font-size:16px;line-height:1.7;">Tot snel,<br>Elien</p>` +
        `</div>` +
        `<div style="background:#162A0E;padding:20px 28px;">` +
          `<p style="margin:0 0 6px;color:rgba(255,255,255,0.65);font-size:12px;line-height:1.6;">${customerReason}</p>` +
          `<p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">Let's dog BV · Naarderstraat 317 · 1272 NK Huizen · Nederland</p>` +
        `</div>` +
      `</div>` +
    `</div>`;

  // Both emails go in ONE Postmark batch call, ordered [support, customer]. The
  // customer confirmation is sent as "Elien van Let's dog" from the support
  // address (so a reply reaches a human) — that address must be a verified
  // Postmark sender.
  let postmarkRes: Response;
  try {
    postmarkRes = await fetch("https://api.postmarkapp.com/email/batch", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify([
        {
          From: from,
          To: to,
          ReplyTo: email,
          Subject: supportSubject,
          TextBody: supportText,
          HtmlBody: supportHtml,
          MessageStream: "outbound",
        },
        {
          From: `"Elien van Let's dog" <${to}>`,
          To: email,
          ReplyTo: to,
          Subject: customerSubject,
          TextBody: customerText,
          HtmlBody: customerHtml,
          MessageStream: "outbound",
        },
      ]),
      // Fail closed if Postmark hangs — a stalled upstream must not tie up the
      // Worker invocation until the platform limit.
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error("[contact] postmark batch fetch failed", String(err));
    return json({ ok: false, error: "send_failed" }, 502);
  }

  // A non-2xx means Postmark rejected the whole batch (auth/payload) — nothing sent.
  if (!postmarkRes.ok) {
    console.error("[contact] postmark batch non-2xx", postmarkRes.status);
    return json({ ok: false, error: "send_failed" }, 502);
  }

  // /email/batch returns 200 with a per-message result array in request order.
  // Positively confirm the support notification (index 0) succeeded: only an
  // array whose first element has ErrorCode 0 counts as ok. Anything else — a
  // non-zero ErrorCode, a short/non-array body, or an unparseable body — is
  // treated as a support failure (502), so we never report ok to the user
  // without confirming the team received the message. The customer result
  // (index 1) is intentionally ignored — a bounced confirmation is fine.
  let supportOk = false;
  try {
    const results = (await postmarkRes.json()) as Array<{ ErrorCode?: number; Message?: string }>;
    supportOk = Array.isArray(results) && results[0]?.ErrorCode === 0;
    if (!supportOk) {
      console.error(
        "[contact] postmark support message not accepted",
        results?.[0]?.ErrorCode,
        results?.[0]?.Message,
      );
    }
  } catch (err) {
    // Either a malformed/non-JSON 200 body, or AbortSignal.timeout firing during
    // the body read (headers arrived, body then stalled) — both fail closed. The
    // label covers both so ops triage isn't sent chasing a malformed body when the
    // real cause was a timeout (String(err) carries the actual SyntaxError/TimeoutError).
    console.error("[contact] postmark batch result unreadable (parse or timeout)", String(err));
    supportOk = false;
  }

  if (!supportOk) {
    return json({ ok: false, error: "send_failed" }, 502);
  }

  return json({ ok: true });
}
