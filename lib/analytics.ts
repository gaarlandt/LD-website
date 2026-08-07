import posthog from "posthog-js";
import { toMetaEvent } from "@/lib/meta-events";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | null | undefined | object>;

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
  const metaEvent = toMetaEvent(eventName, params);
  if (metaEvent && typeof window.fbq === "function") {
    window.fbq("track", metaEvent.name, metaEvent.params);
  }
}

// Meta's own PageView, re-fired on App Router soft navigation. Deliberately
// NOT routed through trackEvent: pageviews are not part of the shared event
// vocabulary (PostHog emits its own `$pageview`, GA4 its own `page_view`), so
// sending a Meta-named "PageView" through the chokepoint would add a foreign
// event to both of those datasets instead of completing Meta's.
export function trackMetaPageView(): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "PageView");
}

// The one identify opportunity on the marketing site (contact-form success).
// Email is lowercased — it's the cross-product join key per the Let's Dog
// PostHog identity contract. No alias() chains, no GA4 user-id mapping.
export function identifyLead(
  email: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  const lower = email.trim().toLowerCase();
  posthog.identify(lower, { email: lower, ...props });
}
