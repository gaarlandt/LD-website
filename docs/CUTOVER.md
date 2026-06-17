# DNS Cutover Runbook — `letsdog.nl` → Cloudflare Pages

This is a self-contained playbook for flipping `www.letsdog.nl` and `letsdog.nl` from the old WordPress site (SiteGround, `A 35.214.137.79`) over to the new Next.js site on Cloudflare Pages (`website-letsdog.pages.dev`).

**Do not regenerate this doc each time you ask "what's the cutover?" — read this. If the procedure changes, edit this file.**

---

## Before you start — pre-flight checklist

Tick these off **before** touching DNS:

- [ ] Production deploy on `website-letsdog.pages.dev` is green and the homepage renders correctly. Test: `curl -sI https://website-letsdog.pages.dev/ | head -3` returns `HTTP/2 200`.
- [ ] All new pages serve 200 on production: `/retour/`, `/ip-overdrachtsverklaring/`, `/privacybeleid/`, `/cookieverklaring/`, `/ai-gebruiksvoorwaarden/`.
- [ ] Redirects work on production: `curl -sI https://website-letsdog.pages.dev/privacy-policy/` returns `301` with `Location: /privacybeleid/`.
- [ ] Renamed-route redirect works: `curl -sI https://website-letsdog.pages.dev/puppyagenda/` returns `301` → `Location: /puppycursus/` (and the bare `/puppyagenda` too). `/puppyagenda` → `/puppycursus` was renamed 2026-06-16 (keyword-rich URL matching the nav label); old URL kept alive via `public/_redirects`.
- [ ] GA4 fires on production (check Realtime in GA4 — should see `hostname=website-letsdog.pages.dev` with `debug_mode=true`).
- [ ] **Contact form delivers:** `POSTMARK_SERVER_TOKEN` is set in Cloudflare Pages (Production **and** Preview) and `CONTACT_FROM` is a Postmark-verified sender. Submit the form on production and confirm it arrives at `support@letsdog.nl` (check Postmark Activity). Without the token, `/api/contact` returns 500.
- [ ] **Turnstile is live (anti-abuse on the contact form):** create a **Managed** Turnstile widget with hostnames `letsdog.nl` + `www.letsdog.nl` + `website-letsdog.pages.dev`, then in Cloudflare Pages → Variables and Secrets (**Production** scope) set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a **plaintext variable** (public Site Key — must be inlined at build) and `TURNSTILE_SECRET_KEY` as an encrypted **secret** (Secret Key). Leave the Preview scope unset (branch previews use the always-pass test keys). A production host with the secret unset fails closed (the form returns 500), so set the keys before/at merge. Verify on production that the widget renders and a real submission succeeds.
- [ ] Cookiebot Domain Group includes both `www.letsdog.nl` and `letsdog.nl` (it should already, since those are the original WP domains). Verify in `manage.cookiebot.com` → Settings → Domain Groups.
- [ ] You have access to the Cloudflare dashboard and the `letsdog.nl` zone is yours.

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
- [ ] If you added the staging hostname to Cookiebot Domain Group, remove it (avoid Cookiebot license-cost surprises)
- [ ] Cookie-consent gating: **decided to keep as-is** (GA4 fires without gating) per the 2026-05-30 spec-compliance review — see decision #1 in the plan. Do not restore gating unless the legal position changes; if it does, see `components/analytics/ga4.tsx` for the one-line change.
- [ ] Audit GA4 Realtime + standard reports for any unexpected traffic patterns from the migration window
- [ ] The "Internal Traffic" Data Filter in GA4 should be set to **Active** (not Testing). It works together with the `traffic_type='internal'` parameter our code sends on non-prod hostnames (see `components/analytics/ga4.tsx`). Together they keep QA / preview / localhost traffic out of standard reports. DebugView still shows the events for verification.
- [ ] Delete the orphaned `Website` GA4 data stream (ID `14274309491`) — it was auto-created by Firebase Hosting and is dormant since the migration. Wait ~24h after Firebase site deletion, then GA4 → Admin → Data Streams → click `Website` → ⋮ → Delete.

---

## Funnel analytics — at go-live (GA4 + PostHog)

Added with the funnel-analytics work (`feat/funnel-analytics`). The website ships dual-fired GA4 + PostHog events; these items close the loop on the live domain.

> **Full event reference** (every event, its trigger, properties, and the PostHog super-properties) — [`analytics-events.md`](analytics-events.md).

- [x] **Swap the pricing checkout from staging → production.** (Done 2026-06-17.) The tier `ctaHref`s in `components/sections/pricing-data.ts` now point at the **production** shop `https://app.letsdog.nl/checkout/?add-to-cart=<id>` — product IDs `2109` Flexibel (monthly) / `2107` Early Member (yearly); the coupled `productId` fields were updated in lockstep so `begin_checkout` `item_id` follows. Production checkout is path-based on the **same** host as the app (not a separate host like staging was), so `components/analytics/cta-tracker.tsx` was made **path-aware** — `app.letsdog.nl/checkout/*` attributes to `"checkout"`, other `app.letsdog.nl` links stay `"app"` — rather than swapping the old `TRACKED_HOSTS` `"checkout"` host entry (which was removed). GA4 cross-domain still pending (next item).
- [ ] **Add `app.letsdog.nl` (+ the production checkout host) to GA4 cross-domain** "Configure your domains" (Admin → Data Streams → Configure tag settings). Already a pending item in the GA4 setup doc (`Tech/GA4 LD/`); the funnel needs it so a www→app→checkout journey counts as one session.
- [ ] **Mark GA4 key events + map Google Ads conversions.** In GA4, mark `begin_checkout` and `contact_form_submitted` (optionally `cta_clicked`) as **key events**, and map the corresponding Google Ads conversion actions (see the GA4 setup doc, `Tech/GA4 LD/`). PostHog needs no equivalent — its funnels read the raw events directly. *(Doable now in the GA4 UI; the events already fire on `*.pages.dev` so you can confirm them in DebugView before cutover.)*
- [ ] **Set the GA4 "Internal Traffic" data filter to Active** (it pairs with the `traffic_type: "internal"` our code sends off non-prod hostnames) so preview/QA/localhost stays out of standard reports. DebugView still shows those events. *(Also tracked under "Spec compliance / GA4 hygiene" below — listed here for the funnel context.)*
- [ ] **Verify the PostHog cross-subdomain cookie.** On the real apex, confirm the `ph_…` distinct-id cookie has `Domain=.letsdog.nl` (it scopes to `pages.dev` on preview, so this only resolves post-cutover). Coordinate `app.letsdog.nl` to init the same PostHog project (143695) with `cross_subdomain_cookie:true` and call `posthog.identify('wp:<id>', { email:<lowercased> })` on login — that's what stitches website → app onto one person.

---

## Spec compliance — post-cutover

The bulk of The Website Specification work shipped pre-cutover (in-repo: canonical/sitemap/robots/JSON-LD/og:image/security headers/security.txt/favicons/manifest/404/image-optimization/llms.txt/Link headers — see `docs/plans/2026-05-30-001-feat-website-spec-compliance-plan.md`). The items below are **DNS- or live-domain-gated** and must be done at/after cutover. Tick them as you go.

**Canonical host = apex `letsdog.nl`.** The code already bakes `metadataBase = https://letsdog.nl`, so every canonical + og:url + sitemap loc is the apex. Make `www` bounce to apex so they never compete:

- [ ] **Add a Cloudflare Redirect Rule: `www` → apex (301).** Dashboard → `letsdog.nl` zone → Rules → Redirect Rules → Create: *If* `Hostname equals www.letsdog.nl` *Then* Static/Dynamic 301 → `https://letsdog.nl${http.request.uri.path}` (preserve path + query). `_redirects` can't match on hostname, so this must be a zone rule. Verify: `curl -sI https://www.letsdog.nl/prijzen/ | grep -iE '^(HTTP|location)'` → `301` → `https://letsdog.nl/prijzen/`.
- [ ] **Register both properties in Google Search Console** (`https://letsdog.nl` and `https://www.letsdog.nl`), then **submit `https://letsdog.nl/sitemap.xml`** to the apex property.

**Staging hygiene — `*.pages.dev` indexing (decision: rely on canonicals, no action):**

- [x] **`*.pages.dev` indexing → rely on canonical tags. No dashboard rule, no Function.** (Decided 2026-06-08.) The earlier "Header Transform Rule: *if hostname contains .pages.dev*" instruction was **unactionable** — `*.website-letsdog.pages.dev` lives on Cloudflare's `pages.dev` zone, not a zone in your account, so there's nowhere to attach the rule. A root `functions/_middleware.ts` *would* work but runs as a Worker on **every** request to the whole site, permanently — not worth it for this. Instead: every build bakes `canonical → https://letsdog.nl` (`metadataBase`), so once the apex is live, every `*.website-letsdog.pages.dev` URL (the production alias **and** branch previews) self-canonicalizes to the apex and Google consolidates it.
- [ ] **Post-cutover check:** the `.pages.dev` URLs persist after cutover (cutover only binds the custom domain to the *production* deployment — it does **not** create a `preview.letsdog.nl` or retire the `.pages.dev` URLs), but canonicals cover them. The only unprotected window is **pre-cutover** (apex not live → the canonical is a dangling pointer); a new, unlinked, low-traffic URL, so short-window indexing risk is low. After cutover, confirm the apex is indexable (next item) and glance at Search Console for any stray `website-letsdog.pages.dev` entries — the now-live canonical will drop them. *(Optional belt-and-suspenders: enable Cloudflare Access on preview deployments — free, gates branch previews behind a login — if you ever want them fully unreachable to crawlers.)*

**HSTS upgrade (effectively irreversible — gate on an audit):**

- [ ] Confirm **every** `*.letsdog.nl` subdomain that should stay reachable is HTTPS-only (`app`, `keuzehulp`, `agenda`, …). Only then enable the zone-wide HSTS toggle with **`includeSubDomains; preload`** (Dashboard → SSL/TLS → Edge Certificates → HSTS). RFC 6797: preload is hard to undo. The basic `Strict-Transport-Security: max-age=31536000` already ships via `public/_headers`.
- [ ] **Add CAA DNS records** for `letsdog.nl` so only your CAs can issue certs (DNS-level; pick the CAs Cloudflare uses).

**Verify the spec artifacts resolve on the real domain (after the redirect rule):**

```bash
U="https://letsdog.nl"
curl -sI $U/ | grep -iE 'strict-transport|x-frame|content-security|permissions-policy|^link'   # security + Link headers
curl -s  $U/robots.txt | grep -i sitemap          # Sitemap: https://letsdog.nl/sitemap.xml
curl -s  $U/sitemap.xml | grep -c '<loc>'          # 12
curl -sI $U/.well-known/security.txt | head -1     # 200
curl -sI $U/manifest.webmanifest | head -1         # 200
curl -sI $U/llms.txt | head -1                     # 200
curl -s  $U/prijzen/ | grep -oE 'rel="canonical" href="[^"]*"'   # apex, trailing slash
```

- [ ] Run the spec MCP `audit_url("https://letsdog.nl")` + `get_checklist({ status: "required" })` and confirm the required items pass.
- [ ] Confirm the apex itself is **indexable** (no stray `X-Robots-Tag: noindex` on `letsdog.nl`).

**Decision already made:** cookie-consent gating stays off (see the post-cutover-cleanup item above).

---

## What's NOT in this runbook (intentionally)

- **Firebase teardown**: the `website-letsdog` Firebase Hosting site was deleted right after the Pages production deploy went green — not part of cutover.
- **WordPress decommission**: handed off to the dev agency, not our responsibility.
- **UTM-source params on CTAs**: separate follow-up PR after cutover.
- **Markdown content refactor**: separate follow-up PR after cutover.
- **GSC (Google Search Console) verification**: on-request only, post-cutover, only if 404 spikes appear.
