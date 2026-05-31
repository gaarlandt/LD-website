# Handoff — PR #17: Contact page redesign + working contact form

**Created:** 2026-05-31. **Read this to resume the contact-form work in a fresh session.**

This is a *focused* handoff for one open PR. The main project handoff is [`HANDOFF.md`](../HANDOFF.md).

---

## Where things stand

- **PR #17** — https://github.com/gaarlandt/LD-website/pull/17 — branch `feature/contact-page-redesign`. **OPEN, not merged.**
- Redesigns `/contact` to the mockup (beige split hero, restyled consult card, 3-card "Direct bereikbaar") and replaces the old **fake** inline form with an accessible **popup modal** that POSTs to a new **Cloudflare Pages Function** (`functions/api/contact.ts`) which relays the message to `support@letsdog.nl` via **Postmark**. First server-side code in this repo.
- Also bundled: privacy email `.com`→`.nl` ✅, 512px responsive image variant ✅. `*.pages.dev` noindex was **deliberately skipped** (owner decision).
- 8 commits, build green, merge convention = **merge commit** (not squash).

### Verified ✅ (local dev preview, real browser checks)
Page matches mockup at desktop + mobile · modal opens/closes (X, Escape, backdrop) · scroll-lock engages + releases · client validation (3 Dutch errors + focus) · form really POSTs `/api/contact` · error + success states render · GA4 `contact_form_submitted` fires · 512px variant now in the `<picture>` srcset.

> Two real bugs were caught *by* that verification and fixed in-PR: the modal `AnimatePresence` child needed a stable `key` to unmount, and `OptimizedImage` has its **own** `VARIANT_WIDTHS` that also needed `512` (the generator script alone wasn't enough). Both are written up in `docs/solutions/`.

### NOT verified yet ⏳ — this is the main "next session" task
**The real Postmark email send.** Cloudflare `functions/` do **not** run under `next dev`, so `/api/contact` 404s locally (expected). End-to-end delivery can only be tested on the **Cloudflare branch-preview deploy**, and only after the owner does the two setup steps below.

---

## Owner setup required before testing (Jur — these are dashboard/DNS tasks, can't be done from code)

### 1. Postmark — get the Server API Token + verify the sender

You need **two** things from Postmark (https://account.postmarkapp.com):

1. **A Server API Token.** In Postmark, "Servers" are containers for sending. Open (or create) a Server → **API Tokens** tab → copy the **Server API Token**. That string is what the function sends as the `X-Postmark-Server-Token` header. (It is *not* the Account token — use the per-Server token.)
2. **A verified `From` sender.** The function's `From` defaults to `noreply@letsdog.nl`, and Postmark will reject sends from an unverified sender. Two ways:
   - **Domain verification (recommended):** Postmark → Sender Signatures / Domains → add `letsdog.nl` → it gives you **DKIM** (TXT) + a **Return-Path** (CNAME) record. Add those to the `letsdog.nl` zone in **Cloudflare DNS** (you own that zone). Once verified you can send from any `@letsdog.nl` address.
   - **Single Sender Signature (quicker):** add `noreply@letsdog.nl` as a Sender Signature and click the confirmation link Postmark emails. Works, but only for that one address.

   *Note:* a brand-new Postmark account may be limited to sending only to your own confirmed addresses until you request account approval. Since the contact form sends **to** `support@letsdog.nl` (an internal address), that limit usually isn't a blocker — but if test sends bounce with an approval error, request approval in the Postmark dashboard.

### 2. Cloudflare Pages — set the env var (Production **and** Preview)

Cloudflare Pages → project `website-letsdog` → **Settings → Variables and Secrets**. Add:

- `POSTMARK_SERVER_TOKEN` = *(the Server API Token from step 1)* — set as a **Secret**, scoped to **both Production and Preview**. (Preview scope is required so this PR's branch-preview can actually send during testing.)
- *(optional)* `CONTACT_TO` = `support@letsdog.nl` (this is the default; only set to override)
- *(optional)* `CONTACT_FROM` = `noreply@letsdog.nl` (default; must match the verified sender from step 1)

Env vars only take effect on a **new build**, so push/redeploy the branch after setting them.

---

## Next-session test plan (after owner setup)

On the branch preview `https://feature-contact-page-redesign.website-letsdog.pages.dev/contact/`:

1. Open the modal → fill valid name/email/message → submit → expect the **success** state ("Bericht ontvangen.").
2. Confirm the email **arrives at `support@letsdog.nl`**, with the visitor's address as **Reply-To**. Cross-check **Postmark → Activity** shows the send.
3. `curl` the endpoint directly:
   ```bash
   U="https://feature-contact-page-redesign.website-letsdog.pages.dev/api/contact"
   # happy path -> {"ok":true} + email arrives
   curl -s -X POST $U -H 'Content-Type: application/json' \
     -d '{"name":"Test","email":"test@example.com","message":"hallo"}'
   # validation -> 400
   curl -s -X POST $U -H 'Content-Type: application/json' -d '{"name":"","email":"x","message":""}'
   # honeypot -> {"ok":true} but NO email sent
   curl -s -X POST $U -H 'Content-Type: application/json' \
     -d '{"name":"T","email":"t@e.com","message":"hi","company":"bot"}'
   ```
4. If a send fails, check the function logs (Cloudflare Pages → deployment → Functions logs). Common causes: token not set on the scope you're testing, or `CONTACT_FROM` not verified in Postmark.
5. Once green: **merge PR #17 via a merge commit**, then: `git checkout main && git pull`, tag `release/contact-page-redesign-<timestamp>`, delete the local branch.

---

## Heads-up: the hero photo is a placeholder

The contact hero currently uses `public/images/training.jpeg` as a swappable stand-in. If you have the exact mockup photo, drop it into `public/images/`, point the `OptimizedImage src` in `app/contact/contact-content.tsx` at it, run `npm run optimize:images`, and commit the new variants. Not a blocker for testing.

---

## Side note for Jur — "why didn't this session run on Sonnet under opusplan?"

You asked why this chat stayed on Opus instead of dropping to Sonnet 4.6 with opusplan enabled. Short version:

- **"opusplan" means: Opus for plan mode, Sonnet for execution.** It only auto-switches when you actually enter/exit Claude Code's built-in **plan mode** (Shift+Tab → "plan"). This session never used plan mode — `/ce-plan` is a *skill* (it just runs tools + prompts), which is **not** the same as Claude Code's built-in plan mode — so there was no plan→execute boundary to trigger the swap. That's why it stayed on Opus throughout.
- **Where to set/check it:** run **`/model`** in Claude Code and pick `opusplan` (or `default`/`opus`/`sonnet`). To persist it, it's stored in settings as `"model": "opusplan"` — `~/.claude/settings.json` (user scope) or `.claude/settings.json` (this project). Confirm the active model with `/model` or `/status`.
- **If your goal was cheaper execution:** either use built-in **plan mode** for the planning part (execution then drops to Sonnet automatically), or set `/model sonnet` for an execution-heavy session. No setting makes a *skill* like `/ce-plan` hand off Opus→Sonnet mid-run.

(If this doesn't match your exact CLI version, `/model` + the `model` key in settings.json are the two places to look — tell me what `/model` shows and I'll pin it down.)
