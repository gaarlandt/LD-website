"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// External Let's Dog properties we attribute CTA clicks to. The checkout host
// is currently the STAGING shop (staging-app.letsdog.nl); it flips to
// the production checkout host at cutover — see docs/CUTOVER.md. These are the
// registered GA4 custom-dimension values for link_destination — keep verbatim.
//
// NOTE: the pricing tier CTAs are the only links to the checkout host, and they
// ALSO fire `begin_checkout` (see plan-cta.tsx) — so a pricing click emits BOTH
// cta_clicked(destination:"checkout") and begin_checkout. This is intentional:
// cta_clicked carries navbar/body + link_text attribution, begin_checkout carries
// the plan + value. Build the GA4/PostHog checkout funnel on begin_checkout (not
// cta_clicked) so the single click isn't counted as two funnel steps.
const TRACKED_HOSTS: Record<string, "app" | "keuzehulp" | "agenda" | "checkout"> = {
  "app.letsdog.nl": "app",
  "keuzehulp.letsdog.nl": "keuzehulp",
  "agenda.letsdog.nl": "agenda",
  "staging-app.letsdog.nl": "checkout",
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
