# Analytics events — Let's dog marketing website

A complete reference of every analytics event the website emits, for building dashboards/funnels (e.g. in PostHog) — here or in another project that consumes the shared PostHog project.

- **Project:** PostHog EU project **143695** (`https://eu.i.posthog.com`) + GA4 **`G-0FCGXJHMMY`** (shared across all Let's dog domains).
- **Dual-fire:** every event below is sent to **both** GA4 (gtag) and PostHog through one chokepoint — `trackEvent(name, params)` in [`lib/analytics.ts`](../lib/analytics.ts). Each sink is guarded independently (a blocked sink never suppresses the other). **Add events only via `trackEvent`** — never call `gtag`/`posthog` directly.
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
| `cta_clicked` | Click on any tracked outbound/pricing CTA — delegated document listener ([`cta-tracker.tsx`](../components/analytics/cta-tracker.tsx)) | `link_url`, `link_text`, `link_location` (`"navbar"` \| `"body"`), `link_destination` (`"app"` \| `"keuzehulp"` \| `"agenda"` \| `"checkout"` \| `"pricing"`) | `link_location` + `link_destination` are **registered GA4 custom dimensions — do not rename** |
| `view_item_list` | Pricing section scrolls into view (IntersectionObserver, once per page) ([`pricing-view-tracker.tsx`](../components/sections/pricing-view-tracker.tsx)) | `item_list_name` (`"pricing"`), `source` (`"prijzen_page"` \| `"homepage"`) | GA4 ecommerce |
| `begin_checkout` | Click on a pricing tier CTA ([`plan-cta.tsx`](../components/sections/plan-cta.tsx)) | `currency` (`"EUR"`), `value` (number), `billing_period` (`"monthly"` \| `"yearly"`), `items: [{ item_id, item_name, item_category: "membership", price, quantity }]` | GA4 ecommerce. `item_id` = the WooCommerce product id (`2109` monthly / `2107` yearly) |
| `contact_form_submitted` | Contact form submits successfully ([`contact-form-modal.tsx`](../app/contact/contact-form-modal.tsx)) | *(none)* — `identifyLead(email)` fires alongside it | conversion event |

### A pricing CTA click emits two events

A click on a pricing tier CTA fires **both** `cta_clicked` (`link_destination: "checkout"`, with navbar/body + link_text attribution) **and** `begin_checkout` (plan + value). This is intentional. **Build the checkout funnel on `begin_checkout`, not `cta_clicked`**, so one click isn't double-counted as two funnel steps.

## Suggested funnels / dashboards

For a consumer project building dashboards off project 143695 (filter all on `app = "website"` + `environment = "production"`):

- **Pricing funnel:** `view_item_list` → `begin_checkout`, broken down by `billing_period` and `source` (homepage vs prijzen page).
- **CTA attribution:** `cta_clicked` broken down by `link_destination` (and `link_location`) — which surfaces drive clicks to app / checkout / keuzehulp / agenda.
- **Lead conversion:** `contact_form_submitted` (and the `identify` that accompanies it) as the marketing-site conversion; lowercased-email join lets you stitch to app-side `sign_up`/`purchase`.
- **Reach:** `$pageview` by `$pathname`.

## Consent posture

Cookiebot is **display-only** — GA4 + PostHog fire regardless of consent state (a deliberate, documented decision; see the comment in [`ga4.tsx`](../components/analytics/ga4.tsx) for how to restore real gating). `respect_dnt: true` on PostHog means PostHog undercounts DNT users vs GA4.
