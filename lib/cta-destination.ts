// CTA attribution rules, extracted from components/analytics/cta-tracker.tsx so
// they are unit-testable off the DOM (same move as lib/prod-hosts.ts). The
// tracker is a thin delegated listener over this function.
//
// The returned values are the registered GA4 custom-dimension values for
// link_destination — keep them verbatim.
//
// The production checkout lives at <app host>/checkout — the SAME host as the
// general app, so it's split out by PATH below (a pricing click attributes to
// "checkout", a login/start click to "app"). That holds for both app hosts:
// mijn.letsdog.nl/checkout?plan=… and the legacy app.letsdog.nl/checkout/.
//
// BOTH app hosts map to "app" on purpose. `mijn.letsdog.nl` is the platform the
// site now points at; `app.letsdog.nl` is the retiring WordPress environment and
// stays listed while that host still resolves, so a stale link from an old
// campaign or a bookmarked page keeps its attribution instead of going dark.
// Adding the new host is not optional alongside the checkout-link swap: without
// it the tracker stops recognising the pricing CTAs entirely and every checkout
// click loses its attribution the moment the new links go live.
//
// NOTE: the pricing tier CTAs are the only links to the checkout path, and they
// ALSO fire `begin_checkout` (see components/sections/plan-cta.tsx) — so a
// pricing click emits BOTH cta_clicked(destination:"checkout") and
// begin_checkout. This is intentional: cta_clicked carries navbar/body +
// link_text attribution, begin_checkout carries the plan + value. Build the
// GA4/PostHog checkout funnel on begin_checkout (not cta_clicked) so the single
// click isn't counted as two funnel steps.
export const TRACKED_HOSTS: Record<string, "app" | "keuzehulp" | "agenda"> = {
  "mijn.letsdog.nl": "app",
  "app.letsdog.nl": "app",
  "keuzehulp.letsdog.nl": "keuzehulp",
  "agenda.letsdog.nl": "agenda",
};

/**
 * Resolve a clicked link to its GA4 `link_destination`, or `undefined` when the
 * link isn't one we attribute.
 *
 * @param url            the clicked anchor's resolved URL
 * @param currentHostname the page's own hostname, for the same-site checks
 */
export function resolveCtaDestination(
  url: URL,
  currentHostname: string
): string | undefined {
  // Mail CTAs first: a mailto: URL has an empty hostname under the WHATWG URL
  // parser, so it would fall straight through the host lookup below.
  if (url.protocol === "mailto:") return "email";

  let destination: string | undefined = TRACKED_HOSTS[url.hostname];

  // Production checkout shares the app.letsdog.nl host — split it out by path
  // so pricing clicks keep the registered "checkout" attribution.
  if (destination === "app" && url.pathname.startsWith("/checkout")) {
    destination = "checkout";
  }

  // Same-site links into pricing — the "Start vandaag" CTAs (→ /prijzen) and
  // the homepage #prijzen anchor.
  if (
    !destination &&
    url.hostname === currentHostname &&
    (url.pathname === "/prijzen" ||
      url.pathname === "/prijzen/" ||
      url.hash === "#prijzen")
  ) {
    destination = "pricing";
  }

  return destination;
}
