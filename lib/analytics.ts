import posthog from "posthog-js";
import { toMetaEvent, type MetaEventParams } from "@/lib/meta-events";
import { readConsentCookie, readCookiebotConsent } from "@/lib/consent";
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

// The one identify opportunity on the marketing site (contact-form success).
// Email is lowercased — it's the cross-product join key per the Let's dog
// PostHog identity contract. No alias() chains, no GA4 user-id mapping.
export function identifyLead(
  email: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  const lower = email.trim().toLowerCase();
  posthog.identify(lower, { email: lower, ...props });
}
