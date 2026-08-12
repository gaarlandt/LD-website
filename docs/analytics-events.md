# Analytics events — Let's dog marketing website

A complete reference of every analytics event the website emits, for building dashboards/funnels (e.g. in PostHog) — here or in another project that consumes the shared PostHog project.

- **Project:** the platform PostHog project on EU (`https://eu.i.posthog.com`) — moved off the shared project 143695 at the 2026-08-12 cutover + GA4 **`G-0FCGXJHMMY`** (shared across all Let's dog domains) + Meta Pixel **`958837033882897`**.
- **Dual-fire:** every event below is sent to **both** GA4 (gtag) and PostHog through one chokepoint — `trackEvent(name, params)` in [`lib/analytics.ts`](../lib/analytics.ts). Each sink is guarded independently (a blocked sink never suppresses the other). **Add events only via `trackEvent`** — never call `gtag`/`posthog` directly.
- **Meta Pixel is a third sink on that same chokepoint, but it receives only a mapped subset** — see [Meta Pixel](#meta-pixel) below.
- **App identifier:** this is the **`website`** app. App-side events (`sign_up`, `purchase`) live on the platform (`mijn.letsdog.nl`) and are owned separately — not emitted here.

## PostHog super-properties (on every PostHog event)

Registered once at init ([`components/analytics/posthog-provider.tsx`](../components/analytics/posthog-provider.tsx)) — use these to filter/segment dashboards:

| Property | Value | Notes |
|---|---|---|
| `app` | `"website"` | Distinguishes this site from the platform (`mijn.letsdog.nl`), which reports into the SAME project since 2026-08-12. That makes this property load-bearing rather than descriptive. **Filter every website dashboard on `app = "website"`.** |
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
| `begin_checkout` | Click on a pricing tier CTA ([`plan-cta.tsx`](../components/sections/plan-cta.tsx)) | `currency` (`"EUR"`), `value` (number, **excl. VAT**), `billing_period` (`"monthly"` \| `"yearly"`), `items: [{ item_id, item_name, item_variant, item_category: "abonnement", price, quantity }]` | GA4 ecommerce. **Shared item contract with the platform since 2026-08-12** — GA4 joins `begin_checkout` → `purchase` on `item_id`, so both hosts must send these exact values: `ld_maand` / `ld_jaar` (`item_name` `Maandabonnement` / `Jaarabonnement`, `item_variant` `Maand` / `Jaar`). `value` and `price` are **excluding 21% VAT** (`16.52` / `48.76`) because Google Ads bids on them; the customer still sees €19,99 / €59. Replaces the WooCommerce product ids `2234`/`2233`, so item history breaks at that date by design. `billing_period` stays alongside `item_variant`; it is the older registered dimension and is not replaced by it. |
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

For a consumer project building dashboards off the platform project (filter all on `app = "website"` + `environment = "production"`):

- **Pricing funnel:** `view_item_list` → `begin_checkout`, broken down by `billing_period` and `source` (homepage vs prijzen page).
- **CTA attribution:** `cta_clicked` broken down by `link_destination` (and `link_location`) — which surfaces drive clicks to app / checkout / keuzehulp / agenda.
- **Lead conversion:** `contact_form_submitted` (and the `identify` that accompanies it) as the marketing-site conversion; lowercased-email join lets you stitch to app-side `sign_up`/`purchase`.
- **Reach:** `$pageview` by `$pathname`.

## Meta Pixel

Pixel **`958837033882897`** — dataset **"Letsdog A team"** — in use here since **2026-08-11**. Loaded client-side from the root layout's `<body>`, and only once marketing consent is granted (see Consent posture below) ([`meta-pixel.tsx`](../components/analytics/meta-pixel.tsx)); the id comes from `NEXT_PUBLIC_META_PIXEL_ID` and **must be set in Cloudflare Pages → Variables and Secrets for Production *and* Preview**, or the component renders nothing and the pixel silently does not exist.

**Why the dataset changed on 2026-08-11.** The site moved off its first pixel because that one could never issue a Conversions API token, and the platform needs CAPI to send `Purchase` server-side. Reasoning and the ownership details are in platform loop decision **D-99** — not repeated here. What matters on this side: the pixel and the platform's CAPI must point at the **same** dataset, or the funnel splits and neither half reports a purchase. Owner is business portfolio **letsdogworld** (`1979628589535333`), shared with ad account **"Lets dog"** (`27044699391857143`).

**Custom conversions and audiences do not migrate.** Anything defined against the previous pixel stopped receiving data at this cutover and has to be rebuilt on the new dataset by whoever runs the campaigns.

Unlike GA4/PostHog, Meta gets only the events that map onto a **standard event** — the mapping lives in [`lib/meta-events.ts`](../lib/meta-events.ts) and is unit-tested. Standard events are what an Ads Manager campaign can optimise and bid on; a custom event can't be bid on, so unmapped events are deliberately not sent.

| Internal event | Meta standard event | Params sent |
|---|---|---|
| `begin_checkout` | `AddToCart` | `currency`, `value`, `content_type: "product"`, `content_ids`, `contents`, `num_items` |
| `contact_form_submitted` | `Lead` | `content_name: "contact_form"` |
| `creator_form_submitted` | `Lead` | `content_name: "creator_form"`, `content_category` (= `collaboration`) |
| `view_item_list` | `ViewContent` | `content_type: "product_group"`, `content_name`, `content_category` (= `source`) |
| *(page loads + soft navigation)* | `PageView` | — |

**`cta_clicked` is deliberately not mapped.** It is the busiest event on the site and has no standard-event equivalent; sending it would add volume no campaign can act on.

### Event ownership is split across two hosts (D-101)

Ads land on **both** `letsdog.nl` and the platform, and both now carry a Meta pixel into the same dataset. Any event both hosts could fire would simply be counted twice, so ownership is settled **per event**, not per host:

| Meta event | Fired by | Why that side |
|---|---|---|
| `PageView`, `ViewContent`, `AddToCart`, `Lead` | **this site** | The top of the funnel this host can actually witness |
| `InitiateCheckout` | **the platform** | A checkout arrival is only observable where the checkout lives — and the platform sees it for *both* ways in (straight from an ad, or via the quiz funnel) |
| `Purchase` | **the platform, server-side (CAPI) only** | Never fired in a browser, on either host. That is what keeps deduplication unnecessary: there is only ever one source per event |

**`begin_checkout` → `AddToCart` (changed 2026-08-11).** It used to map to `InitiateCheckout`. The trigger is a *click on a pricing CTA* — intent, not arrival — so the old name overclaimed, and once the platform started firing the real `InitiateCheckout` it would also have double-counted. `AddToCart` is Meta's own standard step between `ViewContent` and `InitiateCheckout`, so the ladder keeps its order and the event stays biddable. **Rebuild any campaign, custom conversion or audience that optimised on `InitiateCheckout` from this host.**

### Two limitations worth knowing before you build a campaign on this

1. **`Purchase` never fires here, and can't.** Payment happens on another domain. That is no longer a hole in the reporting, though: since **2026-08-10** the platform sends `Purchase` **server-side over Meta's Conversions API**, into this same dataset — which is exactly why the pixel here had to move datasets too (see above). This host sees the funnel up to `AddToCart`.
2. **Production hosts only — the pixel does not exist on previews.** Meta has no `traffic_type`/`environment` equivalent, so a single dataset receives everything; the only way to keep preview and localhost out of the numbers campaigns optimise against is not to fire there at all. Since 2026-08-07 the base code is wrapped in a runtime `PROD_HOSTS` check (`letsdog.nl`, `www.letsdog.nl`), so off production nothing loads — no `fbevents.js`, no `window.fbq` — and the guards in `lib/analytics.ts` skip the Meta sink on their own. The check is at runtime because one static export serves both hosts. **Consequence: you cannot verify the pixel on a branch preview.** Verify on production with Meta Pixel Helper or Events Manager → Test Events. Meta's `<noscript>` fallback pixel is omitted for the same reason — it cannot be host-gated.

`PageView` fires **exactly once per page a visitor actually sees**, via two mechanisms that hand off to each other: the base code fires it when the pixel loads (a hard load for a visitor whose marketing consent is already stored, otherwise the moment they grant it), and [`meta-pixel-pageview.tsx`](../components/analytics/meta-pixel-pageview.tsx) fires it on each subsequent App Router **soft** navigation. The first client render is deliberately skipped so the landing page isn't counted twice. Without that component the whole site would report a single PageView per session and page-based retargeting audiences would stay empty. Verified on the dev server: one beacon on load, a second with the new URL after a soft nav to `/prijzen/`.

## Consent posture

**Consent is enforced for Google and Meta since 2026-08-08** (loop decision **D-93**, which reverses the earlier ungated "consent theater" posture that D-1 had signed off).

- **Google (GA4)** — [`consent-default.tsx`](../components/analytics/consent-default.tsx) sets a Consent Mode v2 default of `denied` on everything except `security_storage`, before any Google tag can act on it; Cookiebot sends the `update` on a choice. gtag.js still loads and still sends a **cookieless ping** pre-consent (Google's "advanced" consent mode) — it writes no `_ga` cookie and no advertising data. Holding the tag back entirely is a one-line change documented in [`ga4.tsx`](../components/analytics/ga4.tsx), and it is a business call, not a cleanup.
- **Meta Pixel** — [`meta-pixel.tsx`](../components/analytics/meta-pixel.tsx) does not request `fbevents.js` at all until marketing consent is granted, and on withdrawal calls `fbq('consent','revoke')` and deletes `_fbp`/`_fbc`. It does **not** rely on Cookiebot's auto-blocker: the blocker demonstrably never caught this pixel (it rewrites tags it recognises, and the `fbevents.js` element is created at runtime), which is exactly how `_fbp` survived an explicit refusal until 2026-08-08. **Since 2026-08-12 both Meta gates read the merged state of Cookiebot *and* `ld_consent`** ([`lib/meta-consent.ts`](../lib/meta-consent.ts)) — the same newest-wins read PostHog uses, because a choice made on `mijn.letsdog.nl` reaches this host in the cookie a beat before ConsentSync hands it to Cookiebot, and a Meta beacon cannot be un-sent. The two gates are deliberately not identical: the **send** gate takes the merge at its word, the **load** gate lets it only ever *subtract* from Cookiebot's answer, so a newer refusal means `fbevents.js` is never fetched while the revoke path stays independent of which consent subscriber runs first.
- **Campaign attribution (`ld_attribution`, added 2026-08-11)** — [`attribution-capture.tsx`](../components/analytics/attribution-capture.tsx) + [`lib/attribution.ts`](../lib/attribution.ts) store the seven campaign parameters an ad click arrives with in a second first-party cookie on `.letsdog.nl`, 90-day `Max-Age`, so the checkout on `mijn.letsdog.nl` can attribute the sale. **Two gates, not one:** `utm_*` + `gclid` need **statistics**, `fbclid` needs **marketing** — a visitor who accepts one and refuses the other keeps exactly half. Nothing is stored before a gate opens (the values sit in memory for the page load only), a gate closing later narrows or deletes the record, and a withdrawal recorded in `ld_consent` is honoured even when it was made in an earlier session. **First touch wins**, which is the inverse of `ld_consent`'s newest-wins on the same domain — the cross-repo contract is `contracts/cross-host-attribution-handover.md` in the knowledge hub.
- **PostHog runs on legitimate interest, not consent** (D-93 part C) — which is two halves, and the second one landed on 2026-08-12 (T-24). It keeps measuring while no choice has been made, and it **stops on an explicit refusal of statistics**: no init at all if the refusal is already on record, otherwise `reset()` + `opt_out_capturing()`, and it resumes if statistics are re-allowed. Before that date only the first half existed, so the real posture was "always measure" and the published cookie declaration was not yet true. The refusal is read from the merged state of Cookiebot **and** `ld_consent`, so a choice made on `mijn.letsdog.nl` is honoured here before Cookiebot even loads. `respect_dnt: true` means PostHog undercounts DNT users vs GA4.
- **`ld_consent`** — every choice and every change is written to a first-party cookie on `.letsdog.nl` so `mijn.letsdog.nl` can honour it. The shape is a fixed cross-repo contract; see [`lib/consent.ts`](../lib/consent.ts).

Verifying any of this needs the real banner, and **Cookiebot's banner does not render on `*.pages.dev`** (that host is not in the domain group) — so a branch preview can show you the denied path but never the granted one.
