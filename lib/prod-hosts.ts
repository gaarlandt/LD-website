// Real production hostnames for the marketing site. Anywhere else
// (*.pages.dev previews, localhost) is treated as non-production: GA4 tags
// those events traffic_type='internal' (see components/analytics/ga4.tsx) and
// PostHog tags them environment:'preview' (see posthog-provider.tsx), so the
// shared GA4 property + PostHog project stay free of staging noise.
export const PROD_HOSTS = ["www.letsdog.nl", "letsdog.nl"];

export function isProdHost(hostname: string): boolean {
  return PROD_HOSTS.includes(hostname);
}
