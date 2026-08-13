// Where the footer's cookie control points when Cookiebot is not there (T-33,
// form 2). Kept in lib/ rather than inlined in the component for one reason: the
// component is a client component and the test env is Node, so the render cannot
// be pinned — but the thing that can silently rot here CAN be. If
// content/cookieverklaring.md or app/cookieverklaring/ is ever renamed, the
// footer keeps rendering a link and the only withdrawal route an ad-blocking
// visitor has quietly becomes a 404. lib/cookie-declaration.test.ts reads both
// off disk, so that rename fails a test instead of failing a visitor. Same move
// as lib/prod-hosts.ts and lib/cta-destination.ts.

export const COOKIE_DECLARATION_SLUG = "cookieverklaring";

/**
 * Footer href for the cookie declaration. Written without a trailing slash to
 * match the other Beleid links; `trailingSlash: true` in next.config.ts adds it.
 */
export const COOKIE_DECLARATION_PATH = `/${COOKIE_DECLARATION_SLUG}`;
