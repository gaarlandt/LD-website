"use client";

// Captures the campaign parameters an ad click arrives with, and hands them to
// the platform in the ld_attribution cookie on .letsdog.nl.
//
// The contract, the seven names, the first-touch rule and the consent handling
// all live in lib/attribution.ts — including the sequence rule, which is why
// this file has no logic of its own to speak of. `createAttributionRecorder` is
// a closure factory for the same reason `createConsentRecorder` is one: its
// rules are about the ORDER of the states Cookiebot reports, and that only
// becomes testable once it is out of a component (this repo's Vitest runs in the
// Node environment, so a component's effect is not reachable from a test).
//
// Two things about the trigger itself are load-bearing:
//
// WHY IT READS THE URL ONCE, AT MOUNT. This sits in the root layout, which
// survives App Router soft navigation, so the effect runs on the LANDING page
// and the parameters it captured stay in the closure for the rest of the visit.
// That is what lets a visitor land on a tagged link, answer the banner two
// clicks later, and still have their first touch recorded — by then the query
// string is long gone from the address bar.
//
// WHY THE VALUES ARE HELD IN MEMORY AND NOT IN STORAGE. Reading a URL needs no
// consent; keeping the values does. Parking them in sessionStorage "until the
// visitor decides" would be storage under another name, and no Google or Meta
// tag on this site fires before there is a yes (D-93). The honest consequence,
// stated rather than hidden: a visitor who never answers the banner on the page
// they land on leaves no attribution behind. Cookiebot settles a stored answer
// within milliseconds, so returning visitors are unaffected; it is a
// first-visit-only cost. (PostHog is the documented exception to the wider
// posture — it runs on legitimate interest under D-93 part C — so this claim is
// about this cookie and the ad tags, not about every byte the site sends.)
//
// WHY IT IS NOT PRODUCTION-GATED like the Meta Pixel. Writing a first-party
// cookie on a preview pollutes nothing — there is no shared dataset to keep
// clean — and the cookie stays fully observable there, host-only. Only the
// crossing to the platform is production-only, and that is the Domain
// attribute's doing, not a check here.

import { useEffect } from "react";
import { onCookiebotConsent } from "@/lib/consent";
import { createAttributionRecorder, readAttributionParams } from "@/lib/attribution";

export function AttributionCapture() {
  useEffect(() => {
    return onCookiebotConsent(
      createAttributionRecorder(
        readAttributionParams(window.location.search),
        window.location.hostname,
      ),
    );
  }, []);

  return null;
}
