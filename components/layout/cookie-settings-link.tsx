"use client";

import { useEffect, useState } from "react";

// Cookiebot settles within milliseconds of uc.js arriving, which can beat a
// React effect, so presence is checked immediately AND on the load events —
// the same both-ways pattern lib/consent.ts uses for consent itself.
const COOKIEBOT_READY_EVENTS = ["CookiebotOnLoad", "CookiebotOnConsentReady"] as const;

/**
 * The "Cookie-instellingen" control in the footer's Beleid column.
 *
 * WHY THIS EXISTS: the GDPR requires that withdrawing consent is as easy as
 * giving it, and until now letsdog.nl offered no route at all — the footer held
 * seven policy pages and not one way to change your mind. The cookie declaration
 * rewritten in this same change promises this control by name, so shipping that
 * text without this control would be promising something that isn't there.
 *
 * WHY IT RENDERS NOTHING UNTIL COOKIEBOT IS PRESENT: the honest failure mode.
 * If uc.js is blocked or fails, a rendered control could not reopen anything,
 * and a visible "Cookie-instellingen" that silently does nothing is worse than
 * its absence — it reads as a working withdrawal route to both a visitor and a
 * regulator. So absence of the CMP means absence of the control, and a click
 * that somehow lands without `renew` still warns rather than throwing.
 *
 * WHY A BUTTON AND NOT AN ANCHOR: this activates script, it does not navigate.
 * An `<a href="#">` with a click handler is keyboard-hostile in exactly the way
 * this project has cleaned up before. It is styled to match its `<Link>`
 * neighbours so the column still reads as one list.
 *
 * NOTE ON VERIFYING: Cookiebot's dialog only renders on hosts inside its domain
 * group, so on a *.pages.dev preview the object exists (the control appears) but
 * the dialog will not open. The real proof is on production — and the thing to
 * check there is not just that the dialog opens, but that changing the choice
 * still updates `ld_consent` on `.letsdog.nl` (ConsentCookie already does that;
 * this control adds a new way to reach it, not a new writer).
 */
export function CookieSettingsLink() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const check = () => {
      if (window.Cookiebot) setAvailable(true);
    };
    check();
    for (const event of COOKIEBOT_READY_EVENTS) window.addEventListener(event, check);
    return () => {
      for (const event of COOKIEBOT_READY_EVENTS) window.removeEventListener(event, check);
    };
  }, []);

  if (!available) return null;

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          const renew = window.Cookiebot?.renew;
          if (typeof renew !== "function") {
            console.warn(
              "[consent] Cookiebot.renew() unavailable — cookie preferences cannot be reopened.",
            );
            return;
          }
          renew();
        }}
        className="inline-block py-0.5 text-left text-sm text-[var(--ld-on-forest)]/60 hover:text-[var(--ld-on-forest)] transition-colors duration-200 cursor-pointer"
      >
        Cookie-instellingen
      </button>
    </li>
  );
}
