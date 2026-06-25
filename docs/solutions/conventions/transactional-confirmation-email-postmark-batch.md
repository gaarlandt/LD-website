---
title: "Transactional confirmation email from a Cloudflare Pages Function (Postmark batch, best-effort)"
date: 2026-06-15
category: conventions
module: Contact form email (Cloudflare Pages Function)
problem_type: convention
component: email_processing
severity: medium
applies_when:
  - Sending email from a Cloudflare Pages Function via Postmark
  - Adding a best-effort second email (e.g. a customer confirmation) alongside a critical one
  - Putting user-supplied input into transactional email HTML
  - Embedding a logo or image in a transactional email
tags: [postmark, transactional-email, cloudflare-pages-functions, email-batch, html-escaping, contact-form, workers-runtime]
---

# Transactional confirmation email from a Cloudflare Pages Function (Postmark batch, best-effort)

> ↑ **Promoted to a cross-project contract** — the portable rules live in the shared hub: `ldcoding/LD - project cross knowledge/contracts/postmark-transactional-email.md` (repo `gaarlandt/ld-project-cross-knowledge`). This doc stays as the detailed origin rationale.

## Context

The contact form (`functions/api/contact.ts`) needed to send the submitter a confirmation copy *in addition to* the existing support notification, both through Postmark, from the Workers runtime. Doing it safely surfaced several non-obvious rules that no prior `docs/solutions/` doc covered: how to add a second send without endangering the critical one, how to escape user input in email HTML, why an embedded logo silently 404s, and the verification reality of `functions/`. Implemented in PR #40.

## Guidance

**1. Send both messages in ONE batch call, ordered `[critical, best-effort]`.** Use Postmark `POST /email/batch` with a JSON *array* body. The response is a single 200 carrying a per-message result array **in request order**.

**2. Positively confirm the critical message; ignore the best-effort one.** A 2xx on `/email/batch` does **not** mean each message was accepted — the per-message `ErrorCode` does. Report success only after confirming the critical message (index 0) has `ErrorCode === 0`. Treat a non-zero code, a short/non-array body, or an unparseable 200 as failure. Never let the best-effort message's result touch the response.

```ts
// A non-2xx means Postmark rejected the whole batch — nothing sent.
if (!postmarkRes.ok) return json({ ok: false, error: "send_failed" }, 502);

let criticalOk = false;
try {
  const results = (await postmarkRes.json()) as Array<{ ErrorCode?: number }>;
  criticalOk = Array.isArray(results) && results[0]?.ErrorCode === 0;
} catch {
  criticalOk = false; // unparseable 200 -> treat as failure, do not trust it
}
if (!criticalOk) return json({ ok: false, error: "send_failed" }, 502);

return json({ ok: true }); // best-effort message (index 1) is intentionally ignored
```

**3. Escape user input in the HTML body, and keep it in text nodes only.** Reuse the `escapeHtml` helper (it escapes `& < > "`). It does **not** escape single quotes, so user values must never sit inside a single-quoted HTML attribute — only inside element text content. Run any `\n` → `<br>` replacement *after* escaping.

**4. Embedded images: committed PNG + request-origin URL.** Email clients strip SVG, so rasterize to a committed PNG. Do **not** hardcode the apex URL — pre-cutover the apex resolves to a different host and the asset isn't on production until merge, so it 404s. Derive the host from the request so it resolves in every environment (preview, production, post-cutover apex):

```ts
const logoOrigin = new URL(request.url).origin;
// `<img src="${logoOrigin}/images/logo-white.png" alt="Let's dog" ... />`
```

Always set a meaningful `alt` as the text fallback, and style it (color/size) so it reads cleanly when images are blocked. Add email-only logo PNGs to `scripts/optimize-images.mjs` `PNG_SKIP` so they don't spawn unused AVIF/WebP variants (they're referenced by URL, never through `OptimizedImage`).

**5. Sender: a friendly From at a monitored, verified address.** Send as a person/brand (e.g. `"Elien van Let's dog" <support@letsdog.nl>`) from an inbox a human reads, and set `ReplyTo` to that same inbox, so a reply lands somewhere real (better than `noreply@`). The From address must be a **verified Postmark sender** — domain-level verification covers any address on the domain, so if one address on the domain already sends, the others work too.

**Caution — abuse surface (hardened in Phase A, 2026-06-25).** Sending to a *user-supplied* recipient turns the endpoint into a **branded-email amplification vector**: attacker-authored content delivered from your verified sender to any address. A hidden honeypot + one Turnstile solve is a weak gate. **Phase A (PR #48, review finding #1) mitigations:** (1) the customer confirmation no longer **echoes** the submitted message — the support copy keeps it; (2) the retained `Hoi {name}` greeting **caps the name at 20 chars**; (3) `name` is **CR/LF-collapsed** before it lands unescaped in the plain-text body/Subject; (4) per-IP Cloudflare WAF rate-limit is the deferred volume bound (per-recipient is the real bound — see `docs/CUTOVER.md`). The portable rule is promoted to the hub contract (see Related).

## Why This Matters

- The worst failure is a **silently lost critical message**: the user sees "received" but the team gets nothing. Positive-confirm prevents it; merely checking `res.ok` (the correct posture for a *single* send) silently regresses once you move to batch, because a 2xx no longer implies per-message success.
- Unescaped user input in an HTML email body is stored XSS in the recipient's mail client.
- A hardcoded apex asset URL produces a broken logo on **every** preview test and on every pre-cutover production email — the request-origin URL eliminates the dependency on cutover timing and merge order.

## When to Apply

- Any transactional email sent from `functions/` via Postmark.
- Whenever you add a second, lower-priority email to an existing critical send (confirmations, receipts, CCs).
- Whenever a transactional email embeds an image hosted on a site that is mid-migration.

## Examples

Batch error handling, before (unsafe once batched) -> after (safe):

```ts
// BEFORE (fine for a single /email send, WRONG for /email/batch):
if (!postmarkRes.ok) return json({ ok: false, error: "send_failed" }, 502);
return json({ ok: true }); // a 200 here does NOT mean the support message was accepted

// AFTER: positively confirm the critical message's per-message ErrorCode (see Guidance #2).
```

Logo URL, before (404s) -> after (resolves everywhere):

```ts
// BEFORE: `<img src="https://letsdog.nl/images/logo-white.png" ...>`  // apex 404s pre-cutover / pre-merge
// AFTER:  const o = new URL(request.url).origin; `<img src="${o}/images/logo-white.png" ...>`
```

## Verification reality

`functions/` does **not** run under `next dev`, so `/api/contact` 404s locally. Verify on the Cloudflare branch preview with `POSTMARK_SERVER_TOKEN` set in the matching scope — **Preview and Production are separate scopes**, so a token set only for Preview leaves production returning 500. After deploying to production, submit the form once and confirm both emails arrive.

## Related

- [`docs/solutions/conventions/cloudflare-pages-preview-functions-gotchas.md`](cloudflare-pages-preview-functions-gotchas.md) — 28-char preview-alias truncation + env-var scope/timing for this same Function.
- [`docs/solutions/cross-project/lessons-from-other-ld-apps.md`](../cross-project/lessons-from-other-ld-apps.md) — Workers runtime constraints and "an HTTP 2xx is not a JSON guarantee".
- Implemented in `functions/api/contact.ts` (PR #40).
