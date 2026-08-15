"use client";

// The return leg of the consent handover: a choice changed on mijn.letsdog.nl
// takes effect here too.
//
// ConsentCookie writes ld_consent so the platform can honour a choice made on
// this site. This is the mirror image, and it was missing: Cookiebot only reads
// its own host-only CookieConsent cookie, so a visitor who changed their mind on
// the platform kept being measured here on the old answer. The platform's Cookie
// preferences screen promises "Je keuze geldt op letsdog.nl en in de app", so
// that gap was a broken promise rather than an incompleteness — and at a
// withdrawal it is the worst place to have one.
//
// WHAT IT DOES, once per page load: read ld_consent, compare it with what
// Cookiebot records, and if the cookie is strictly newer AND says something
// different, hand that choice to Cookiebot through its own public API. Cookiebot
// then behaves exactly as if the visitor had answered its banner that way, which
// is what makes this small: its consent update reaches Google, its events reach
// MetaPixel, and no tracker needs to know this path exists. The comparison rules
// and the reason each one exists are in lib/consent.ts
// (consentCookieSupersedes) — that is where the ping-pong with the write side is
// prevented, not here.
//
// MOUNTED LAST of the consent components, deliberately. submitCustomConsent can
// fire Cookiebot's consent events synchronously, and effects run in tree order,
// so ConsentCookie and MetaPixel have to be subscribed before this one acts —
// otherwise the very event this triggers would arrive before anyone is listening.

import { useEffect, useRef } from "react";
import {
  consentCookieSupersedes,
  onCookiebotConsent,
  readConsentCookie,
  submitConsentToCookiebot,
} from "@/lib/consent";

export function ConsentSync() {
  const synced = useRef(false);

  useEffect(() => {
    // Subscribing rather than reading once: Cookiebot settles a stored consent
    // within milliseconds of uc.js loading, which can happen either side of this
    // effect. onCookiebotConsent covers both by replaying the current state
    // immediately and again on every event.
    //
    // "IMMEDIATELY" IS THE HALF THAT HAD TO BE EARNED, TWICE, and it is why this
    // component did nothing on production for a week (T-43). The visitor this
    // exists for has no Cookiebot answer, so the immediate read is `null` — and
    // that read was first suppressed by a guard drawn too wide, then blocked by
    // the object not existing yet: measured on production, React hydrates at
    // ~210 ms and uc.js only lands at ~221 ms, so at this exact line there is no
    // `window.Cookiebot` to read. The event that was supposed to cover that never
    // fires here either. onCookiebotConsent now waits for the object and re-runs
    // the same read. Nothing in this component was ever wrong and nothing in it
    // changed; both repairs are in lib/consent.ts, next to the measurements.
    return onCookiebotConsent((cookiebot) => {
      if (synced.current) return;
      const cookie = readConsentCookie();
      if (!cookie || !consentCookieSupersedes(cookie, cookiebot)) return;
      // Belt-and-braces: after a submit the categories match, so the predicate
      // above says no by itself. The flag states the intent — adopt an outside
      // choice at most once per page load — instead of leaning on that.
      synced.current = submitConsentToCookiebot(cookie);
    });
  }, []);

  return null;
}
