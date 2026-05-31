// Cloudflare Pages Function — POST /api/contact
//
// The FIRST server-side code in this otherwise-static export. It relays the
// contact-form submission to Postmark, which emails support@letsdog.nl. The
// Postmark token lives ONLY here (Function env via context.env) and never
// reaches the client bundle.
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

  const textBody =
    `Nieuw contactbericht via de website\n\n` +
    `Naam: ${name}\n` +
    `E-mail: ${email}\n\n` +
    `Bericht:\n${message}\n`;

  const htmlBody =
    `<h2>Nieuw contactbericht via de website</h2>` +
    `<p><strong>Naam:</strong> ${escapeHtml(name)}<br>` +
    `<strong>E-mail:</strong> ${escapeHtml(email)}</p>` +
    `<p><strong>Bericht:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  let postmarkRes: Response;
  try {
    postmarkRes = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: to,
        ReplyTo: email,
        Subject: `Nieuw contactbericht via de website — ${name}`,
        TextBody: textBody,
        HtmlBody: htmlBody,
        MessageStream: "outbound",
      }),
    });
  } catch {
    return json({ ok: false, error: "send_failed" }, 502);
  }

  if (!postmarkRes.ok) {
    return json({ ok: false, error: "send_failed" }, 502);
  }

  return json({ ok: true });
}
