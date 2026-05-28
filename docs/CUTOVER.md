# DNS Cutover Runbook — `letsdog.nl` → Cloudflare Pages

This is a self-contained playbook for flipping `www.letsdog.nl` and `letsdog.nl` from the old WordPress site (SiteGround, `A 35.214.137.79`) over to the new Next.js site on Cloudflare Pages (`website-letsdog.pages.dev`).

**Do not regenerate this doc each time you ask "what's the cutover?" — read this. If the procedure changes, edit this file.**

---

## Before you start — pre-flight checklist

Tick these off **before** touching DNS:

- [ ] Production deploy on `website-letsdog.pages.dev` is green and the homepage renders correctly. Test: `curl -sI https://website-letsdog.pages.dev/ | head -3` returns `HTTP/2 200`.
- [ ] All new pages serve 200 on production: `/retour/`, `/ip-overdrachtsverklaring/`, `/privacybeleid/`, `/cookieverklaring/`, `/ai-gebruiksvoorwaarden/`.
- [ ] Redirects work on production: `curl -sI https://website-letsdog.pages.dev/privacy-policy/` returns `301` with `Location: /privacybeleid/`.
- [ ] GA4 fires on production (check Realtime in GA4 — should see `hostname=website-letsdog.pages.dev` with `debug_mode=true`).
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
- [ ] Consider revisiting the Cookiebot bypass decision: do you want real consent gating? See `components/analytics/ga4.tsx` for the one-line change to restore it
- [ ] Audit GA4 Realtime + standard reports for any unexpected traffic patterns from the migration window
- [ ] The "Internal Traffic" Data Filter in GA4 should be set to **Active** (not Testing). It works together with the `traffic_type='internal'` parameter our code sends on non-prod hostnames (see `components/analytics/ga4.tsx`). Together they keep QA / preview / localhost traffic out of standard reports. DebugView still shows the events for verification.
- [ ] Delete the orphaned `Website` GA4 data stream (ID `14274309491`) — it was auto-created by Firebase Hosting and is dormant since the migration. Wait ~24h after Firebase site deletion, then GA4 → Admin → Data Streams → click `Website` → ⋮ → Delete.

---

## What's NOT in this runbook (intentionally)

- **Firebase teardown**: the `website-letsdog` Firebase Hosting site was deleted right after the Pages production deploy went green — not part of cutover.
- **WordPress decommission**: handed off to the dev agency, not our responsibility.
- **UTM-source params on CTAs**: separate follow-up PR after cutover.
- **Markdown content refactor**: separate follow-up PR after cutover.
- **GSC (Google Search Console) verification**: on-request only, post-cutover, only if 404 spikes appear.
