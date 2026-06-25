// Real production hostnames for the marketing site. Anywhere else
// (*.pages.dev previews, localhost) is treated as non-production: GA4 tags
// those events traffic_type='internal' (see components/analytics/ga4.tsx) and
// PostHog tags them environment:'preview' (see posthog-provider.tsx), so the
// shared GA4 property + PostHog project stay free of staging noise.
//
// NOTE: this list is scoped to ANALYTICS environment tagging — it intentionally
// treats the Pages alias `website-letsdog.pages.dev` as non-production so the
// shared GA4/PostHog data stays clean. The contact Function takes the OPPOSITE
// stance for security: it ENFORCES Turnstile on `website-letsdog.pages.dev` too,
// since that alias is a live, publicly-reachable surface (see
// functions/api/contact.ts — PROD_PAGES_ALIAS / isPreviewOrLocalHost). If you add
// a production host, consider both classifications.
export const PROD_HOSTS = ["www.letsdog.nl", "letsdog.nl"];

export function isProdHost(hostname: string): boolean {
  return PROD_HOSTS.includes(hostname);
}
