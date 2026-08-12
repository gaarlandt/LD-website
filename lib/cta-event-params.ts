// The `cta_clicked` payload: the four registered link dimensions, plus the
// campaign the visit is attributed to.
//
// Split out of components/analytics/cta-tracker.tsx for the same reason
// lib/cta-destination.ts was — the tracker is a DOM listener and this repo's
// Vitest runs in the Node environment, so anything left inside the listener is
// unreachable from a test. Here the whole payload can be built from plain
// objects and asserted key by key.
//
// THE CAMPAIGN COMES FROM THE STORED RECORD, NEVER FROM window.location.search.
// That is the entire point of this module, and it is a consent rule, not a
// convenience:
//
//   * `utm_*` ride on STATISTICS consent (lib/attribution.ts, STATISTICS_PARAMS
//     — pinned by a test below). The stored record is already kept trimmed to
//     what the visitor currently allows: `narrowStoredToConsent` drops the
//     parameters whose gate has closed and deletes the record outright when no
//     gate is open. Reading it therefore gives the consent-safe value for free.
//     Reading the query string instead would attach campaign parameters to a
//     GA4/PostHog event for somebody who REFUSED statistics — a consent leak, in
//     the same bundle that exists to close one.
//   * `ld_attribution` is FIRST touch (the deliberate inverse of `ld_consent`'s
//     newest-wins), and the platform stores that same first touch in its
//     `profiles` columns. Sourcing from the cookie keeps this event joinable
//     with the platform's record instead of inventing a per-visit alternative
//     that disagrees with it the moment a visitor clicks around before
//     converting.
//
// The `AttributionPayload` parameter type is the guardrail for that rule rather
// than a formality: `readAttributionParams(location.search)` returns
// `AttributionParams`, which has no `v`/`t` and so does not type-check here.
// Sourcing this from the URL has to be a deliberate act, not a slip.
//
// THREE OF THE SEVEN, NOT ALL SEVEN. `utm_term`, `utm_content`, `gclid` and
// `fbclid` are stored and handed to the platform, but they are not put on this
// event. Widening an event's payload is a decision about GA4 custom dimensions
// and cardinality, and `cta_clicked` is the busiest event on the site — so it is
// a decision to be taken on purpose, not inherited from a loop over the
// allowlist. `fbclid` would additionally cross a gate: it rides on MARKETING.

import type { AttributionParamName, AttributionPayload } from "./attribution";

/**
 * The campaign parameters that ride along on `cta_clicked`.
 *
 * `satisfies` ties them to the platform's allowlist: these names run unchanged
 * through the cookie, the request body and the `profiles` columns, so a rename
 * anywhere in that chain must not be able to leave this list quietly behind.
 */
export const CAMPAIGN_EVENT_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
] as const satisfies readonly AttributionParamName[];

export type CampaignEventParamName = (typeof CAMPAIGN_EVENT_PARAMS)[number];

/** Usually empty — most visits carry no campaign at all. */
export type CampaignEventParams = Partial<Record<CampaignEventParamName, string>>;

/**
 * The four params the tracker has always sent.
 *
 * `link_location` and `link_destination` are REGISTERED GA4 custom dimensions
 * and `link_url`/`link_text` are read by every CTA report — spelling them out as
 * a type means a rename fails to compile here instead of arriving in GA4 as an
 * empty dimension nobody notices for a month.
 */
export type CtaLinkParams = {
  link_url: string;
  link_text: string;
  link_location: "navbar" | "body";
  link_destination: string;
};

export type CtaEventParams = CtaLinkParams & CampaignEventParams;

/**
 * The `cta_clicked` payload: the link params, with whatever campaign the stored
 * first-touch record still holds.
 *
 * @param link   the four registered dimensions, as the tracker reads them off the DOM
 * @param stored the `ld_attribution` record (`readAttributionCookie()`), or null
 *
 * ABSENT KEYS ARE OMITTED, NOT SENT EMPTY. Most visits have no campaign, so an
 * empty string here would be the common case rather than the exception: noise in
 * every GA4 report and cardinality nobody asked for. A missing key reads as
 * "no campaign"; `""` reads as a campaign named nothing.
 */
export function buildCtaEventParams(
  link: CtaLinkParams,
  stored: AttributionPayload | null,
): CtaEventParams {
  const campaign: CampaignEventParams = {};
  for (const name of CAMPAIGN_EVENT_PARAMS) {
    const value = stored?.[name];
    // Non-empty check as well as a presence check: the parser already drops
    // blanks (`cleanValue`), and asserting it here too makes "never an empty
    // dimension" a property of this boundary rather than one borrowed from a
    // module up the chain.
    if (typeof value === "string" && value !== "") campaign[name] = value;
  }
  // Link params first, and they cannot be displaced: `campaign` only ever
  // carries the three names above, so no stored record — however it got there,
  // and this cookie is writable by any host on .letsdog.nl — can reach a
  // registered dimension.
  return { ...link, ...campaign };
}
