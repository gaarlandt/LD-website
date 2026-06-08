"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

// Fires view_item_list once when the pricing section scrolls into view. <Pricing>
// renders on both the homepage (a mid-page section) and /prijzen, so we use an
// IntersectionObserver — not mount — to keep it an actual impression, not a load.
export function PricingViewTracker() {
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const node = ref.current?.closest("section") ?? ref.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true;
            trackEvent("view_item_list", {
              item_list_name: "pricing",
              source: window.location.pathname.startsWith("/prijzen")
                ? "prijzen_page"
                : "homepage",
            });
            io.disconnect();
          }
        }
      },
      // Fire when the section first enters the viewport. The section is taller
      // than the viewport, so a high ratio threshold would never be reached.
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return <span ref={ref} className="hidden" aria-hidden />;
}
