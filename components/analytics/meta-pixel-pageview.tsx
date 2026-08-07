"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackMetaPageView } from "@/lib/analytics";

// The Meta base code fires exactly one PageView, at script load. This site is
// an App Router SPA where the navbar and most CTAs are <Link>s, so every
// navigation after the first is a soft one that never reloads the pixel —
// without this, a visit to /, /prijzen and /contact counts as a single
// PageView, and page-based retargeting audiences ("visited /prijzen") stay
// empty. PostHog already covers soft nav via its history-based pageviews;
// this is the Meta equivalent.
//
// The first render is skipped deliberately: the base code has already counted
// that one, and firing again here would double-count every landing. The guard
// is a "has rendered once" flag rather than a comparison against the initial
// pathname — comparing values would silently drop the pageview when a visitor
// navigates back to where they started (/ → /prijzen → /).
export function MetaPixelPageView() {
  const pathname = usePathname();
  const hasRendered = useRef(false);

  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }
    trackMetaPageView();
  }, [pathname]);

  return null;
}
