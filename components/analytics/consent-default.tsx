// Google Consent Mode v2 DEFAULT state — everything denied except
// security_storage, set before any Google tag can act.
//
// WHY THIS EXISTS. Cookiebot sends the consent *update* by itself and does it
// correctly (measured 2026-08-08 on letsdog.nl: a full v2 update with all seven
// signals, including ad_user_data and ad_personalization). What it does NOT send
// is the *default*, and that half is the site's own job — Cookiebot's article
// says so in as many words ("You will manually need to ensure that a default
// state is set"). Without it there is no denied state to start from, so Google
// tags run at full permission until the visitor answers the banner. Measured on
// production the same day, with no answer given at all: _ga and _ga_0FCGXJHMMY
// were both set. That is the ePrivacy Art. 5(3) problem, and this file is the
// fix. Mandated by loop decision D-93 (Jur, 2026-08-07), which reverses the
// earlier "GA runs regardless of the banner" posture.
//
// The snippet is Cookiebot's own, verbatim from
// https://support.cookiebot.com/hc/en-us/articles/360016047000-Implementing-Google-Consent-Mode
// ("Inline script implementation"). Don't tune the values here — a default that
// disagrees with Cookiebot's update is worse than none.
//
// TWO ATTRIBUTES THAT ARE LOAD-BEARING:
//   data-cookieconsent="ignore" — without it Cookiebot's auto-blocker holds this
//   script inert until consent is given, which is exactly backwards: the one
//   script that must run BEFORE consent would be the one waiting for it.
//   No `async`/`defer` — this has to execute during head parsing (see below).
//
// PLACEMENT, and why "first child of <head>" is not the whole story. Cookiebot
// says the default "must precede gtag.js". In the emitted HTML it does not
// literally: React hoists <script async src> elements (gtag.js, Cookiebot's
// uc.js) above the layout's inline children, so gtag.js's TAG sits earlier in
// the source than this one. That is fine, and the reason is worth knowing
// because it is what actually makes this correct: gtag.js is async, it does
// nothing until it processes the dataLayer, and it processes that array IN
// PUSH ORDER. This script pushes during head parsing; ga4.tsx pushes its
// `config` from <body>. So the default is always in the queue ahead of the
// first measurement command no matter when gtag.js finishes loading. Keep this
// component in <head> and keep GA4's config in <body> and that ordering holds.
//
// Rendered unconditionally, including when NEXT_PUBLIC_GA_MEASUREMENT_ID is
// unset. Deny-by-default must not depend on another component's env var, and it
// governs any Google tag added later, not just today's GA4.
//
// url_passthrough stays false (Cookiebot's documented default). Turning it on
// would pass the _ga identifier through URL query parameters when a visitor
// refuses cookies — a privacy call, and Jur's to make, not a code tweak.

const CONSENT_DEFAULT_SCRIPT = [
  "window.dataLayer=window.dataLayer||[];",
  "function gtag(){dataLayer.push(arguments);}",
  "gtag('consent','default',{",
  "'ad_personalization':'denied',",
  "'ad_storage':'denied',",
  "'ad_user_data':'denied',",
  "'analytics_storage':'denied',",
  "'functionality_storage':'denied',",
  "'personalization_storage':'denied',",
  "'security_storage':'granted',",
  "'wait_for_update':500",
  "});",
  "gtag('set','ads_data_redaction',true);",
  "gtag('set','url_passthrough',false);",
].join("");

export function ConsentDefault() {
  return (
    <script
      data-cookieconsent="ignore"
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }}
    />
  );
}
