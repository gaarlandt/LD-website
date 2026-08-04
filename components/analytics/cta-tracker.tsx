"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { resolveCtaDestination } from "@/lib/cta-destination";

// Thin delegated listener. The attribution rules — which hosts count, the
// checkout path split, same-site pricing links, and mail CTAs — live in
// lib/cta-destination.ts so they can be unit-tested off the DOM.
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
