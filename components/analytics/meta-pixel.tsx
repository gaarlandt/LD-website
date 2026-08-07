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
// NOTE: unlike GA4 there is no environment split — Meta has no traffic_type
// equivalent, so preview and localhost events land in the same dataset as
// production. See docs/analytics-events.md.

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

  const inlineScript =
    `!function(f,b,e,v,n,t,s)` +
    `{if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
    `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';` +
    `n.queue=[];t=b.createElement(e);t.async=!0;` +
    `t.src=v;s=b.getElementsByTagName(e)[0];` +
    `s.parentNode.insertBefore(t,s)}(window,document,'script',` +
    `'https://connect.facebook.net/en_US/fbevents.js');` +
    `fbq('init','${id}');` +
    `fbq('track','PageView');`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
