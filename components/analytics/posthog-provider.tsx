"use client";

import { useEffect, type ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { isProdHost } from "@/lib/prod-hosts";
import {
  onCookiebotConsent,
  readConsentCookie,
  newestRecordedConsent,
  type ConsentPayload,
} from "@/lib/consent";

// Browser-only PostHog init for the static-export site (no server runtime).
//
// GROUNDS: legitimate interest, not consent (D-93 part C). That is deliberately
// NOT the same as "ungated". Legitimate interest buys exactly one thing — we may
// measure while the visitor has not answered — and it costs the other half:
// an explicit refusal of STATISTICS has to stop us. Until 2026-08-12 only the
// first half existed, which made the real posture "always measure" and the
// grounds untrue. The cookie declaration states this in so many words ("Zeg je
// nee tegen statistiek, dan stopt hij meteen"), so this file is what makes that
// sentence true.
//
// THEREFORE, AND THIS IS THE INVERSE OF meta-pixel.tsx: the rule is "stop on a
// recorded no", not "start on a yes". No recorded choice means we run. Do not
// "tighten" this into a full opt-in gate — that would change the legal grounds
// and falsify the published declaration.
//
// Identity + event conventions follow the Let's dog cross-product contract: EU
// host, defaults '2026-01-30', session recording off, respect DNT, and an `app`
// super-property. That super-property is now LOAD-BEARING rather than
// descriptive: the website and the platform report into one project, so every
// website dashboard must filter on app = "website" to mean this site.
//
// cross_subdomain_cookie stays on, but promise nothing from it: the platform
// runs the React Native SDK, which does not read posthog-js's cookie, so it does
// NOT hand a continuous visitor across the domain. Closing that gap is T-542 on
// the platform side, not something this flag achieves.
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Refused = a RECORDED choice whose statistics category is false. `null`
    // (loaded, nothing recorded) is not a refusal — under legitimate interest it
    // is the case we are allowed to measure in.
    const refusesStatistics = (consent: ConsentPayload | null): boolean =>
      newestRecordedConsent(consent, readConsentCookie())?.s === false;

    const start = () => {
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
          defaults: "2026-01-30", // pinned — also enables history-based $pageview (covers App Router soft nav)
          respect_dnt: true, // contract-mandated; note GA4 ignores DNT, so PostHog undercounts DNT users vs GA4
          disable_session_recording: true,
          persistence: "localStorage+cookie",
          cross_subdomain_cookie: true, // .letsdog.nl cookie — see the note above on what this does NOT buy
          person_profiles: "identified_only", // marketing site is mostly anon
          autocapture: false, // we fire deliberate, named events only
        });
        posthog.register({
          app: "website",
          platform: "web",
          environment: isProdHost(window.location.hostname) ? "production" : "preview",
        });
      }
      // Whether we just initialised or were already running: an opt-out from an
      // earlier refusal PERSISTS across page loads, so it has to be lifted here
      // or re-allowing statistics leaves PostHog permanently silent — which is
      // indistinguishable from a working gate and would go unnoticed for weeks.
      if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing({ captureEventName: false });
      }
    };

    const stop = () => {
      // Never started: not starting IS the stop, and there is nothing to opt out
      // of or reset. This is the strongest outcome of the two — no init means no
      // request, no cookie and no $pageview ever happened.
      if (!posthog.__loaded) return;
      // ORDER IS LOAD-BEARING AND IT IS THE OPPOSITE OF THE INTUITIVE ONE.
      // reset() drops the identifiers, but it ALSO calls consent.reset()
      // internally — so opting out first and resetting second silently undoes
      // the opt-out and leaves a refusing visitor being measured again. Measured
      // in the browser on 2026-08-12, not reasoned about: with the opposite
      // order no opt-out key survived in storage. So reset first, opt out last.
      posthog.reset();
      posthog.opt_out_capturing();
    };

    // The pre-Cookiebot decision. Cookiebot loads async and a refusal may already
    // be on record in ld_consent (including one made on mijn.letsdog.nl), so
    // starting unconditionally here would fire an irreversible $pageview for a
    // visitor who already said no. Reading the handover cookie first costs one
    // synchronous cookie read and closes that window.
    if (refusesStatistics(null)) stop();
    else start();

    return onCookiebotConsent((consent) => {
      if (refusesStatistics(consent)) stop();
      else start();
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
