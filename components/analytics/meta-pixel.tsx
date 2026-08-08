"use client";

// Meta Pixel, gated on marketing consent.
//
// WHAT CHANGED AND WHY. Until 2026-08-08 this rendered Meta's snippet inline and
// fired unconditionally, on the reasoning that Cookiebot's auto-blocker would
// catch it if it mattered. It does not, and that was measured on production:
// with an explicit refusal recorded, Cookiebot removed _ga, _ga_0FCGXJHMMY and
// PostHog's cookie — and left _fbp standing, with fbevents.js still loaded. The
// pixel does not even appear in Cookiebot's tag list. Auto-blocking rewrites
// script tags it recognises; the actual fbevents.js element is created by this
// snippet at runtime, so there is nothing for it to recognise in time.
//
// The fix therefore cannot be "tag it and let Cookiebot handle it" — that is the
// mechanism that already failed here. We own the pixel's consent lifecycle
// ourselves, reading Cookiebot's public consent state instead of relying on its
// blocker. Mandated by loop decision D-93 (Jur, 2026-08-07): no consent, no
// measurement, for Google and Meta alike.
//
// CONSEQUENCE: fbevents.js is not requested at all until marketing is granted,
// so a visitor who refuses or ignores the banner makes no request to
// connect.facebook.net and gets no _fbp. That is stricter than tagging the
// script would have been, and it is the point.
//
// ON WITHDRAWAL a loaded fbevents.js cannot be unloaded, so we do the two things
// that can be done: fbq('consent','revoke'), which is Meta's own documented stop
// signal, and deleting the cookies it set. From the next page load the pixel
// simply never initialises again. Events fired while revoked are held by fbq and
// not sent.
//
// PRODUCTION ONLY, unchanged. Meta has no traffic_type/environment equivalent —
// every event lands in one dataset — so preview and localhost must not fire at
// all. The check is at RUNTIME because one static export serves both letsdog.nl
// and *.pages.dev, so only location.hostname can tell them apart. Note the
// interaction with consent: Cookiebot's banner does not render on *.pages.dev
// (that host is not in the domain group — verified 2026-08-08), so on a preview
// there is no way to grant marketing consent and the pixel is doubly off.
// Verify the pixel on production, with Meta Pixel Helper or Events Manager →
// Test Events, and see
// docs/solutions/developer-experience/verifying-a-tracking-pixel-fires-stub-fbq-not-network-reads.md
// for why a network check reports false negatives here.
//
// Off production, or before consent, window.fbq does not exist. The guards in
// lib/analytics.ts (typeof window.fbq === "function") then skip the Meta sink on
// their own, so there is one gate rather than a check per call site.

import { useEffect } from "react";
import { isProdHost } from "@/lib/prod-hosts";
import { consentCookieDomain, onCookiebotConsent } from "@/lib/consent";

const PIXEL_ID_PATTERN = /^\d{15,16}$/;
const FBEVENTS_SRC = "https://connect.facebook.net/en_US/fbevents.js";

// Both first-party cookies fbevents.js writes on the shared domain: _fbp (the
// browser id) and _fbc (the click id from an ad landing).
const META_COOKIES = ["_fbp", "_fbc"];

type FbqFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    _fbq?: unknown;
  }
}

// Meta's base snippet, transcribed rather than pasted: it has to be callable on
// demand instead of running at parse time, and the stub is what queues calls
// until fbevents.js arrives. Behaviour is Meta's, shape is ours.
function loadMetaPixel(id: string): void {
  if (typeof window.fbq === "function") {
    // Already loaded — a re-grant after a withdrawal in the same page.
    window.fbq("consent", "grant");
    return;
  }

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
    else fbq.queue.push(args);
  } as FbqFunction;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq ??= fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = FBEVENTS_SRC;
  document.head.appendChild(script);

  // grant before init: we only get here with marketing consent, and stating it
  // explicitly means the pixel never has to infer its own permission.
  fbq("consent", "grant");
  fbq("init", id);
  fbq("track", "PageView");
}

function revokeMetaPixel(hostname: string): void {
  if (typeof window.fbq === "function") window.fbq("consent", "revoke");

  // Cookiebot clears cookies for a withdrawn category, but only for tags it
  // knows about — and it does not know this one, which is exactly how _fbp
  // survived a refusal until now. So we clear them. Deleting needs the same
  // Domain the cookie was written with; the host-only attempt covers a
  // preview host, where there is no Domain.
  const domain = consentCookieDomain(hostname);
  for (const name of META_COOKIES) {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
    if (domain) document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}`;
  }
}

export function MetaPixel() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!id) return;
    if (!PIXEL_ID_PATTERN.test(id)) {
      // A *set but malformed* id (stray whitespace, wrong digit count, the value
      // stored as an encrypted secret the build can't read) is the dangerous
      // case: it looks configured in the dashboard while doing nothing, so the
      // pixel reads as installed for weeks. An unset id is the documented
      // "disabled" path and stays silent.
      console.warn(
        `[MetaPixel] NEXT_PUBLIC_META_PIXEL_ID is set but not a 15-16 digit id — pixel not loaded. Received: ${JSON.stringify(id)}`,
      );
      return;
    }
    if (!isProdHost(window.location.hostname)) return;

    // No consent object at all (never answered, or answered and then withdrawn
    // — Cookiebot represents both as "no response") is treated exactly like a
    // refusal. That is what stops a withdrawal from leaving the pixel running,
    // and it also clears the _fbp that visitors still carry from the period
    // when this pixel fired ungated.
    return onCookiebotConsent((consent) => {
      if (consent?.m) loadMetaPixel(id);
      else revokeMetaPixel(window.location.hostname);
    });
  }, []);

  return null;
}
