const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;

// Real production hostnames. Anywhere else (pages.dev preview URLs,
// localhost, new.letsdog.nl, etc.) sends events with debug_mode=true
// so they show up in GA4 DebugView only, not in standard reports.
const PROD_HOSTS = ["www.letsdog.nl", "letsdog.nl"];

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
        type="text/plain"
        data-cookieconsent="statistics"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <script
        type="text/plain"
        data-cookieconsent="statistics"
        dangerouslySetInnerHTML={{ __html: inlineScript }}
      />
    </>
  );
}
