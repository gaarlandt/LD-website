---
title: "Cloudflare Pages preview gotchas — 28-char alias truncation + env-var scope/timing"
date: 2026-05-31
category: conventions
module: deployment / Cloudflare Pages
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Testing a Cloudflare Pages Function on a branch preview before merge
  - A preview URL returns "Deployment Not Found" but the build looks fine
  - A Pages Function reads an env var/secret and behaves as if it is unset
  - Adding a new secret in the Cloudflare dashboard and expecting it to work immediately
tags: [cloudflare-pages, preview-deploy, functions, env-vars, secrets, gotcha, deployment]
---

# Cloudflare Pages preview gotchas — 28-char alias truncation + env-var scope/timing

Two unrelated Cloudflare Pages behaviors that both make a *correctly written, correctly
deployed* Pages Function look broken on a branch preview. They surfaced together while
verifying the contact-form function (`functions/api/contact.ts`, PR #17) and each sent
debugging down a wrong path.

## Context

The contact form POSTs to a Cloudflare Pages Function that relays mail via Postmark. After
adding the `POSTMARK_SERVER_TOKEN` secret, the deployed form still failed ("Er ging iets
mis"). Diagnosis was derailed twice — first by the wrong preview URL, then by an env var
that was set but invisible to the running function.

## Guidance

### 1. Branch-alias preview URLs are truncated to 28 characters

Cloudflare builds a per-branch alias `https://<branch-slug>.<project>.pages.dev`, where the
branch slug is the branch name with `/` → `-`. **That slug is truncated to 28 characters.**

- Branch `feature/contact-page-redesign` → slug `feature-contact-page-redesign` (29 chars) →
  **truncated to `feature-contact-page-redesig`** (the trailing `n` is dropped).
- The intuitive full-length URL returns Cloudflare's **"Deployment Not Found" 404 page** —
  which looks identical to a build that never ran. It is NOT a missing deploy; it's the
  wrong hostname.

Derive the alias by slugifying the branch and cutting to 28 chars. When in doubt, the
**Cloudflare dashboard → the deployment → "Preview URL"** shows the exact alias — copy it
rather than guessing.

### 2. Env vars/secrets are scoped (Preview vs Production) AND only apply to NEW builds

A Pages Function reads env from `context.env`. Two independent reasons it can read empty:

- **Scope:** Variables/secrets are set per-environment — **Preview** and **Production** are
  separate. A secret added to **Production only is invisible to branch previews.** Set it on
  **both** (or at least Preview, to test on a branch).
- **Timing:** Cloudflare applies env changes **only to deployments built after the change.**
  A secret added after the last build is inert until a **fresh deployment**. Trigger one with
  an empty commit (`git commit --allow-empty -m "trigger rebuild" && git push`) or
  dashboard → Deployments → **Retry deployment**. Merging to `main` counts as a fresh
  production build.

## Why This Matters

Both failures masquerade as something more serious — a broken build, broken code, or a
rejected API token — so they burn debugging time on the wrong layer. Knowing the two
behaviors turns a 30-minute false trail into a 2-minute check: *is this the truncated URL?*
and *is the secret on the right scope, with a build newer than the secret?*

A reusable mitigation that made the second one diagnosable in seconds: **have the function
return a distinct machine-readable `error` code per failure mode** rather than a generic
500. `functions/api/contact.ts` returns:

- `{"ok":false,"error":"server_not_configured"}` + **500** when the token is missing
  (→ scope/timing problem, not the code),
- `{"ok":false,"error":"send_failed"}` + **502** when Postmark rejects the send
  (→ e.g. unverified `CONTACT_FROM` sender),
- `{"ok":false,"error":"<field>"}` + **400** on validation failure.

`curl`-ing the endpoint and reading the `error` field pinpointed "token not reaching the
function" immediately, with no dashboard spelunking.

## When to Apply

- Any time you verify a Pages Function on a branch preview, or a preview URL 404s.
- Any time a Function reads an env var/secret — set it on the correct scope and redeploy.
- When designing a Function: return distinct error codes per failure mode so production
  issues are diagnosable from the response alone.

## Examples

Diagnose a deployed contact endpoint (use the **28-char-truncated** alias):

```bash
B="https://feature-contact-page-redesig.website-letsdog.pages.dev/api/contact"
curl -s -X POST "$B" -H 'Content-Type: application/json' \
  -d '{"name":"t","email":"t@e.com","message":"hi"}'

# {"ok":true}                                  -> working
# {"ok":false,"error":"server_not_configured"} -> token missing on this scope, or build predates the secret -> set on Preview + redeploy
# {"ok":false,"error":"send_failed"}           -> deployed + token present, but Postmark rejected (verify CONTACT_FROM sender)
```

Force a fresh deployment so a newly-added secret takes effect:

```bash
git commit --allow-empty -m "chore: trigger Cloudflare rebuild (pick up env var)"
git push
```
