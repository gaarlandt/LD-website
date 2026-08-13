"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { COOKIE_DECLARATION_PATH } from "@/lib/cookie-declaration";

// Cookiebot settles within milliseconds of uc.js arriving, which can beat a
// React effect, so presence is checked immediately AND on the load events —
// the same both-ways pattern lib/consent.ts uses for consent itself.
const COOKIEBOT_READY_EVENTS = ["CookiebotOnLoad", "CookiebotOnConsentReady"] as const;

// One class list for both states on purpose — see "WHY THE FALLBACK IS THE FIRST
// RENDER" below. `text-left` and `cursor-pointer` are what a <button> needs to
// sit flush with its <Link> neighbours in the column; both are no-ops on a link,
// so sharing the string is what makes the swap invisible rather than merely
// similar.
const CONTROL_CLASS =
  "inline-block py-0.5 text-left text-sm text-[var(--ld-on-forest)]/60 hover:text-[var(--ld-on-forest)] transition-colors duration-200 cursor-pointer";

/**
 * The "Cookie-instellingen" control in the footer's Beleid column.
 *
 * WHY THIS EXISTS: the GDPR requires that withdrawing consent is as easy as
 * giving it, and until recently letsdog.nl offered no route at all — the footer
 * held seven policy pages and not one way to change your mind. The cookie
 * declaration promises this control by name, so shipping that text without this
 * control would be promising something that isn't there.
 *
 * WHY IT FALLS BACK TO A LINK INSTEAD OF RENDERING NOTHING (loop task T-33,
 * form 2 — Jur's call, 2026-08-13). This used to `return null` when Cookiebot
 * was absent, on the argument that a visible control which cannot open anything
 * reads as a working withdrawal route to a visitor and to a regulator alike.
 * That argument holds, but its cost did not survive contact: whoever blocks
 * uc.js — an ad blocker, or a load that simply failed — then saw NO withdrawal
 * route on letsdog.nl at all, while PostHog keeps measuring there on legitimate
 * interest. So the branch now renders a link to the cookie declaration, whose
 * section 5 names the two routes that still work without Cookiebot: the
 * preference screen on mijn.letsdog.nl (reachable without an account) and the
 * browser's own settings. The control therefore never points at nothing — it
 * either opens the dialog or hands you the page that says where to go. That
 * dependency on the declaration's copy is pinned in lib/cookie-declaration.test.ts,
 * because a rewrite that dropped those routes would turn this into a dead end.
 *
 * Yes, this means the Beleid column can hold two links to /cookieverklaring: the
 * policy entry and, in the fallback state, this one. Deliberate — a visitor
 * hunting for a way to change their mind scans for "instellingen", not for
 * "verklaring", and the duplicate only exists for visitors who have no dialog.
 *
 * WHY THE AVAILABLE PATH IS A BUTTON AND NOT AN ANCHOR: it activates script, it
 * does not navigate. An `<a href="#">` with a click handler is keyboard-hostile
 * in exactly the way this project has cleaned up before. A click that somehow
 * lands without `renew` still warns rather than throwing.
 *
 * WHY THE FALLBACK IS THE FIRST RENDER RATHER THAN A TIMEOUT: `available` starts
 * false on the server and on the client's first render, so the static HTML
 * carries the link and hydration matches — the same discipline as when both
 * rendered nothing. Nothing needs suppressing. And there is no flash to hide:
 * both states carry the same label and the same class list, so a visitor whose
 * Cookiebot loads normally sees the text stay exactly where it is while only the
 * element behind it changes. A pleasant side effect of putting the fallback in
 * the exported HTML: the signpost survives JavaScript being off entirely.
 *
 * NOTE ON VERIFYING: Cookiebot's dialog only renders on hosts inside its domain
 * group, so on a *.pages.dev preview the object exists (the button appears) but
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

  if (!available) {
    return (
      <li>
        <Link href={COOKIE_DECLARATION_PATH} className={CONTROL_CLASS}>
          Cookie-instellingen
        </Link>
      </li>
    );
  }

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
        className={CONTROL_CLASS}
      >
        Cookie-instellingen
      </button>
    </li>
  );
}
