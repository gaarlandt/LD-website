import posthog from "posthog-js";
import { toMetaEvent, type MetaEventParams } from "@/lib/meta-events";
import {
  readConsentCookie,
  readCookiebotConsent,
  newestRecordedConsent,
} from "@/lib/consent";
import { metaSendGranted } from "@/lib/meta-consent";

// `typeof window.fbq === "function"` is no longer enough on its own to mean
// "we may send to Meta". fbevents.js cannot be unloaded once it has loaded, so
// after a withdrawal fbq is still a callable function; Meta holds the events
// rather than sending them, but a re-grant later in the same page would flush
// what was queued while consent was withdrawn. Reading the recorded choice costs
// a property read and a cookie read, and removes the question.
//
// BOTH writers of that choice are read, not just Cookiebot. Cookiebot alone can
// be the older answer — a choice made on mijn.letsdog.nl lands in `ld_consent`
// first and only reaches Cookiebot once ConsentSync pushes it — and a Meta
// beacon cannot be un-sent. The merge, its two directions and the open D-4
// question about the grant direction are in lib/meta-consent.ts.
function metaConsentGranted(): boolean {
  return metaSendGranted(readCookiebotConsent(), readConsentCookie());
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// Single definition, owned by lib/meta-events.ts (a leaf module) so the two
// stay in lockstep without a circular import.
type EventParams = MetaEventParams;

// Single chokepoint: fires the same event to GA4 (gtag), PostHog AND the Meta
// Pixel. Each sink is guarded independently so a blocker/absence of one never
// suppresses the others (e.g. an ad-blocker eats PostHog → GA4 still fires).
//
// GA4 and PostHog receive every event under its internal name. Meta only
// receives the subset that maps onto one of its standard events, under Meta's
// name — see lib/meta-events.ts for the mapping and for why the rest is
// deliberately not sent.
export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (posthog.__loaded) {
    posthog.capture(eventName, params);
  }
  // Wrapped because this sink calls out to fbq — third-party code we don't
  // control — and trackEvent runs inside callers' try/catch. contact-form-modal
  // catches around its trackEvent call and renders "error" to the user, so an
  // exception thrown here would tell someone their message failed when it was
  // sent. Analytics must never be able to do that. GA4 and PostHog are safe by
  // ordering (they already fired above); this keeps the caller safe too.
  try {
    const metaEvent = toMetaEvent(eventName, params);
    if (metaEvent && typeof window.fbq === "function" && metaConsentGranted()) {
      window.fbq("track", metaEvent.name, metaEvent.params);
    }
  } catch {
    // Swallowed on purpose: a missing marketing event is strictly preferable to
    // a broken user-facing flow.
  }
}

// Meta's own PageView, re-fired on App Router soft navigation. Deliberately
// NOT routed through trackEvent: pageviews are not part of the shared event
// vocabulary (PostHog emits its own `$pageview`, GA4 its own `page_view`), so
// sending a Meta-named "PageView" through the chokepoint would add a foreign
// event to both of those datasets instead of completing Meta's.
export function trackMetaPageView(): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (!metaConsentGranted()) return;
  try {
    window.fbq("track", "PageView");
  } catch {
    // Same reasoning as trackEvent: fbq is third-party, and this runs inside a
    // render effect where an exception would surface as a React error.
  }
}

// The one identify opportunity on the marketing site (contact- and creator-form
// success).
//
// IDENTIFY ON THE ANONYMOUS DEVICE ID, NEVER ON THE EMAIL ADDRESS — and this is
// a REVERSAL of what this function did until 2026-08-17 and of what the old
// identity contract prescribed (it named the lowercased email as the join key).
// Two things changed under it:
//
//  1. **One shared project.** Since 2026-08-12 this site reports into the
//     platform's PostHog project. An email as `distinct_id` therefore puts a
//     personal datum in a space shared with the platform's uuid-identified
//     people — and into a `.letsdog.nl` cookie, readable by every host on the
//     shared domain. Nobody decided that; it followed from a key switch.
//  2. **The join no longer needs it.** Continuity across hosts runs on the
//     shared `$device_id` in posthog-js's own cookie, which the platform adopts
//     through the SDK's `bootstrap` option. Identifying on an email would in fact
//     BREAK that join the moment one host normalises differently.
//
// The rule now lives in the host register `posthog-cross-product-identity.md`
// ("Wat elke host moet implementeren", point 3). Still no alias() chains and no
// GA4 user-id mapping.
//
// THE EMAIL IS KEPT AT MOST AS A PERSON PROPERTY, BEHIND AN EXPLICIT YES. It is
// analytics data about a person, so it rides STATISTICS — and PostHog's
// legitimate-interest ground covers measuring, not storing an identifier for
// someone who never agreed to it. No explicit statistics consent → the identify
// still happens (it is the device id, which we may hold) but carries no email.
export function identifyLead(
  email: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  // `$device_id` is the random UUID posthog-js minted for this browser. Read it
  // rather than `get_distinct_id()`: after any earlier identify the latter is
  // whatever we identified AS, so reading it would re-identify on a stale value
  // and, for anyone carrying the pre-2026-08-17 state, re-assert their email.
  const deviceId = posthog.get_property("$device_id");
  if (typeof deviceId !== "string" || deviceId === "") return;
  const consent = newestRecordedConsent(readCookiebotConsent(), readConsentCookie());
  const personProps: Record<string, string | number | boolean> = { ...props };
  if (consent?.s === true) personProps.email = email.trim().toLowerCase();
  posthog.identify(deviceId, personProps);
}
