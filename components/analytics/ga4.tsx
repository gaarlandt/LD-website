const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;

// Real production hostnames. Anywhere else (pages.dev preview URLs,
// localhost, etc.) sends events with debug_mode=true.
const PROD_HOSTS = ["www.letsdog.nl", "letsdog.nl"];

// NOTE: GA4 scripts here intentionally render WITHOUT Cookiebot's
// type="text/plain" + data-cookieconsent gating. Tracking fires
// immediately on page load regardless of consent banner state. Cookiebot
// (in cookiebot.tsx) still loads and shows the banner for UX, but
// because our scripts aren't tagged with the gating attrs, Cookiebot's
// auto-blocker leaves them alone.
//
// This is "consent theater" — legally non-compliant for non-essential
// cookies under EU/NL law. The trade-off was explicitly accepted by
// the product owner to keep tracking continuous on every visit.
//
// If you want real consent gating back: add
//   type="text/plain" data-cookieconsent="statistics"
// to both <script> tags below. Cookiebot will then hold them inert
// until the user accepts the "statistics" category, at which point
// Cookiebot transforms type to "text/javascript" and they execute.

export function GA4() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !GA_ID_PATTERN.test(id)) return null;

  const prodHostsLiteral = JSON.stringify(PROD_HOSTS);
  const inlineScript =
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){dataLayer.push(arguments);}` +
    `gtag('js',new Date());` +
    `gtag('config','${id}',{debug_mode:${prodHostsLiteral}.indexOf(location.hostname)===-1});`;

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
