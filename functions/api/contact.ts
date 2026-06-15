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
}

interface PagesContext {
  request: Request;
  env: Env;
}

const MAX = { name: 100, email: 200, message: 5000 };
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

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  if (!name || name.length > MAX.name) return json({ ok: false, error: "name" }, 400);
  if (!email || email.length > MAX.email || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "email" }, 400);
  }
  if (!message || message.length > MAX.message) return json({ ok: false, error: "message" }, 400);

  const token = env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    // Misconfiguration — surface clearly so an unset Preview/Prod secret is
    // obvious during verification rather than failing silently.
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const to = env.CONTACT_TO || "support@letsdog.nl";
  const from = env.CONTACT_FROM || "noreply@letsdog.nl";

  // Support notification — unchanged. This is the source of truth: the team must
  // receive every submission.
  const supportText =
    `Nieuw contactbericht via de website\n\n` +
    `Naam: ${name}\n` +
    `E-mail: ${email}\n\n` +
    `Bericht:\n${message}\n`;

  const supportHtml =
    `<h2>Nieuw contactbericht via de website</h2>` +
    `<p><strong>Naam:</strong> ${escapeHtml(name)}<br>` +
    `<strong>E-mail:</strong> ${escapeHtml(email)}</p>` +
    `<p><strong>Bericht:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  // Customer confirmation — a copy of their own message back to the submitter.
  // Dutch, on-brand (lowercase "Let's dog"), plain-text + HTML. Best-effort: a
  // bounced confirmation must never regress the support send (see batch handling).
  const customerSubject = "We hebben je bericht ontvangen";

  const customerText =
    `Hoi ${name},\n\n` +
    `Bedankt voor je bericht. We hebben het goed ontvangen en je hoort binnen ` +
    `1 werkdag van ons. Hieronder staat een kopie van wat je ons stuurde.\n\n` +
    `Jouw bericht:\n${message}\n\n` +
    `Tot snel,\n` +
    `Team Let's dog\n\n` +
    `Je ontvangt deze e-mail omdat je het contactformulier op letsdog.nl hebt ingevuld.\n` +
    `Let's dog BV · Naarderstraat 317 · 1272 NK Huizen · Nederland\n`;

  const customerHtml =
    `<div style="background:#EFE8E4;padding:24px 0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">` +
      `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">` +
        `<div style="background:#75876D;padding:22px 28px;">` +
          // Logo as an image with the wordmark as alt-text fallback (email clients
          // strip SVG, so this is a committed PNG served from the canonical apex;
          // the alt inherits the white/bold styling when images are blocked).
          `<img src="https://letsdog.nl/images/logo-white.png" alt="Let's dog" width="130" height="38" style="display:block;border:0;line-height:1;width:130px;height:auto;color:#ffffff;font-size:20px;font-weight:600;" />` +
        `</div>` +
        `<div style="padding:28px;color:#141414;">` +
          `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hoi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Bedankt voor je bericht. We hebben het goed ontvangen en je hoort binnen 1 werkdag van ons. Hieronder staat een kopie van wat je ons stuurde.</p>` +
          `<div style="background:#EFE8E4;border-radius:8px;padding:16px 18px;margin:0 0 20px;">` +
            `<div style="color:#75876D;font-size:12px;font-weight:600;margin-bottom:8px;">Jouw bericht</div>` +
            `<div style="color:#141414;font-size:15px;line-height:1.7;">${escapeHtml(message).replace(/\n/g, "<br>")}</div>` +
          `</div>` +
          `<p style="margin:0;font-size:16px;line-height:1.7;">Tot snel,<br>Team Let's dog</p>` +
        `</div>` +
        `<div style="background:#162A0E;padding:20px 28px;">` +
          `<p style="margin:0 0 6px;color:rgba(255,255,255,0.65);font-size:12px;line-height:1.6;">Je ontvangt deze e-mail omdat je het contactformulier op letsdog.nl hebt ingevuld.</p>` +
          `<p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">Let's dog BV · Naarderstraat 317 · 1272 NK Huizen · Nederland</p>` +
        `</div>` +
      `</div>` +
    `</div>`;

  // Both emails go in ONE Postmark batch call, ordered [support, customer]. The
  // customer From carries a display name for inbox trust; ReplyTo points back at
  // the support inbox so a reply reaches a human.
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
          Subject: `Nieuw contactbericht via de website — ${name}`,
          TextBody: supportText,
          HtmlBody: supportHtml,
          MessageStream: "outbound",
        },
        {
          From: `"Let's dog" <${from}>`,
          To: email,
          ReplyTo: to,
          Subject: customerSubject,
          TextBody: customerText,
          HtmlBody: customerHtml,
          MessageStream: "outbound",
        },
      ]),
    });
  } catch {
    return json({ ok: false, error: "send_failed" }, 502);
  }

  // A non-2xx means Postmark rejected the whole batch (auth/payload) — nothing sent.
  if (!postmarkRes.ok) {
    return json({ ok: false, error: "send_failed" }, 502);
  }

  // /email/batch returns 200 with a per-message result array in request order.
  // Regress to 502 ONLY on a positively-identified support failure (index 0). An
  // unparseable body falls back to trusting the 2xx (the pre-batch posture), so a
  // response quirk never drops a message the team actually received. The customer
  // result (index 1) is intentionally ignored — a bounced confirmation is fine.
  try {
    const results = (await postmarkRes.json()) as Array<{ ErrorCode?: number }>;
    const supportResult = Array.isArray(results) ? results[0] : undefined;
    if (supportResult && supportResult.ErrorCode !== undefined && supportResult.ErrorCode !== 0) {
      return json({ ok: false, error: "send_failed" }, 502);
    }
  } catch {
    // Unparseable 200 body — trust it.
  }

  return json({ ok: true });
}
