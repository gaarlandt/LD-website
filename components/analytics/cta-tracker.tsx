"use client";

import { useEffect } from "react";

const TRACKED_HOSTS: Record<string, "app" | "keuzehulp" | "agenda"> = {
  "app.letsdog.nl": "app",
  "keuzehulp.letsdog.nl": "keuzehulp",
  "agenda.letsdog.nl": "agenda",
};

export function CTATracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (typeof window.gtag !== "function") return;

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

      const destination = TRACKED_HOSTS[url.hostname];
      if (!destination) return;

      window.gtag("event", "cta_clicked", {
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
