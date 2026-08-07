// Meta Pixel base code, verbatim from Meta's installation snippet apart from
// the id coming out of an env var. Meta's instruction is that this belongs
// between the <head> tags on every page, so it renders from the root layout's
// <head> (unlike GA4, which predates that placement and sits in <body>).
//
// CONSENT: fires unconditionally, matching the existing GA4/PostHog posture.
// Cookiebot's auto-blocker only holds a script inert when it carries
// type="text/plain" + data-cookieconsent, and these tags deliberately don't.
// Explicitly decided by the product owner on 2026-08-07, risk accepted, with
// the note that content/cookieverklaring.md still says advertentiepixels are
// placed "alleen na toestemming" (§3.3, §5). Loop decision D-1 carries that
// gap. To gate it later: add
//   type="text/plain" data-cookieconsent="marketing"
// to the script tag below and drop the <noscript> pixel (a JS-disabled browser
// never sees the banner, so it can't consent).
//
// PRODUCTION ONLY. Meta has no traffic_type/environment equivalent — every event
// lands in one dataset — so the only way to keep preview and localhost out of the
// numbers that campaigns optimise against is to not fire at all off production.
// Since 2026-08-07 (letsdog.nl now serves this site) that is the right trade.
//
// The check is at RUNTIME, not build time, and has to be: one static export is
// served on both letsdog.nl and *.pages.dev, so the HTML is identical and only
// location.hostname can tell them apart. Same mechanism ga4.tsx uses to tag
// internal traffic; PROD_HOSTS is the shared list.
//
// Consequence worth knowing: the pixel does not exist on branch previews, so it
// cannot be verified there. Verify on production with Meta Pixel Helper or
// Events Manager -> Test Events.
//
// Off production nothing loads: no fbevents.js, no window.fbq. The guards in
// lib/analytics.ts (typeof window.fbq === "function") then skip the Meta sink on
// their own, so there is one gate rather than a check per call site.

import { PROD_HOSTS } from "@/lib/prod-hosts";

const PIXEL_ID_PATTERN = /^\d{15,16}$/;

export function MetaPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!id) return null;
  if (!PIXEL_ID_PATTERN.test(id)) {
    // A *set but malformed* id (stray whitespace, wrong digit count, the value
    // stored as an encrypted secret the build can't read) is the dangerous
    // case: it looks configured in the dashboard while rendering nothing, so
    // the pixel reads as installed for weeks. An unset id is the documented
    // "disabled" path and stays silent.
    console.warn(
      `[MetaPixel] NEXT_PUBLIC_META_PIXEL_ID is set but not a 15-16 digit id — pixel not rendered. Received: ${JSON.stringify(id)}`,
    );
    return null;
  }

  // Meta's snippet verbatim, wrapped in the production-host gate.
  const inlineScript =
    `(function(){if(${JSON.stringify(PROD_HOSTS)}.indexOf(location.hostname)===-1)return;` +
    `!function(f,b,e,v,n,t,s)` +
    `{if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
    `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';` +
    `n.queue=[];t=b.createElement(e);t.async=!0;` +
    `t.src=v;s=b.getElementsByTagName(e)[0];` +
    `s.parentNode.insertBefore(t,s)}(window,document,'script',` +
    `'https://connect.facebook.net/en_US/fbevents.js');` +
    `fbq('init','${id}');` +
    `fbq('track','PageView');})();`;

  // Meta's <noscript> fallback pixel is deliberately omitted. It cannot be
  // host-gated (no JS to run the check), so it would be the one path still
  // leaking preview traffic into the dataset. It is also the least defensible
  // path under the ungated consent posture — a scripting-disabled browser never
  // renders the Cookiebot banner, so that visitor has no way to refuse — and it
  // only ever covered visitors who could not complete a JS checkout anyway.
  return <script dangerouslySetInnerHTML={{ __html: inlineScript }} />;
}
