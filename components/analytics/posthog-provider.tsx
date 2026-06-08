"use client";

import { useEffect, type ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { isProdHost } from "@/lib/prod-hosts";

// Browser-only PostHog init for the static-export site (no server runtime).
// Fires always — matching the GA4 consent posture (Cookiebot is display-only).
// Identity + event conventions follow the Let's Dog cross-product contract:
// EU host, defaults '2026-01-30', session recording off, respect DNT, the
// shared project key, and an `app` super-property. cross_subdomain_cookie lets
// the anonymous distinct_id carry into app.letsdog.nl, where the app calls
// posthog.identify('wp:<id>') and stitches the journey onto one person.
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      defaults: "2026-01-30", // pinned — also enables history-based $pageview (covers App Router soft nav)
      respect_dnt: true, // contract-mandated; note GA4 ignores DNT, so PostHog undercounts DNT users vs GA4
      disable_session_recording: true,
      persistence: "localStorage+cookie",
      cross_subdomain_cookie: true, // .letsdog.nl cookie → anon id flows into app.letsdog.nl
      person_profiles: "identified_only", // marketing site is mostly anon
      autocapture: false, // we fire deliberate, named events only
    });
    posthog.register({
      app: "website",
      platform: "web",
      environment: isProdHost(window.location.hostname) ? "production" : "preview",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
