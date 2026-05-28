export function Cookiebot() {
  const cbid = process.env.NEXT_PUBLIC_COOKIEBOT_CBID;
  const skipConsent = process.env.NEXT_PUBLIC_SKIP_COOKIE_CONSENT === "true";

  // When SKIP_COOKIE_CONSENT is on, we don't load the consent banner at all
  // and GA4 (in ga4.tsx) fires unconditionally. See .env.example for the
  // legal trade-offs of leaving this on in production.
  if (!cbid || skipConsent) return null;

  return (
    <script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid={cbid}
      data-blockingmode="auto"
      async
    />
  );
}
