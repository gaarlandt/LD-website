# Code + Security Review — Let's dog marketing website (full-site audit)

- **Scope:** entire tracked codebase at `main` @ `859771e` (full audit, not a diff). 95 source/config files, ~6,000 LOC.
- **Mode:** review + remediation plan only. **No fixes applied / no execution** (per explicit request).
- **Team:** 12 reviewers — correctness, security, adversarial (Opus); testing, maintainability, project-standards, api-contract, reliability, performance, frontend-races, agent-native, learnings-researcher (Sonnet).
- **Result:** **1 P1, 10 P2, 11 P3.** Verdict: **Ready with fixes** — resolve **#1 before cutover to real traffic**.

## Headline
The site is **well-built and well-defended** for a marketing site. The attack surface is tiny (one server endpoint), secrets are handled correctly, React auto-escaping + a JSON Postmark API close the obvious injection paths, every `target=_blank` has `rel=noopener`, and the documented Turnstile fail-closed fix is present. The real risks cluster in **one place**: the contact endpoint can be abused as a **branded-email amplifier**, and the analytics stack fires **before consent** (a known, owner-accepted legal tradeoff).

---

## P1 — High

| # | File | Issue | Reviewer | Conf |
|---|------|-------|----------|------|
| 1 | `functions/api/contact.ts:221` | Contact endpoint is a branded-email amplification / phishing vector | security, adversarial | 100 |

- **#1** — The confirmation email is sent to a **user-supplied `To:`** and echoes the **user-supplied `name` + `message`** back, using Let's dog's verified Postmark sender, brand logo and footer. An attacker controls both the recipient and the body, so the "loop-closing UX" feature becomes a channel to deliver Let's-dog-branded phishing/harassment to arbitrary victims. The only friction is **one Turnstile solve per send** (cheap at scale via solving services) and there is **no rate limit anywhere in code**. The plan deferred rate-limiting on the assumption the confirmation "only echoes the submitter's own message to the address they typed" — finding #1 is exactly the violation of that assumption (attacker controls recipient ≠ submitter). Impact: brand-reputation + Postmark sender-reputation/quota damage. **Fix (pick at least one, before cutover):** add a Cloudflare WAF rate-limit rule on `POST /api/contact` and/or a KV/Durable-Object per-IP+per-recipient counter (fail-closed on prod hosts); and/or drop the reflected `message` echo from the confirmation body (keep a neutral "we received your message" without replaying attacker text). Owner decision (product/ops).

---

## P2 — Moderate

| # | File | Issue | Reviewer | Conf |
|---|------|-------|----------|------|
| 2 | `components/analytics/ga4.tsx:13` | GA4 + PostHog fire before/without consent — GDPR/ePrivacy/NL exposure | security, adversarial, learnings | 100 |
| 3 | `public/_headers:20` | CSP has only `frame-ancestors` — no object-src/base-uri/form-action | security | 100 |
| 4 | `components/shared/reveal.tsx` | Dead file (zero callsites, verified) ships the whole framer-motion bundle + dead CSS | maintainability, performance | 100 |
| 5 | `functions/api/contact.ts:75,204` | No timeout on Turnstile + Postmark fetches — hung upstream stalls the Worker | reliability | 100 |
| 6 | `functions/api/contact.ts:83` | Zero observability — every failure path is silent in production | reliability | 100 |
| 7 | `lib/content.ts:24` | Module-scope `readFileSync` — a missing/renamed `.md` crashes the whole build (bare ENOENT) | reliability, adversarial | 100 |
| 8 | `functions/api/contact.ts:120` | Turnstile TEST-secret fallback reachable on prod hosts not in the exact-match enforced set | adversarial | 75 |
| 9 | `app/contact/contact-form-modal.tsx:128` | Uncleared 250ms `setTimeout` wipes a live Turnstile token on close→reopen | frontend-races, correctness | 100 |
| 10 | `public/images/NVGH Logo.jpeg` | Filename has a space — excluded from AVIF/WebP, srcset-breakage risk | maintainability, standards, performance | 100 |
| 11 | `functions/api/contact.ts` | No test harness — prod-only contact logic uncovered + unrunnable under `next dev` | testing (+3) | 100 |

- **#2** — Both GA4 and PostHog initialise and capture **regardless of Cookiebot state** ("consent theater," documented in `ga4.tsx:13-27` and the 2026-05-30 plan as an owner-accepted decision). For a Dutch site this is a genuine GDPR/ePrivacy/Telecommunicatiewet exposure (analytics cookies set pre-consent; PostHog's `cross_subdomain_cookie` even shares the pre-consent anon id into `app.letsdog.nl`). **This is a known, deliberate decision — not a code defect.** Surfaced because you asked for a security review. Action is a re-confirmation of legal sign-off; the one-line revert path (add `type="text/plain" data-cookieconsent="statistics"` to both GA scripts + gate `posthog.init`) is already documented.
- **#3** — CSP is `frame-ancestors 'self'` only. The full `script-src` allowlist is **de-scoped by owner decision** (ongoing maintenance cost). But three directives are **free, zero-maintenance wins on a static site**: `object-src 'none'; base-uri 'self'; form-action 'self'`. Add them to the existing CSP line (respect the `_headers` merge invariant — `/*` block, no Cache-Control).
- **#4** — `components/shared/reveal.tsx` has **zero callsites** (verified) and is the **only** importer of `framer-motion`. It ships a ~70KB-compressed chunk to every page for nothing, plus dead `.animate-fade-in*` keyframes in `globals.css:87-110`. Delete the file + the dead CSS; `framer-motion` then becomes an unused dependency (drop from `package.json`, or keep if you plan to use it).
- **#5** — Neither external `fetch` (Turnstile siteverify, Postmark batch) has a timeout. A hung upstream ties up the Worker invocation until the platform limit. Both existing `catch` blocks already fail-closed, so adding `signal: AbortSignal.timeout(5000)` / `(10000)` is a zero-risk one-liner each.
- **#6** — No `console.error` anywhere in the Worker. A production Turnstile/Postmark failure is invisible (no way to tell a bad token from a Postmark outage). Add structured `console.error("[contact] …")` in the three catch/failure blocks — Cloudflare Workers Logs captures them. (Pair with #1's abuse monitoring.)
- **#7** — `lib/content.ts` does `fs.readFileSync` at module scope; a renamed/missing `content/<slug>.md` fails the **entire** Cloudflare build with an unhelpful ENOENT. Wrap in try/catch and rethrow naming the slug, or add a build preflight that asserts all 8 slugs exist.
- **#8** — The host-gated Turnstile fail-closed fix is present, but `TURNSTILE_ENFORCED_HOSTS` is an **exact-match allowlist**. Any future production domain/alias not added to it (a new custom domain, a vanity alias) would silently fall back to the always-pass TEST secret if its real secret were unset. Invert to a fail-closed posture (unknown public host ⇒ require a real secret; carve the test fallback only for explicit localhost/`*.pages.dev` preview). Verify which hosts route to the Function at cutover.
- **#9** — `handleOpenChange` schedules `setTimeout(…, 250)` to reset state but never clears it. Close at T=0, reopen at T=150, Turnstile sets a token at T=200, then the stale timer fires at T=250 and calls `setToken("")` — disabling submit on a live dialog. Store the handle in a ref; clear on re-entry and in an effect cleanup (~4 lines).
- **#10** — `public/images/NVGH Logo.jpeg` (the space) is skipped by `optimize-images.mjs`, so it never gets AVIF/WebP and would break `srcset` if ever moved to `OptimizedImage`. Rename to `nvgh-logo.jpeg`, update `trust.tsx:152` + `over-ons/page.tsx:217`, run `npm run optimize:images`, switch both to `OptimizedImage`.
- **#11** — There is **no test framework** in the repo. Acceptable for static marketing pages, but `functions/api/contact.ts` is pure-ish logic that **cannot run under `next dev`** and ships straight to prod — its highest-risk branches (enforced-host fail-closed 500, honeypot silent-drop, Postmark batch `results[0].ErrorCode===0` parsing with its 4 failure modes) have zero coverage. Add Vitest + ~6 unit tests for the Function (no deploy needed) and for the pure helpers (`buildEmbedUrl`, front-matter parse, `parsePrice`).

---

## P3 — Low

| # | File | Issue | Reviewer | Conf |
|---|------|-------|----------|------|
| 12 | `lib/structured-data.ts:20` | Organization `logo` is an SVG (verified) — ineligible for Google logo rich result | api-contract | 100 |
| 13 | `components/ui/accordion.tsx:11` | `ref as any` — type-safety hole; siblings use `React.ElementRef` | maintainability | 100 |
| 14 | `app/globals.css:33` | National2 font: no preload + raw OTF (no woff2 subset) → heading FOUT | performance | 75 |
| 15 | `app/contact/contact-form-modal.tsx:162` | Client shows a generic error for every non-OK — ignores server field error codes | correctness, api-contract | 75 |
| 16 | `public/.well-known/api-catalog` | Omits the one real endpoint (`POST /api/contact`) | agent-native | 100 |
| 17 | `components/sections/puppyagenda/phase-explorer.tsx` | Only Phase 01 in static HTML — rest of curriculum invisible to no-JS crawlers | agent-native | 75 |
| 18 | `components/layout/footer.tsx:8` | Footer nav order diverges from canonical (verified) | project-standards | 100 |
| 19 | `components/layout/navbar.tsx:115` | CTA "Start vandaag → /prijzen" vs CLAUDE.md "Start gratis → app" (verified drift) | project-standards | 100 |
| 20 | `app/sitemap.ts:11` | `LAST_MODIFIED` hardcoded `2026-05-30` (stale) | api-contract | 100 |
| 21 | `public/llms.txt:18` | Missing ip-overdrachtsverklaring page + the €39,50 consultation product | agent-native | 100 |
| 22 | `app/manifest.ts:20` | 512px icon reused for `any` + `maskable` — maskable clips the logo | api-contract | 75 |

- **#19** — Code is the likely source of truth (a copy-deck refresh changed the CTA); the fix is probably to **update CLAUDE.md**, not the code. Confirm intent.

---

## Verified clean (ruled-out false positives)
- All **11** `target="_blank"` links carry `rel="noopener noreferrer"`.
- `VARIANT_WIDTHS` === optimize-images `WIDTHS` (`[384,512,768,1280]`) — no image-srcset drift.
- No direct `gtag()`/`posthog.capture()` outside `lib/analytics.ts`.
- `escapeHtml` omits `'` but user input lands only in HTML **text nodes**, never attributes — not exploitable.
- Email **header injection impossible** (JSON to Postmark REST; `EMAIL_RE` forbids whitespace).
- Rassenkeuze iframe: hardcoded origin + `URLSearchParams` re-encoding ⇒ no open-redirect/SSRF; the `window.location.search`-in-`useEffect` pattern is the documented-correct static-export approach.
- `dangerouslySetInnerHTML` in `ga4.tsx` + `json-ld.tsx` receive only validated/constant/escaped input.
- Server secrets are env-only, never `NEXT_PUBLIC`, not in the client bundle.

## Coverage notes
- **Apply:** skipped (Stage 5c) — user requested review + plan only.
- **Validation:** orchestrator **direct verification** of the disputed/factual claims (reveal.tsx dead-code conflict, VARIANT_WIDTHS parity, JSON-LD logo type, `_blank` rel pairing, navbar/footer drift, analytics call-site leakage) rather than a full per-finding validator wave — proportionate to a no-auto-apply deliverable. The one P1 was independently found by two Opus reviewers with a concrete mechanism and cross-checked against the documented deferral.
- **Suppressed / folded to residual:** server_not_configured info-disclosure (conf 50), JSON-LD Person `image` (conf 50), Postmark batch length-guard (already fails closed), pageMetadata relative-canonical (correct today), beige-hero duplication (consciously deferred KTD8), customerHtml hardcoded hex, duplicate LessonType, Cookiebot auto-block doing nothing, PostHog on every route, robots.ts `host` field. HSTS `includeSubDomains/preload` is cutover-gated and already tracked in `docs/CUTOVER.md`.
