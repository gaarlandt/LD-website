"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// External Let's Dog properties we attribute CTA clicks to. These are the
// registered GA4 custom-dimension values for link_destination — keep verbatim.
// The production checkout lives at app.letsdog.nl/checkout/ — the SAME host as
// the general app, so it's split out by PATH in the handler below (a pricing
// click attributes to "checkout", a login/start click to "app").
//
// NOTE: the pricing tier CTAs are the only links to the checkout path, and they
// ALSO fire `begin_checkout` (see plan-cta.tsx) — so a pricing click emits BOTH
// cta_clicked(destination:"checkout") and begin_checkout. This is intentional:
// cta_clicked carries navbar/body + link_text attribution, begin_checkout carries
// the plan + value. Build the GA4/PostHog checkout funnel on begin_checkout (not
// cta_clicked) so the single click isn't counted as two funnel steps.
const TRACKED_HOSTS: Record<string, "app" | "keuzehulp" | "agenda"> = {
  "app.letsdog.nl": "app",
  "keuzehulp.letsdog.nl": "keuzehulp",
  "agenda.letsdog.nl": "agenda",
};

export function CTATracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      // External tracked destinations, plus same-site links into pricing — the
      // "Start vandaag" CTAs (→ /prijzen) and the homepage #prijzen anchor.
      let destination: string | undefined = TRACKED_HOSTS[url.hostname];
      // Production checkout shares the app.letsdog.nl host — split it out by path
      // so pricing clicks keep the registered "checkout" attribution.
      if (destination === "app" && url.pathname.startsWith("/checkout")) {
        destination = "checkout";
      }
      if (
        !destination &&
        url.hostname === window.location.hostname &&
        (url.pathname === "/prijzen" ||
          url.pathname === "/prijzen/" ||
          url.hash === "#prijzen")
      ) {
        destination = "pricing";
      }
      if (!destination) return;

      trackEvent("cta_clicked", {
        link_url: url.href,
        link_text: (anchor.textContent ?? "").trim(),
        link_location: anchor.closest("nav") ? "navbar" : "body",
        link_destination: destination,
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
