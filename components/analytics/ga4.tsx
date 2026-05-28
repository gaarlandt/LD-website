const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;

// Real production hostnames. Anywhere else (pages.dev preview URLs,
// localhost, etc.) sends events with debug_mode=true so they show up
// in GA4 DebugView only, not in standard reports.
const PROD_HOSTS = ["www.letsdog.nl", "letsdog.nl"];

export function GA4() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !GA_ID_PATTERN.test(id)) return null;

  // When SKIP_COOKIE_CONSENT is on, drop the type="text/plain" +
  // data-cookieconsent="statistics" gating so GA4 fires immediately
  // without waiting for a Cookiebot accept event. Cookiebot is also
  // not rendered (see cookiebot.tsx). Trade-off documented in .env.example.
  const skipConsent = process.env.NEXT_PUBLIC_SKIP_COOKIE_CONSENT === "true";
  const gateProps = skipConsent
    ? {}
    : { type: "text/plain", "data-cookieconsent": "statistics" };

  const prodHostsLiteral = JSON.stringify(PROD_HOSTS);
  const inlineScript =
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){dataLayer.push(arguments);}` +
    `gtag('js',new Date());` +
    `gtag('config','${id}',{debug_mode:${prodHostsLiteral}.indexOf(location.hostname)===-1});`;

  return (
    <>
      <script
        {...gateProps}
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <script
        {...gateProps}
        dangerouslySetInnerHTML={{ __html: inlineScript }}
      />
    </>
  );
}
