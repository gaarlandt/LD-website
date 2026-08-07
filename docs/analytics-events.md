# Analytics events — Let's dog marketing website

A complete reference of every analytics event the website emits, for building dashboards/funnels (e.g. in PostHog) — here or in another project that consumes the shared PostHog project.

- **Project:** PostHog EU project **143695** (`https://eu.i.posthog.com`) + GA4 **`G-0FCGXJHMMY`** (shared across all Let's dog domains) + Meta Pixel **`1789754812188603`**.
- **Dual-fire:** every event below is sent to **both** GA4 (gtag) and PostHog through one chokepoint — `trackEvent(name, params)` in [`lib/analytics.ts`](../lib/analytics.ts). Each sink is guarded independently (a blocked sink never suppresses the other). **Add events only via `trackEvent`** — never call `gtag`/`posthog` directly.
- **Meta Pixel is a third sink on that same chokepoint, but it receives only a mapped subset** — see [Meta Pixel](#meta-pixel) below.
- **App identifier:** this is the **`website`** app. App-side events (`sign_up`, `purchase`) live on `app.letsdog.nl` and are owned separately — not emitted here.

## PostHog super-properties (on every PostHog event)

Registered once at init ([`components/analytics/posthog-provider.tsx`](../components/analytics/posthog-provider.tsx)) — use these to filter/segment dashboards:

| Property | Value | Notes |
|---|---|---|
| `app` | `"website"` | Distinguishes this app from BreedSelector / Puppy Agenda / app.letsdog.nl in the shared project. **Filter every website dashboard on `app = "website"`.** |
| `platform` | `"web"` | |
| `environment` | `"production"` \| `"preview"` | `production` only on `www.letsdog.nl` / `letsdog.nl`; everything else (`*.pages.dev`, localhost) is `preview`. **Filter dashboards on `environment = "production"`** to drop preview/QA noise. Pre-cutover there is *no* production data yet. |

GA4 equivalent: non-production hostnames send `debug_mode: true` + `traffic_type: "internal"`, filtered out by the GA4 "Internal Traffic" data filter (DebugView still shows them).

## Identity

- **`identifyLead(email)`** ([`lib/analytics.ts`](../lib/analytics.ts)) — the **only** PostHog `identify` on this site, fired on contact-form success. Calls `posthog.identify(<lowercased email>, { email: <lowercased email> })`.
- **Lowercased email is the cross-product join key** across all Let's dog apps. No `alias()` chains, no GA4 user-id mapping. `person_profiles: "identified_only"` (the marketing site is mostly anonymous).

## Events

All events are dual-fired (GA4 + PostHog) and carry the PostHog super-properties above. Properties listed are the event-specific params passed to `trackEvent`.

| Event | Fires when | Properties | GA4 role |
|---|---|---|---|
| `$pageview` | Every page load + App-Router soft navigation (PostHog history-based, via `defaults: "2026-01-30"`) | PostHog-standard (`$current_url`, `$pathname`, …) | GA4 sends its own `page_view` via the gtag config |
| `$pageleave` | Page/tab leave (PostHog automatic) | PostHog-standard | — |
| `cta_clicked` | Click on any tracked outbound / pricing / mail CTA — delegated document listener ([`cta-tracker.tsx`](../components/analytics/cta-tracker.tsx)), rules in [`lib/cta-destination.ts`](../lib/cta-destination.ts) | `link_url`, `link_text`, `link_location` (`"navbar"` \| `"body"`), `link_destination` (`"app"` \| `"keuzehulp"` \| `"agenda"` \| `"checkout"` \| `"pricing"` \| `"email"`) | `link_location` + `link_destination` are **registered GA4 custom dimensions — do not rename**. Adding a new *value* (as `"email"` was, 2026-08-03) is fine; renaming the dimension is not |
| `view_item_list` | Pricing section scrolls into view (IntersectionObserver, once per page) ([`pricing-view-tracker.tsx`](../components/sections/pricing-view-tracker.tsx)) | `item_list_name` (`"pricing"`), `source` (`"prijzen_page"` \| `"homepage"`) | GA4 ecommerce |
| `begin_checkout` | Click on a pricing tier CTA ([`plan-cta.tsx`](../components/sections/plan-cta.tsx)) | `currency` (`"EUR"`), `value` (number), `billing_period` (`"monthly"` \| `"yearly"`), `items: [{ item_id, item_name, item_category: "membership", price, quantity }]` | GA4 ecommerce. `item_id` = the WooCommerce product id (`2234` monthly / `2233` yearly) |
| `contact_form_submitted` | Contact form submits successfully ([`contact-form-modal.tsx`](../app/contact/contact-form-modal.tsx)) | *(none)* — `identifyLead(email)` fires alongside it | conversion event |
| `creator_form_submitted` | Creator application submits successfully on `/partners` ([`creator-form-modal.tsx`](../components/sections/partners/creator-form-modal.tsx)) | `collaboration` (`"ambassador"` \| `"ugc"` \| `"both"` \| `"unsure"`) | conversion event — `identifyLead(email)` fires alongside it, same lowercased-email join key. **This is the `/partners` conversion metric**, not `cta_clicked` |

### A pricing CTA click emits two events

A click on a pricing tier CTA fires **both** `cta_clicked` (`link_destination: "checkout"`, with navbar/body + link_text attribution) **and** `begin_checkout` (plan + value). This is intentional. **Build the checkout funnel on `begin_checkout`, not `cta_clicked`**, so one click isn't double-counted as two funnel steps.

### Mail CTAs (`link_destination: "email"`)

Added 2026-08-03 with the `/partners` page. A `mailto:` URL has an **empty hostname** under the WHATWG URL parser, so it fell straight through the host lookup and no mail CTA was tracked before this. The branch now runs first, ahead of that lookup.

**This covers every `mailto:` on the site — about 12 anchors across 9 pages, not just `/partners`.** The tracker is mounted once in the root layout, so the branch reaches:

| Surface | Address | Count |
|---|---|---|
| [`/contact`](../app/contact/contact-content.tsx) mail card | `mail@letsdog.nl` | 1 |
| 7 legal pages — privacybeleid (3), retour (2), algemene-voorwaarden, ai-gebruiksvoorwaarden, cookieverklaring, modelformulier-herroeping, ip-overdrachtsverklaring | `support@letsdog.nl` (9), `mail@letsdog.nl` (1) | 10 |

The legal-page links live in `content/*.md` and become real anchors via `legal-page-layout.tsx`, so they are easy to miss when reasoning about scope. Adding a mailto to any `content/*.md` silently joins this bucket.

**`/partners` is deliberately not in this table.** Its CTA opened a `mailto:` for one day (2026-08-03) and now opens the creator form modal instead, so the creator funnel is measured by `creator_form_submitted`, not by `link_destination: "email"`.

The legal pages previously emitted only `$pageview` (autocapture is off), so a GDPR-request click on `/privacybeleid` is now a tracked event — see the consent posture note below.

## Suggested funnels / dashboards

For a consumer project building dashboards off project 143695 (filter all on `app = "website"` + `environment = "production"`):

- **Pricing funnel:** `view_item_list` → `begin_checkout`, broken down by `billing_period` and `source` (homepage vs prijzen page).
- **CTA attribution:** `cta_clicked` broken down by `link_destination` (and `link_location`) — which surfaces drive clicks to app / checkout / keuzehulp / agenda.
- **Lead conversion:** `contact_form_submitted` (and the `identify` that accompanies it) as the marketing-site conversion; lowercased-email join lets you stitch to app-side `sign_up`/`purchase`.
- **Reach:** `$pageview` by `$pathname`.

## Meta Pixel

Pixel **`1789754812188603`**, installed 2026-08-07. Base code renders from the root layout's `<head>` ([`meta-pixel.tsx`](../components/analytics/meta-pixel.tsx)); the id comes from `NEXT_PUBLIC_META_PIXEL_ID` and **must be set in Cloudflare Pages → Variables and Secrets for Production *and* Preview**, or the component renders nothing and the pixel silently does not exist.

Unlike GA4/PostHog, Meta gets only the events that map onto a **standard event** — the mapping lives in [`lib/meta-events.ts`](../lib/meta-events.ts) and is unit-tested. Standard events are what an Ads Manager campaign can optimise and bid on; a custom event can't be bid on, so unmapped events are deliberately not sent.

| Internal event | Meta standard event | Params sent |
|---|---|---|
| `begin_checkout` | `InitiateCheckout` | `currency`, `value`, `content_type: "product"`, `content_ids`, `contents`, `num_items` |
| `contact_form_submitted` | `Lead` | `content_name: "contact_form"` |
| `creator_form_submitted` | `Lead` | `content_name: "creator_form"`, `content_category` (= `collaboration`) |
| `view_item_list` | `ViewContent` | `content_type: "product_group"`, `content_name`, `content_category` (= `source`) |
| *(page loads + soft navigation)* | `PageView` | — |

**`cta_clicked` is deliberately not mapped.** It is the busiest event on the site and has no standard-event equivalent; sending it would add volume no campaign can act on.

### Two limitations worth knowing before you build a campaign on this

1. **`Purchase` never fires here, and can't.** Payment happens on another domain — WooCommerce on `app.letsdog.nl` today, `mijn.letsdog.nl` after the platform cutover. This pixel sees the funnel only up to `InitiateCheckout`. Attributing revenue in Meta needs the pixel and/or the **Conversions API** on the platform side; that's separately-owned work (the GA4 half of it is planned in `docs/plans/2026-08-06-001-feat-ga4-platform-cutover-plan.md`, which scopes the Meta pixel out explicitly).
2. **No environment split.** GA4 tags non-production hostnames `traffic_type: "internal"` and PostHog tags `environment: "preview"`; Meta has no equivalent mechanism, so **preview and localhost events land in the same pixel dataset as production**. Testing a form on a preview URL emits a real `Lead`. Keep that in mind when reading Events Manager, and when testing conversion events prefer Meta's **Test Events** tab (Events Manager → Test Events) over a normal preview visit.

`PageView` fires **exactly once per page a visitor actually sees**, via two mechanisms that hand off to each other: the base code fires it on hard load, and [`meta-pixel-pageview.tsx`](../components/analytics/meta-pixel-pageview.tsx) fires it on each subsequent App Router **soft** navigation. The first client render is deliberately skipped so the landing page isn't counted twice. Without that component the whole site would report a single PageView per session and page-based retargeting audiences would stay empty. Verified on the dev server: one beacon on load, a second with the new URL after a soft nav to `/prijzen/`.

## Consent posture

Cookiebot is **display-only** — GA4 + PostHog + the Meta Pixel all fire regardless of consent state (a deliberate, documented decision; see the comment in [`ga4.tsx`](../components/analytics/ga4.tsx) for how to restore real gating). `respect_dnt: true` on PostHog means PostHog undercounts DNT users vs GA4.

The Meta Pixel was added to that same ungated posture on 2026-08-07 by an explicit product-owner decision, risk accepted. Note that it widens the gap from analytics to **advertising**: `content/cookieverklaring.md` §3.3 and §5 state that advertentiepixels are placed only after consent, and §4 names Meta Pixel specifically. Loop decision **D-1** carries this; gating the pixel later is two attributes on one script tag (documented in [`meta-pixel.tsx`](../components/analytics/meta-pixel.tsx)).
