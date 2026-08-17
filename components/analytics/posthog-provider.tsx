"use client";

import { useEffect, type ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { isProdHost } from "@/lib/prod-hosts";
import {
  onCookiebotConsent,
  readConsentState,
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
// recorded no", not "start on a yes". SILENCE means we run. Do not "tighten"
// this into a full opt-in gate — that would change the legal grounds and falsify
// the published declaration.
//
// Silence is narrower than "no readable choice", and that distinction is T-47:
// an `ld_consent` that is PRESENT but unreadable is not silence — somebody
// answered a banner and the bytes are unreadable because our two repos drifted —
// so it stops us. An ABSENT cookie is silence and does not. See
// `readConsentState` in lib/consent.ts for why the defect falls to the safe side.
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

    const start = (liftOptOut: boolean) => {
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
      }
      // OUTSIDE the init guard on purpose. stop() calls reset(), and reset()
      // empties the same props store register() writes into — so a visitor who
      // refuses and then re-allows statistics (newly reachable via the footer's
      // Cookie-instellingen control) would resume capturing with no `app`,
      // `platform` or `environment`. Those events would then be invisible in
      // every website dashboard, because both hosts share one project and every
      // dashboard filters on app = "website". register() is idempotent, so
      // calling it on an already-running client costs nothing.
      posthog.register({
        app: "website",
        platform: "web",
        environment: isProdHost(window.location.hostname) ? "production" : "preview",
      });
      // An opt-out PERSISTS across page loads, so re-allowing statistics has to
      // lift it or PostHog stays permanently silent — indistinguishable from a
      // working gate. But lift it ONLY on an explicit yes, never on the mere
      // absence of a refusal: otherwise a visitor who refused and later lost
      // their cookies (localStorage survives) is silently re-enabled, and a
      // Do-Not-Track visitor — for whom has_opted_out_capturing() is always
      // true — gets an opt-in written that would take effect the moment they
      // turn DNT off, with no choice ever recorded.
      if (liftOptOut && posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing({ captureEventName: false });
      }
    };

    const stop = () => {
      // Never started: not starting IS the stop, and there is nothing to opt out
      // of or reset. This is the strongest of the two outcomes — no init means no
      // request to PostHog and no captured event, ever.
      //
      // It does NOT mean no cookie, and that is worth stating because it is easy
      // to assume: importing posthog-js instantiates its persistence layer, which
      // writes its own `ph_…` cookie carrying a random device id and the landing
      // URL even when init never runs (measured 2026-08-12: `__loaded` false,
      // zero network entries to the ingestion host, cookie present anyway).
      // Nothing is transmitted, and Cookiebot deletes that cookie on an explicit
      // refusal — but do not read this branch as "no trace was left".
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

    // Refused = a RECORDED choice whose statistics category is false. A grant is
    // the mirror: an explicit true, which is the only thing that may lift a
    // stored opt-out.
    //
    // NO RECORDED CHOICE IS TWO CASES, NOT ONE, and that is what this function
    // exists to keep apart (T-47, and the platform's rule since day one). Under
    // legitimate interest we may measure while nobody has SPOKEN — but a present
    // `ld_consent` we cannot read is not silence: somebody answered a banner and
    // we cannot tell what they said, almost always because the two repos drifted.
    // Our own defect has to fall to the safe side, so it stops us.
    //
    // ORDER IS LOAD-BEARING. The explicit-choice tests come FIRST, so a readable
    // local yes from Cookiebot still starts PostHog even while a corrupt
    // `ld_consent` sits next to it. Only when NEITHER writer yields a governing
    // choice does the unreadable cookie decide — which is precisely the platform's
    // `isSilent` seam, arrived at from the other side.
    const apply = (cookiebot: ConsentPayload | null) => {
      const cookie = readConsentState();
      // The newest choice across BOTH writers. Reading Cookiebot alone would act
      // on a stale answer when the visitor decided on mijn.letsdog.nl, and a
      // $pageview cannot be un-sent.
      const choice = newestRecordedConsent(cookiebot, cookie.payload);
      if (choice?.s === true) return start(true);
      if (choice?.s === false) return stop();
      if (cookie.source === "unreadable") return stop();
      start(false);
    };

    // The pre-Cookiebot decision. Cookiebot loads async and a refusal may already
    // be on record in ld_consent (including one made on mijn.letsdog.nl), so
    // starting unconditionally here would fire an irreversible $pageview for a
    // visitor who already said no. Reading the handover cookie first costs one
    // synchronous cookie read and closes that window.
    apply(null);

    return onCookiebotConsent(apply);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
