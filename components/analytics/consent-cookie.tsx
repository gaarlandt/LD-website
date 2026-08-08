"use client";

// Writes the ld_consent handover cookie so the platform on mijn.letsdog.nl can
// honour a choice the visitor made here.
//
// Cookiebot answers the banner but keeps the answer to itself: its CookieConsent
// cookie is host-only, and its Cross-domain Consent Sharing cannot help either
// (since Chrome 115 it only shares from a subdomain up to the root domain, the
// opposite of the direction we need). So the site carries the choice across
// itself, in a first-party cookie on the shared parent domain. The contract and
// the reasoning live in lib/consent.ts; this component is only the trigger.
//
// It writes on every choice AND every change, withdrawal included — that falls
// out of subscribing to Cookiebot rather than reading it once, because a
// withdrawal is just another consent event with everything false.
//
// This cookie is itself strictly necessary: it records a consent decision, so it
// does not wait for consent to be written. Without that it could never be
// written on a refusal, and a refusal is precisely the answer the platform most
// needs to hear.

import { useEffect } from "react";
import { createConsentRecorder, onCookiebotConsent } from "@/lib/consent";

export function ConsentCookie() {
  useEffect(() => {
    // One recorder per subscription, because "a withdrawal is only a withdrawal
    // if we saw the consent it took back" is a rule about the ORDER of the
    // states Cookiebot reports, and the subscription's life is what gives that
    // order a boundary. Why the rule exists — and what it cost before it did —
    // is in lib/consent.ts, next to the writers it governs.
    return onCookiebotConsent(createConsentRecorder(window.location.hostname));
  }, []);

  return null;
}
