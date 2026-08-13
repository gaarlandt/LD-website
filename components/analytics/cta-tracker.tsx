"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { readAttributionCookie } from "@/lib/attribution";
import { resolveCtaDestination } from "@/lib/cta-destination";
import { buildCtaEventParams } from "@/lib/cta-event-params";

// Thin delegated listener. The attribution rules — which hosts count, the
// checkout path split, same-site pricing links, and mail CTAs — live in
// lib/cta-destination.ts so they can be unit-tested off the DOM; the event's
// payload, including the campaign parameters, is built in
// lib/cta-event-params.ts for the same reason.
//
// The campaign comes from the STORED ld_attribution record, not from
// window.location.search — the record is the consent-gated, first-touch answer,
// and the reasoning is in lib/cta-event-params.ts. It is read per click rather
// than once at mount on purpose: a visitor can withdraw statistics consent
// mid-page, which narrows or deletes that record, and a value cached at mount
// would keep sending campaign data past the withdrawal.
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

      const destination = resolveCtaDestination(url, window.location.hostname);
      if (!destination) return;

      trackEvent(
        "cta_clicked",
        buildCtaEventParams(
          {
            link_url: url.href,
            link_text: (anchor.textContent ?? "").trim(),
            link_location: anchor.closest("nav") ? "navbar" : "body",
            link_destination: destination,
          },
          readAttributionCookie(),
        ),
      );
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
