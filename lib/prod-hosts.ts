// Real production hostnames for the marketing site. Anywhere else
// (*.pages.dev previews, localhost) is treated as non-production: GA4 tags
// those events traffic_type='internal' (see components/analytics/ga4.tsx) and
// PostHog tags them environment:'preview' (see posthog-provider.tsx), so the
// shared GA4 property + PostHog project stay free of staging noise.
//
// The Meta Pixel (components/analytics/meta-pixel.tsx) uses this list too, but
// as a hard gate rather than a tag: Meta has no traffic_type equivalent, so off
// production it does not load at all.
//
// NOTE: this list is scoped to ANALYTICS environment tagging — it intentionally
// treats the Pages alias `website-letsdog.pages.dev` as non-production so the
// shared GA4/PostHog data stays clean. (Until 2026-09-14 the contact Pages
// Function took the opposite stance and enforced Turnstile on that alias too;
// the forms now post to the platform, which accepts only letsdog.nl and
// www.letsdog.nl as Origin — see lib/website-contact.ts.) If you add a
// production host, the platform's WEBSITE_ORIGINS list has to hear about it.
export const PROD_HOSTS = ["www.letsdog.nl", "letsdog.nl"];

export function isProdHost(hostname: string): boolean {
  return PROD_HOSTS.includes(hostname);
}
