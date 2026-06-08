import posthog from "posthog-js";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | null | undefined | object>;

// Single chokepoint: fires the same event to BOTH GA4 (gtag) and PostHog.
// Each sink is guarded independently so a blocker/absence of one never
// suppresses the other (e.g. an ad-blocker eats PostHog → GA4 still fires).
export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (posthog.__loaded) {
    posthog.capture(eventName, params);
  }
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
