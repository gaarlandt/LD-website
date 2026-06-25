---
title: "Map a server's field-error codes onto field-level UI, not a generic banner"
date: 2026-06-25
category: design-patterns
module: Marketing site — contact form (app/contact/contact-form-modal.tsx + functions/api/contact.ts)
problem_type: design_pattern
component: tooling
severity: low
applies_when:
  - A form posts to an endpoint that returns machine-readable per-field error codes
  - Client-side validation is lighter than the server's (length caps, stricter regex)
  - You want the user to fix the offending field in place instead of re-reading a generic error
tags: [react, forms, error-handling, validation, fetch, contact-form, turnstile]
---

# Map a server's field-error codes onto field-level UI

## Context
`functions/api/contact.ts` returns `{ ok:false, error:"name"|"email"|"message" }`
with 400 when a field fails its stricter server checks (length caps, a tighter
email regex) that the lighter client validation lets through. The client used to
treat any non-OK response as one generic "something went wrong" banner, so a
server-only field rejection told the user nothing about which field to fix.

## Guidance
On a non-OK response, parse the error code defensively and route field codes to
the field UI; reserve the generic banner for everything else.

```tsx
// Defensive: a 5xx/502 may return a non-JSON gateway body — don't let res.json() throw.
async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : undefined;
  } catch { return undefined; }
}

if (!res.ok) {
  const code = await readErrorCode(res);
  if (code === "name" || code === "email" || code === "message") {
    setErrors({ [code]: FIELD_ERROR_COPY[code] });          // field-level error
    setStatus("idle");
    document.getElementById(`cf-${code}`)?.focus();          // focus the bad field
    return;                                                  // keep the still-valid token — see Why
  }
  throw new Error("send failed"); // captcha / invalid_json / 5xx / 502 / network → generic banner
}
```

## Why This Matters
- **Keep the captcha token on a field 400.** The Function validates the fields
  *before* it verifies Turnstile, so a field-400 leaves the token unconsumed.
  Don't reset it — the user fixes the field and resubmits without re-solving.
- **Reserve the generic banner for 5xx / network / 502 and the non-field 400s**
  (`captcha`, `invalid_json`). Those aren't a single field's problem, and that
  path resets the token for a clean retry.
- **Parse defensively.** A 502 may be an HTML gateway page; an unguarded
  `res.json()` would throw into the catch and mask the real status.

## When to Apply
Any client consuming an endpoint that emits distinct per-field error codes —
especially when server validation is stricter than the client's, so these errors
are reachable in normal use rather than only under tampering.

## Examples
An email that passes the client `@` check but fails the server regex (`a@b`):
before → generic banner; after → the email field highlights and takes focus, the
token is kept, and fixing + resubmitting succeeds with no re-captcha.

## Related
- Contact Function error contract: [cloudflare-pages-preview-functions-gotchas](../conventions/cloudflare-pages-preview-functions-gotchas.md), [transactional-confirmation-email-postmark-batch](../conventions/transactional-confirmation-email-postmark-batch.md)
- Token lifecycle: [turnstile-on-cloudflare-pages-function](../conventions/turnstile-on-cloudflare-pages-function.md)
- Pairs with [Deferred state-reset timer race](modal-reset-timer-reopen-race.md) (same hardening PR).
