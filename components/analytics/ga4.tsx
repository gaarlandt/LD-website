const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;

export function GA4() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !GA_ID_PATTERN.test(id)) return null;

  const inlineScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;

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
