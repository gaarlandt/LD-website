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
import {
  onCookiebotConsent,
  recordConsentWithdrawal,
  writeConsentCookie,
} from "@/lib/consent";

export function ConsentCookie() {
  useEffect(() => {
    return onCookiebotConsent((consent) => {
      // A withdrawal reaches us as an absence, not as an all-false choice —
      // Cookiebot's withdraw() clears hasResponse. recordConsentWithdrawal
      // turns that back into the explicit refusal the platform needs to read,
      // and declines to invent one for a visitor who never answered.
      if (consent) writeConsentCookie(consent, window.location.hostname);
      else recordConsentWithdrawal(window.location.hostname);
    });
  }, []);

  return null;
}
