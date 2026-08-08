import { PROD_HOSTS } from "@/lib/prod-hosts";

const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;

// Anywhere other than PROD_HOSTS (pages.dev preview URLs, localhost, etc.)
// sends events with debug_mode=true AND traffic_type='internal', so they get
// filtered out of standard GA4 reports by the property's "Internal Traffic"
// Data Filter (Admin → Data Filters). DebugView ignores Data Filters, so debug
// events still show up there for verification. PROD_HOSTS lives in
// lib/prod-hosts.ts so the PostHog provider tags environment the same way.

// CONSENT: governed by Google Consent Mode v2, not by tag blocking.
//
// These scripts still render untagged — no type="text/plain", no
// data-cookieconsent — and that is deliberate under Consent Mode: gtag.js
// loads, but components/analytics/consent-default.tsx has already put
// analytics_storage and every ad signal on 'denied', so it writes no _ga
// cookie and sends no advertising data until Cookiebot's update flips those
// signals. This is Google's "advanced" consent mode, the shape Cookiebot's own
// integration is built for, and it is why the config command below can stay
// unconditional. Reverses the earlier ungated posture per loop decision D-93.
//
// The residual, stated plainly rather than left implicit: with the tag loaded,
// a pre-consent pageview still reaches Google as a cookieless ping carrying an
// IP address. Consent Mode is designed that way (it feeds Google's modelling).
// Refusing even that means holding gtag.js itself back — add
//   type="text/plain" data-cookieconsent="statistics"
// to both <script> tags below, which turns this into "basic" consent mode:
// nothing reaches Google before consent, and the modelling is given up. That is
// a business call for Jur, not a code cleanup.

export function GA4() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !GA_ID_PATTERN.test(id)) return null;

  const prodHostsLiteral = JSON.stringify(PROD_HOSTS);
  const inlineScript =
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){dataLayer.push(arguments);}` +
    `gtag('js',new Date());` +
    `var __np=${prodHostsLiteral}.indexOf(location.hostname)===-1;` +
    `gtag('config','${id}',__np?{debug_mode:true,traffic_type:'internal'}:{});`;

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
    </>
  );
}
