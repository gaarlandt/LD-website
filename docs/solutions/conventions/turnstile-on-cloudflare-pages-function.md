---
title: "Cloudflare Turnstile on a Pages Function — fail-closed guard, key setup, hand-rolled widget"
date: 2026-06-15
category: conventions
module: Contact form / Turnstile (Cloudflare Pages Function)
problem_type: convention
component: email_processing
severity: medium
applies_when:
  - Adding Cloudflare Turnstile (or any CAPTCHA) verified in a Cloudflare Pages Function
  - Giving a server-side security check a test-key fallback for dev/preview convenience
  - Storing a NEXT_PUBLIC public key vs a server-side secret in Cloudflare Pages
  - Embedding a third-party script + iframe widget in a React/Radix modal
tags: [turnstile, captcha, cloudflare-pages-functions, fail-closed, env-vars, contact-form, anti-abuse]
---

# Cloudflare Turnstile on a Pages Function — fail-closed guard, key setup, hand-rolled widget

## Context

The contact form (`functions/api/contact.ts` + `app/contact/contact-form-modal.tsx`) needed an anti-abuse gate: it emails submitter-authored content from a verified sender to a user-supplied address, so the honeypot alone was weak. We added Cloudflare Turnstile — a client widget plus server-side token verification on the Workers runtime — wanting dev/preview to work without real keys but production to never silently fail open. Several non-obvious rules surfaced; no prior `docs/solutions/` doc covered Turnstile. (PR #41; a code review caught a P1 fail-open in the first cut.)

## Guidance

**1. A dev/preview test-key fallback must fail CLOSED on production AND for UNKNOWN hosts.** Cloudflare publishes always-pass *test* keys so dev/preview run the full check without a real widget. The trap: `env.TURNSTILE_SECRET_KEY || TEST_SECRET` means a forgotten/typo'd prod secret silently falls back to the always-pass test secret — the gate looks healthy and protects nothing.

The **first cut** used an exact-match *enforced-hosts* `Set` (`letsdog.nl`, `www.letsdog.nl`, `website-letsdog.pages.dev`). A 2026-06-23 review (finding #8) found that brittle: any **new** production surface not in the set (a future custom domain, a vanity alias) would silently fall back to the test secret. **Invert to a fail-closed predicate** — allow the fallback ONLY on hosts that can never serve real traffic (localhost + *branch* previews), and require a real secret for **everything else** (apex, www, the prod alias, and any unforeseen host):

```ts
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const PROD_PAGES_ALIAS = "website-letsdog.pages.dev"; // live, publicly-reachable → ENFORCED

// Test fallback ONLY for localhost + branch *.pages.dev. The prod alias is excluded
// (it serves real traffic); a bare `*.pages.dev` wildcard would wrongly demote it.
function isPreviewOrLocalHost(hostname: string): boolean {
  if (hostname === "localhost") return true;
  return hostname.endsWith(".pages.dev") && hostname !== PROD_PAGES_ALIAS;
}

const hostname = new URL(request.url).hostname;
const secret = env.TURNSTILE_SECRET_KEY || (isPreviewOrLocalHost(hostname) ? TURNSTILE_TEST_SECRET : "");
if (!secret) { console.error("[contact] turnstile secret missing on enforced host", hostname); return json({ ok: false, error: "server_not_configured" }, 500); }
```

Inline the host literals — `functions/` stays dependency-free and can't import `lib/prod-hosts.ts` (note: `prod-hosts.ts` deliberately classifies the Pages alias as *non*-prod for **analytics** noise control — the opposite stance; don't unify them).

**Residual (R-A — accept knowingly, or close with an env flag):** hostname classification can't separate the production deployment's *own* hash/branch aliases (`<hash>.website-letsdog.pages.dev`, `main.website-letsdog.pages.dev`) from a branch preview — both are `*.website-letsdog.pages.dev`. So those prod aliases still classify as preview and would fail OPEN **if the prod secret were unset**. Setting `TURNSTILE_SECRET_KEY` in Production (which you must) makes every alias use the real secret and closes it. The fully-robust fix gates the fallback on an explicit **Preview-scope env flag** instead of hostname — deferred (it changes the env setup and breaks zero-config preview testing). Tracked in `docs/CUTOVER.md`.

**2. Cloudflare Pages key storage: public key = plaintext Variable, secret = encrypted Secret, Production scope only.**

| Key | Env var | Storage | Scope |
|-----|---------|---------|-------|
| Site Key (public) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **plaintext Variable** | Production |
| Secret Key | `TURNSTILE_SECRET_KEY` | **encrypted Secret** | Production |

The `NEXT_PUBLIC_` site key must be inlined into the client bundle at build time, so it has to be a **plaintext Variable** — storing it as an encrypted Secret risks it not reaching the build, the client then falls back to the *test* site key, and its token mismatches the real server Secret → the form errors. Leave the **Preview** scope unset: branch previews use the always-pass test keys (real keys would fail Turnstile's hostname check on `<branch>.pages.dev`, which isn't in the widget's allowed-hostname list).

**3. CSP doesn't block Turnstile here.** The site's CSP has no `script-src`/`frame-src` (only `frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`), so the widget's script + challenge iframe load fine — no `public/_headers` change. A *future* `script-src` directive would have to allow `https://challenges.cloudflare.com`.

**4. Server verify is authoritative and fails closed.** POST to `siteverify` (form-encoded `secret` + `response` + `remoteip` from the edge `CF-Connecting-IP` header); trust only `success === true`; return `false` on any network error / non-2xx / parse failure. Client gating is UX only.

**5. Hand-rolled widget (no dependency) in a Radix modal.** Module-scope script-loader singleton that **nulls itself on error** (so a transient load failure retries on reopen); an effect keyed on a `formVisible` boolean (renders once when the form appears, cleans up on unmount, doesn't churn across idle→submitting→error); single-use token reset on a failed submit; a visible fallback message on script-load failure so the user isn't stuck behind a permanently-disabled submit; SSR-safe (`typeof window` guard).

## Why This Matters

- A silently-disabled security control is the worst failure: it looks healthy and protects nothing. The host-gated fail-closed guard turns a config slip into a loud 500, not a silent bypass.
- The plaintext-vs-Secret distinction for `NEXT_PUBLIC_*` is easy to get wrong (encrypting a key *feels* safer) and breaks the production form when wrong.

## When to Apply

- Any CAPTCHA / anti-abuse verification implemented in a Cloudflare Pages Function.
- Any time you add a test-key or dev fallback to a security-sensitive server check — make the fallback host-gated, never unconditional.

## Examples

The fail-open the review caught, and the fix:

```ts
// BEFORE (P1 fail-open): unset prod secret silently uses the always-pass test secret.
const secret = env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET;

// AFTER: only non-production hosts get the fallback; prod fails closed (see Guidance #1).
```

Production smoke test that confirms it end-to-end (no browser, no email sent):

```bash
# Real secret live + fail-closed: a tokenless POST returns 400 captcha
# (a test-secret fallback would return 200 ok).
curl -s -o /dev/null -w "%{http_code}" -X POST https://website-letsdog.pages.dev/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"x","email":"x@y.nl","message":"smoke test, no token"}'   # -> 400

# Real Site Key inlined (not the test key): grep the live contact-page chunks.
# (a hit on the real key's tail confirms the plaintext Variable reached the build)
```

The reject path can't be exercised on a branch preview with the default always-pass fallback — set the always-**fail** test secret (`2x0000000000000000000000000000000AA`) in the Preview env, or use a real failing challenge.

## Related

- [`transactional-confirmation-email-postmark-batch.md`](transactional-confirmation-email-postmark-batch.md) — the same contact Function (Postmark batch + escaping).
- [`cloudflare-pages-preview-functions-gotchas.md`](cloudflare-pages-preview-functions-gotchas.md) — env-var scope/timing (Preview vs Production, applies-to-next-build) — directly relevant to the key setup above.
- [`../cross-project/lessons-from-other-ld-apps.md`](../cross-project/lessons-from-other-ld-apps.md) — Workers runtime constraints (web-standard `fetch` only).
- Implemented in `functions/api/contact.ts` + `app/contact/contact-form-modal.tsx` (PR #41).
