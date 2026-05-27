export function Cookiebot() {
  const cbid = process.env.NEXT_PUBLIC_COOKIEBOT_CBID;
  if (!cbid) return null;

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
