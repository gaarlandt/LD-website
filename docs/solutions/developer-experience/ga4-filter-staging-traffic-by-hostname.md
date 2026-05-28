---
title: "Filter GA4 staging traffic by hostname when Internal Traffic UI is IP-only"
date: 2026-05-28
problem_type: developer-experience
category: developer-experience
module: analytics
tags:
  - "ga4"
  - "cloudflare-pages"
  - "internal-traffic"
  - "data-filters"
  - "debugview"
  - "staging"
applies_when: "You deploy to a CDN/proxy host (Cloudflare Pages, Vercel, Netlify, etc.) where preview/staging requests don't originate from a fixed IP, AND you want those events excluded from standard GA4 reports while still being able to verify GA4 fires correctly on preview"
---

## Context

GA4's "Internal Traffic" rule UI (Admin → Data Streams → Configure tag settings → Define internal traffic) **only accepts IP-based match criteria** — IP equals, IP begins with, IP in CIDR range, etc. There is no hostname-based option.

This breaks the standard "exclude staging from reports" pattern when staging runs on a CDN-proxied host:

- **Cloudflare Pages**: every request appears to come from a Cloudflare edge IP, not the visitor's IP. You can't whitelist a fixed IP for your own staging traffic because there isn't one.
- **Vercel, Netlify, Fly.io** static deployments: same problem — visitor IPs vary, edge IPs vary, you can't pin down "this is staging".
- Most teams want to filter staging by **hostname** (e.g., `*.pages.dev`, `*.vercel.app`, `staging.example.com`) rather than IP. The GA4 UI doesn't support this.

The naive workaround — "just check Realtime, filter by hostname dimension visually" — doesn't compound. Reports retain the polluted data; comparisons get harder; conversion totals are off; nobody remembers to apply the hostname filter every time.

## Guidance

Set the `traffic_type` parameter directly in your `gtag('config', ...)` call based on hostname. The existing "Internal Traffic" Data Filter on the property (Admin → Data Filters) doesn't care HOW `traffic_type` got tagged — it just filters events that have it.

The rendered HTML in your `<head>` should look like:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  var __np = ["www.example.com", "example.com"].indexOf(location.hostname) === -1;
  gtag('config', 'G-XXXXXXXXXX',
    __np
      ? { debug_mode: true, traffic_type: 'internal' }
      : {}
  );
</script>
```

In a React/Next.js project, render those two `<script>` elements from a server component in your root layout. The `__np` variable means "not prod" — when true, send the internal-traffic flag; when false, send no extra params and let events flow normally.

Then in GA4 Admin → Data Filters, ensure you have an "Internal Traffic" filter (Operation: Exclude, Parameter: `traffic_type` = `internal`) and set it to **Active**.

Result:
- Production hostnames send events normally → flow into Realtime + standard reports.
- Non-prod hostnames send events with `traffic_type='internal'` AND `debug_mode=true` → filter excludes them from standard reports.

## Why This Matters

This pattern keeps three things working at once:

1. **Production reports stay clean.** No QA noise, no preview deployments inflating user counts, no fake conversions.
2. **Standard GA4 conventions still apply.** You're using GA4's own `traffic_type='internal'` mechanism (the same one the IP-based UI sets). Any tooling that knows about Internal Traffic — comparison filters, custom reports, Looker Studio dashboards — works without special-casing your setup.
3. **No per-environment GA4 properties.** A common bad pattern is having a separate "staging" GA4 property. Then events from cross-domain links break, the GA4 setup doc has to track two property IDs, Google Ads conversions can't bridge environments. Single property + hostname filter avoids all that.

## When to Apply

**Always apply when:**
- Your staging/preview environment uses a CDN-proxied hostname (`*.pages.dev`, `*.vercel.app`, etc.) and you've already created a single GA4 property covering all environments.
- You have a small finite list of production hostnames (1-3 domains).

**Don't apply when:**
- You have a fixed VPN egress IP for all internal users and want IP-based filtering — GA4's built-in UI is fine.
- You have separate GA4 properties per environment — this filter doesn't apply, your data is already separated.

## Examples

### GA4 Data Filter that pairs with the above

Admin → Data Filters → Create Filter:
- Filter type: **Internal Traffic** (built-in)
- Filter operation: **Exclude**
- Parameter value (the `traffic_type` to match): `internal`
- State: **Active** (only switch from Testing once you've verified)

### Important behavior to know: Active filter affects DebugView too

When the Data Filter is **Active**, it excludes matching events from **both standard reports AND DebugView**. This means you cannot visually verify GA4 firing on the preview URL while the filter is Active — DebugView will be empty.

To debug an issue with GA4 firing on staging:

1. Admin → Data Filters → click `Internal Traffic` → state: **Testing**
2. Reload the preview URL
3. Events now appear in Realtime + DebugView (with a `Test data filter name` dimension marker)
4. Verify what you need to verify
5. Switch filter back to **Active**

The Network tab (`google-analytics.com/g/collect` requests) and the gtag debug console output (`GTAG Command: "config"... configuration: {debug_mode: true, traffic_type: "internal"}`) are always reliable proof that events fire, regardless of filter state — DebugView is just one of several ways to verify.

### Verification curl on production

```bash
# After cutover, real production hosts should NOT carry traffic_type=internal
curl -s https://www.example.com/ | grep -oE "gtag\('config'[^)]+\)"
# Expected output includes the ternary; with __np=false (hostname matches
# PROD_HOSTS), the second arg evaluates to {} — no traffic_type sent,
# events flow normally.
```

---

**See also**: Cloudflare Pages `_headers` file should not have overlapping path patterns (Cloudflare merges Cache-Control directives, breaks immutable caching). Document that separately when next encountered.
