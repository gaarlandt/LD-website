# DNS Cutover Runbook — `letsdog.nl` → Cloudflare Pages

This is a self-contained playbook for flipping `www.letsdog.nl` and `letsdog.nl` from the old WordPress site (SiteGround, `A 35.214.137.79`) over to the new Next.js site on Cloudflare Pages (`website-letsdog.pages.dev`).

> 📄 **For the click-by-click dashboard walkthrough, open [`CUTOVER.html`](CUTOVER.html) in a browser.** It has the same steps with explicit "where to click" breadcrumbs, field-by-field tables (incl. the Cloudflare rate-limit rule), copy-paste command blocks, and progress checkboxes. This Markdown stays the canonical text source — edit both if the procedure changes.

**Do not regenerate this doc each time you ask "what's the cutover?" — read this. If the procedure changes, edit this file.**

---

## ✅ Post-cutover status — executed 2026-07-02

The flip is **done and live**: `letsdog.nl` + `www` are proxied to Cloudflare Pages and serving the new site. The sections below are the historical record. Verified + decided at go-live:

| Item | Outcome |
|---|---|
| Both domains proxied + SSL Active | ✅ live (`server: cloudflare`) |
| www → apex 301 redirect | ✅ deployed & verified (path + query preserved) |
| Rate-limit rule (`/api/contact`) | ✅ Free-plan rule live; burst blocks from the 6th request (5 / 10s, Block) |
| Contact form + Turnstile | ✅ delivers; tokenless POST → `400` (fail-closed on the apex) |
| GA4 on real domain | ✅ fires `page_view`/`user_engagement`, **no** `debug_mode` |
| sitemap.xml | ✅ apex URLs; robots advertises it — resubmitted in GSC 2026-08-07. *(Said 15 at go-live; 16 as of 2026-08-07 — `/partners` was added since. The count is a moving target, don't treat it as a fixture.)* |
| CAA records | ✅ `letsencrypt.org` + `pki.goog` + `ssl.com` + iodef; Cloudflare auto-augments (comodoca/digicert/issuewild) |
| Lighthouse (mobile) | Perf 81 · A11y 97 · BP 96 · SEO 92; hero-LCP preload fix in PR #57 |

**Decisions logged:**
- **HSTS `includeSubDomains` — NOT enabled.** `app.letsdog.nl` is the agency-managed WordPress box on SiteGround; don't bet an irreversible policy on a cert we don't control. The apex keeps the basic `max-age` from `_headers`. Revisit only if every subdomain becomes ours.
- **robots.txt — welcoming LLM crawlers.** Disable Cloudflare's *managed robots.txt* (Security → Settings → Bot traffic → "block training in robots.txt" = OFF) so the site's own `Allow: /` is served; AI Crawl Control crawlers set to Allow. Setting crawler actions to Allow does **not** remove the robots.txt injection — the managed-robots toggle is a separate setting.
- **Cookie consent + colour contrast — deferred.** Pre-consent analytics stays — **legal sign-off obtained 2026-08-07, posture unchanged** (loop D-1), and it now covers the Meta Pixel too; brand-green small-text contrast (~3.86:1) is a brand decision. Both consciously left.

**Open follow-ups:** none — all three closed. ~~resubmit sitemap in Search Console~~ (done 2026-08-07) · ~~turn off the managed-robots.txt toggle~~ (done) · ~~merge PR #57~~ (merged 2026-07-02).

---

<!-- loop-check: reconciled 2026-08-07 -->

## 🔁 Reconciliation — 2026-08-07

The flip ran on 2026-07-02, but the checkboxes below were never ticked, so this runbook read as "29 items outstanding" for five weeks while most of them were already true. Everything verifiable from outside a dashboard was re-measured against the live apex today; each box now carries its evidence, and the ones that only a human with dashboard access can close are gathered here.

**Measured and confirmed live** (commands are in the verification block near the end of this file): `www` → apex 301 preserving path · HSTS `max-age`, `X-Frame-Options`, CSP, `Permissions-Policy` and all four `Link` headers · no `X-Robots-Tag`, so the apex is indexable · `robots.txt` is *ours* (`Allow: /` + `Host` + `Sitemap`), so Cloudflare's managed-robots injection is off · sitemap resolves with 16 `<loc>` entries · `security.txt`, `manifest.webmanifest`, `llms.txt` all 200 · canonical on `/prijzen/` points at the apex · CAA records present for Let's Encrypt, Google, SSL.com, Comodo, DigiCert plus `issuewild` and `iodef` · legacy redirects `/privacy-policy/` → `/privacybeleid/` and `/puppyagenda/` → `/puppycursus/` both 301 · all five newer legal pages 200 · a tokenless `POST /api/contact` returns **400**, which proves the real Turnstile secret is live in Production (it would return 200 on the always-pass test key) · the PostHog `ph_…` cookie is set on the apex.

**Dashboard items — all closed 2026-08-07** (confirmed by Jur; none of them touched code):

| # | Item | Outcome |
|---|---|---|
| 1 | Register both properties in Search Console and submit `https://letsdog.nl/sitemap.xml` | ✅ done |
| 2 | Add `app.letsdog.nl` to GA4 cross-domain "Configure your domains" | ✅ done |
| 3 | Mark `begin_checkout` + `contact_form_submitted` as key events, map Google Ads conversions | ⏹️ **dropped** — not doing it; Google Ads conversion mapping isn't part of this site's job |
| 4 | Set the "Internal Traffic" data filter to **Active** | ✅ done — this is what makes the `traffic_type: "internal"` our code sends actually filter anything |
| 5 | Delete the orphaned `Website` data stream (`14274309491`) | ✅ done |
| 6 | Cookiebot Domain Group covers apex + `www`, staging hostname dropped | ✅ done |
| 7 | Legal sign-off on pre-consent analytics — covers GA4, PostHog **and** the Meta Pixel | ✅ done — loop **D-1** |
| 8 | Spec-compliance check against the live apex | ✅ closed. The concrete required artifacts were measured directly on 2026-08-07 (security + `Link` headers, apex canonical, `robots.txt` + `Sitemap`, `sitemap.xml`, `security.txt`, `manifest.webmanifest`, `llms.txt`, no `X-Robots-Tag`); the formal spec-MCP `audit_url` run was not performed |

**Closed as decided, not as done:** zone-wide HSTS with `includeSubDomains; preload` stays **off** — see the decision above; `app.letsdog.nl` is the agency's box and preload is effectively irreversible. The old checkbox for it is struck through below so it stops reading as outstanding work.

**Moot:** the "audit GA4 for anomalies from the migration window" item — that window closed five weeks ago.

---

## Before you start — pre-flight checklist

> **Historical section.** DNS flipped on 2026-07-02, so these are no longer gates — they are a record. Ticked below where the underlying state was re-measured on the live apex 2026-08-07; the ones still open are the dashboard items collected in the Reconciliation table above.

- [x] Production deploy on `website-letsdog.pages.dev` is green and the homepage renders correctly. *(Apex + `www` both 200 from Cloudflare, 2026-08-07.)*
- [x] All new pages serve 200 on production: `/retour/`, `/ip-overdrachtsverklaring/`, `/privacybeleid/`, `/cookieverklaring/`, `/ai-gebruiksvoorwaarden/`. *(All five 200 on the apex, 2026-08-07.)*
- [x] Redirects work: `/privacy-policy/` → `301` `Location: /privacybeleid/`. *(Verified on the apex, 2026-08-07.)*
- [x] Renamed-route redirect works: `/puppyagenda/` → `301` → `/puppycursus/`. Renamed 2026-06-16 (keyword-rich URL matching the nav label); old URL kept alive via `public/_redirects`. *(Verified on the apex, 2026-08-07.)*
- [x] GA4 fires on the live domain — `_ga` + `_ga_0FCGXJHMMY` cookies set on the apex and, per the go-live table above, `page_view` fires without `debug_mode`. *(The original pre-flight wording checked `*.pages.dev` with `debug_mode=true`; superseded by the real-domain check in Step 4.)*
- [x] **Contact form delivers:** `POSTMARK_SERVER_TOKEN` set in Cloudflare Pages and `CONTACT_FROM` a verified sender. *(Go-live table above records delivery; a tokenless POST now returns 400 rather than 500, so the Function is reachable and configured. Loop T-15 separately confirmed a real creator-form submission arriving.)*
- [x] **Turnstile is live (anti-abuse on the contact form):** *(Confirmed 2026-08-07 — a tokenless `POST /api/contact` on the apex returns **400**, which only happens with the real secret; the always-pass test key returns 200.)* create a **Managed** Turnstile widget with hostnames `letsdog.nl` + `www.letsdog.nl` + `website-letsdog.pages.dev`, then in Cloudflare Pages → Variables and Secrets (**Production** scope) set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a **plaintext variable** (public Site Key — must be inlined at build) and `TURNSTILE_SECRET_KEY` as an encrypted **secret** (Secret Key). Leave the Preview scope unset (branch previews use the always-pass test keys). A production host with the secret unset fails closed (the form returns 500), so set the keys before/at merge. Verify on production that the widget renders and a real submission succeeds.
- [x] **WAF rate-limit rule on the contact endpoint *(live per the go-live table: 5 req / 10s, Block, burst blocks from the 6th request)* (anti-abuse — Phase A / review finding #1):** the `letsdog.nl` zone is on the **Free plan** (confirmed from billing 2026-06-25 — the "Workers Paid" line is the Workers add-on, not a zone upgrade), so the rule is Free-tier: exactly **one** rule, **Path-only** matching, **10s** period+timeout, **IP** counting. Create it — zone `letsdog.nl` → **Security → Security rules → Create rule → Rate limiting rules** (old dashboard: **Security → WAF → Rate limiting rules**) → match Field **URI Path** equals `/api/contact`, **5 requests / 10s**, count by **IP**, action **Managed Challenge** (or Block). Click-by-click is in [`CUTOVER.html`](CUTOVER.html) → "Rate-limiting rule". The rule lives on the zone, so it only fires once the domain is bound + proxied (not on `*.pages.dev`). Phase A (PR #48) removed the echoed message + capped the greeting, but the endpoint still sends one branded confirmation per Turnstile solve to an attacker-chosen address — this bounds the per-IP volume. **Per-IP only:** it does NOT bound a per-recipient distributed campaign (many IPs, one email each, to one victim); the real per-recipient bound (a KV/Durable-Object counter keyed on the lowercased recipient) is deferred follow-up. Also add a Cloudflare alert on anomalous `POST /api/contact` rates (200-spikes = successful amplification; 400/`captcha`-spikes = token farming) — the Function's `[contact] …` structured logs feed it.
- [x] **Turnstile fail-closed covers ALL production-reachable aliases *(mooted — the Production secret is set, so every alias uses the real secret; apex tokenless POST → 400, verified 2026-08-07)* (Phase A R-A residual):** `isPreviewOrLocalHost()` enforces Turnstile on the canonical `website-letsdog.pages.dev` + apex/www, but classifies the production deployment's *own* hash/branch aliases (`<hash>.website-letsdog.pages.dev`, `main.website-letsdog.pages.dev`) as preview — so they fall back to the always-pass test secret **only if `TURNSTILE_SECRET_KEY` is unset in Production**. Setting that secret (item above) makes every alias use the real secret and **moots this**. After cutover, verify a tokenless `POST` to the apex returns `400 captcha` (real secret live), not `200`.
- [x] Cookiebot Domain Group includes both `www.letsdog.nl` and `letsdog.nl` *(confirmed 2026-08-07)*. Original: (it should already, since those are the original WP domains). Verify in `manage.cookiebot.com` → Settings → Domain Groups.
- [x] **Pre-consent analytics — legal sign-off (review finding #2, R4).** → **Outcome: signed off 2026-08-07** — posture unchanged, analytics *and* the Meta Pixel keep firing pre-consent. Recorded in loop **D-1**. Original text: GA4 + PostHog fire on every visit **without** Cookiebot consent gating (`components/analytics/ga4.tsx` is deliberately un-gated — see its "consent theater" note). The product owner accepted this operationally, but it is **not** a legal decision: firing non-essential analytics pre-consent implicates **ePrivacy Directive Art. 5(3)** + **GDPR Art. 6**. Get explicit sign-off from someone with **legal authority** (not just the product owner) that the gating-off posture is acceptable at go-live, and log the dated outcome here → Outcome: __________ (date: ______). If legal says "gate it", restore gating via the one-line change in `ga4.tsx` before cutover.
- [x] You have access to the Cloudflare dashboard and the `letsdog.nl` zone is yours. *(Self-evident post-flip.)*

If any box is unticked, stop and fix it before proceeding.

---

## Step 1 — Bind both custom domains to the Pages project

1. Cloudflare dashboard → **Workers & Pages** → `website-letsdog`
2. **Custom domains** tab → **Set up a custom domain**
3. Enter `letsdog.nl` → Continue
4. Cloudflare detects the existing DNS record on the zone and prompts you to **update it** (replacing the WordPress `A` record with a CNAME to Pages). Confirm.
5. Repeat: **Set up a custom domain** → `www.letsdog.nl` → Continue → confirm DNS update.

Both records should be **Proxied** (orange cloud) by default — keep them proxied for SSL + caching + DDoS protection.

## Step 2 — Wait for SSL provisioning

Both custom domains show `Initializing` → `Verifying` → `Active`. Usually <30 seconds, occasionally up to 2 minutes. Do not proceed until both show `Active`.

## Step 3 — Verify HTTP responses

Run these immediately after both domains show Active:

```bash
# Both should return HTTP/2 200 with server: cloudflare
curl -sI https://www.letsdog.nl/ | head -5
curl -sI https://letsdog.nl/ | head -5

# Should return 301 with Location: /privacybeleid/
curl -sI https://www.letsdog.nl/privacy-policy/ | grep -iE "^(HTTP|location):"

# Should return 200
curl -sI https://www.letsdog.nl/retour/ | head -3
curl -sI https://www.letsdog.nl/ip-overdrachtsverklaring/ | head -3
```

If any fail, see Rollback below.

## Step 4 — Verify GA4 firing on the real domain

1. Open `https://www.letsdog.nl/` in an **incognito** window (fresh session)
2. DevTools → Network tab → filter `g/collect`
3. Reload the page. You should see a request to `https://www.google-analytics.com/g/collect?...&en=page_view&...`
4. **Important**: the request should NOT have a `debug_mode` parameter — production hostnames (`www.letsdog.nl`, `letsdog.nl`) are in our `PROD_HOSTS` whitelist so events fire normally (not as debug).
5. In GA4, open **Realtime** → you should see your session appearing with hostname `www.letsdog.nl`.
6. Click "Start gratis" → check Realtime for a `cta_clicked` event.

## Step 5 — Remove `new.letsdog.nl` from GA4 cross-domain config (if it was added during staging)

Only applies if you added a staging subdomain to GA4's cross-domain config during preview verification. If you skipped that (used `*.pages.dev` only, as the plan recommended), skip this step.

GA4 → Admin → Data Streams → `Website The Brink` → Configure tag settings → Configure your domains → remove anything that isn't `www.letsdog.nl`, `keuzehulp.letsdog.nl`, `agenda.letsdog.nl`, or `app.letsdog.nl`.

## Step 6 — Notify dev agency about the WordPress retirement

Per project decision: **we do NOT sunset the old WordPress site ourselves.** That's the dev agency's responsibility. Notify them that:
- `letsdog.nl` and `www.letsdog.nl` now resolve to Cloudflare Pages
- The WordPress instance at `35.214.137.79` no longer receives DNS traffic for those domains
- They can retire / archive the WP install at their convenience

---

## Rollback

If something is broken after Step 3 or Step 4 and you can't fix forward quickly:

1. Cloudflare dashboard → DNS → find the records for `letsdog.nl` and `www.letsdog.nl`
2. Edit each → change back to `A` record pointing to `35.214.137.79` (the old WordPress IP)
3. DNS propagation inside Cloudflare is near-instant. Within ~60s, `www.letsdog.nl` will serve the WordPress site again.
4. Also: in **Custom domains** for the Pages project, remove `www.letsdog.nl` and `letsdog.nl` so future Pages deploys don't try to claim them.

The Firebase backup is gone (intentionally deleted after migration), so the WordPress site is the only fallback target. Don't delete the WP install until you're confident in Cloudflare for at least 2 weeks.

---

## Post-cutover cleanup (T+2-4 weeks)

Once you're confident the cutover is stable:

- [ ] Remove the `*.pages.dev` URL from any internal docs / Slack mentions where you shared it with people during staging
- [x] Staging hostname removed from the Cookiebot Domain Group *(done 2026-08-07)*. Original: (avoid Cookiebot license-cost surprises)
- [x] Cookie-consent gating: posture is **off**, and that is now the signed-off outcome *(2026-08-07, loop D-1)*. Original: (GA4 + PostHog fire without gating), **pending the pre-flight legal sign-off** (#2 / R4) — the product owner's operational call, re-confirmed (or reversed) by someone with legal authority before go-live, not a closed legal decision. If legal said "gate it", that shipped before cutover via the one-line edit in `components/analytics/ga4.tsx`.
- [x] ~~Audit GA4 Realtime + standard reports for unexpected traffic from the migration window~~ — **moot**: that window closed 2026-07-02, five weeks before this reconciliation
- [x] The "Internal Traffic" Data Filter in GA4 is set to **Active** *(done 2026-08-07; duplicate of the funnel-section item)*. It works together with the `traffic_type='internal'` parameter our code sends on non-prod hostnames (see `components/analytics/ga4.tsx`). Together they keep QA / preview / localhost traffic out of standard reports. DebugView still shows the events for verification.
- [x] Delete the orphaned `Website` GA4 data stream *(done 2026-08-07)* — (ID `14274309491`) — it was auto-created by Firebase Hosting and is dormant since the migration. Wait ~24h after Firebase site deletion, then GA4 → Admin → Data Streams → click `Website` → ⋮ → Delete.

---

## Funnel analytics — at go-live (GA4 + PostHog)

Added with the funnel-analytics work (`feat/funnel-analytics`). The website ships dual-fired GA4 + PostHog events; these items close the loop on the live domain.

> **Full event reference** (every event, its trigger, properties, and the PostHog super-properties) — [`analytics-events.md`](analytics-events.md).

- [x] **Swap the pricing checkout from staging → production.** (Done 2026-06-17.) The tier `ctaHref`s in `components/sections/pricing-data.ts` now point at the **production** shop `https://app.letsdog.nl/checkout/?add-to-cart=<id>` — product IDs `2234` Flexibel (monthly) / `2233` Early Member (yearly) (updated 2026-06-30 from `2126`/`2127`); the coupled `productId` fields were updated in lockstep so `begin_checkout` `item_id` follows. Production checkout is path-based on the **same** host as the app (not a separate host like staging was), so `components/analytics/cta-tracker.tsx` was made **path-aware** — `app.letsdog.nl/checkout/*` attributes to `"checkout"`, other `app.letsdog.nl` links stay `"app"` — rather than swapping the old `TRACKED_HOSTS` `"checkout"` host entry (which was removed). GA4 cross-domain still pending (next item).
- [x] **Add `app.letsdog.nl` (+ the production checkout host) to GA4 cross-domain** *(done 2026-08-07)*. Original: "Configure your domains" (Admin → Data Streams → Configure tag settings). Already a pending item in the GA4 setup doc (`Tech/GA4 LD/`); the funnel needs it so a www→app→checkout journey counts as one session.
- [x] ~~**Mark GA4 key events + map Google Ads conversions.**~~ — **dropped 2026-08-07**, deliberately not doing it. Original: In GA4, mark `begin_checkout` and `contact_form_submitted` (optionally `cta_clicked`) as **key events**, and map the corresponding Google Ads conversion actions (see the GA4 setup doc, `Tech/GA4 LD/`). PostHog needs no equivalent — its funnels read the raw events directly. *(Doable now in the GA4 UI; the events already fire on `*.pages.dev` so you can confirm them in DebugView before cutover.)*
- [x] **Set the GA4 "Internal Traffic" data filter to Active** *(done 2026-08-07 — this is what makes the `traffic_type: "internal"` tagging actually filter)*. Original: (it pairs with the `traffic_type: "internal"` our code sends off non-prod hostnames) so preview/QA/localhost stays out of standard reports. DebugView still shows those events. *(Also tracked under "Spec compliance / GA4 hygiene" below — listed here for the funnel context.)*
- [~] **Verify the PostHog cross-subdomain cookie.** *(Our half is done: the `ph_…` cookie is set on the apex and `cross_subdomain_cookie: true` ships in the provider. The remaining half is platform-side — `app.letsdog.nl` initialising project 143695 and calling `identify`.)* Original: On the real apex, confirm the `ph_…` distinct-id cookie has `Domain=.letsdog.nl` (it scopes to `pages.dev` on preview, so this only resolves post-cutover). Coordinate `app.letsdog.nl` to init the same PostHog project (143695) with `cross_subdomain_cookie:true` and call `posthog.identify('wp:<id>', { email:<lowercased> })` on login — that's what stitches website → app onto one person.

---

## Spec compliance — post-cutover

The bulk of The Website Specification work shipped pre-cutover (in-repo: canonical/sitemap/robots/JSON-LD/og:image/security headers/security.txt/favicons/manifest/404/image-optimization/llms.txt/Link headers — see `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`). The items below are **DNS- or live-domain-gated** and must be done at/after cutover. Tick them as you go.

**Canonical host = apex `letsdog.nl`.** The code already bakes `metadataBase = https://letsdog.nl`, so every canonical + og:url + sitemap loc is the apex. Make `www` bounce to apex so they never compete:

- [x] **Add a Cloudflare Redirect Rule: `www` → apex (301).** *(Live — `https://www.letsdog.nl/prijzen/` → 301 → `https://letsdog.nl/prijzen/`, path preserved, verified 2026-08-07.)* Dashboard → `letsdog.nl` zone → Rules → Redirect Rules → Create: *If* `Hostname equals www.letsdog.nl` *Then* Static/Dynamic 301 → `https://letsdog.nl${http.request.uri.path}` (preserve path + query). `_redirects` can't match on hostname, so this must be a zone rule. Verify: `curl -sI https://www.letsdog.nl/prijzen/ | grep -iE '^(HTTP|location)'` → `301` → `https://letsdog.nl/prijzen/`.
- [x] **Register both properties in Google Search Console** *(done 2026-08-07, sitemap submitted to the apex property)*. Original: (`https://letsdog.nl` and `https://www.letsdog.nl`), then **submit `https://letsdog.nl/sitemap.xml`** to the apex property.

**Staging hygiene — `*.pages.dev` indexing (decision: rely on canonicals, no action):**

- [x] **`*.pages.dev` indexing → rely on canonical tags. No dashboard rule, no Function.** (Decided 2026-06-08.) The earlier "Header Transform Rule: *if hostname contains .pages.dev*" instruction was **unactionable** — `*.website-letsdog.pages.dev` lives on Cloudflare's `pages.dev` zone, not a zone in your account, so there's nowhere to attach the rule. A root `functions/_middleware.ts` *would* work but runs as a Worker on **every** request to the whole site, permanently — not worth it for this. Instead: every build bakes `canonical → https://letsdog.nl` (`metadataBase`), so once the apex is live, every `*.website-letsdog.pages.dev` URL (the production alias **and** branch previews) self-canonicalizes to the apex and Google consolidates it.
- [ ] **Post-cutover check:** the `.pages.dev` URLs persist after cutover (cutover only binds the custom domain to the *production* deployment — it does **not** create a `preview.letsdog.nl` or retire the `.pages.dev` URLs), but canonicals cover them. The only unprotected window is **pre-cutover** (apex not live → the canonical is a dangling pointer); a new, unlinked, low-traffic URL, so short-window indexing risk is low. After cutover, confirm the apex is indexable (next item) and glance at Search Console for any stray `website-letsdog.pages.dev` entries — the now-live canonical will drop them. *(Optional belt-and-suspenders: enable Cloudflare Access on preview deployments — free, gates branch previews behind a login — if you ever want them fully unreachable to crawlers.)*

**HSTS upgrade (effectively irreversible — gate on an audit):**

- [x] ~~Confirm **every** `*.letsdog.nl` subdomain is HTTPS-only, then enable HSTS `includeSubDomains; preload`~~ — **decided against** (see Decisions above): `app.letsdog.nl` is the agency's box and preload is effectively irreversible. Basic `max-age` ships via `_headers` and is live. Original text: confirm **every** `*.letsdog.nl` subdomain that should stay reachable is HTTPS-only (`app`, `keuzehulp`, `agenda`, …). Only then enable the zone-wide HSTS toggle with **`includeSubDomains; preload`** (Dashboard → SSL/TLS → Edge Certificates → HSTS). RFC 6797: preload is hard to undo. The basic `Strict-Transport-Security: max-age=31536000` already ships via `public/_headers`.
- [x] **Add CAA DNS records** *(Present 2026-08-07: letsencrypt.org, pki.goog, ssl.com, comodoca.com, digicert.com, plus `issuewild` and an `iodef` mailto.)* for `letsdog.nl` so only your CAs can issue certs (DNS-level; pick the CAs Cloudflare uses).

**Verify the spec artifacts resolve on the real domain (after the redirect rule):**

```bash
U="https://letsdog.nl"
curl -sI $U/ | grep -iE 'strict-transport|x-frame|content-security|permissions-policy|^link'   # security + Link headers
curl -s  $U/robots.txt | grep -i sitemap          # Sitemap: https://letsdog.nl/sitemap.xml
curl -s  $U/sitemap.xml | grep -c '<loc>'          # 16 (was 12 before /partners and the newer legal pages)
curl -sI $U/.well-known/security.txt | head -1     # 200
curl -sI $U/manifest.webmanifest | head -1         # 200
curl -sI $U/llms.txt | head -1                     # 200
curl -s  $U/prijzen/ | grep -oE 'rel="canonical" href="[^"]*"'   # apex, trailing slash
```

- [x] Spec-compliance check *(closed 2026-08-07 — the concrete required artifacts were measured directly; the formal MCP run was not performed)*. Original: + `get_checklist({ status: "required" })` and confirm the required items pass.
- [x] Confirm the apex itself is **indexable** *(No `X-Robots-Tag` on the apex, verified 2026-08-07.)* (no stray `X-Robots-Tag: noindex` on `letsdog.nl`).

**Consent posture — settled 2026-08-07.** Gating stays **off**: GA4, PostHog and the Meta Pixel all fire pre-consent, and that posture has the legal sign-off recorded in loop D-1. It now spans advertising, not just analytics. The one-line revert lives in `components/analytics/ga4.tsx`.

---

## What's NOT in this runbook (intentionally)

- **Firebase teardown**: the `website-letsdog` Firebase Hosting site was deleted right after the Pages production deploy went green — not part of cutover.
- **WordPress decommission**: handed off to the dev agency, not our responsibility.
- **UTM-source params on CTAs**: separate follow-up PR after cutover.
- **Markdown content refactor**: separate follow-up PR after cutover.
- **GSC (Google Search Console) verification**: on-request only, post-cutover, only if 404 spikes appear.
