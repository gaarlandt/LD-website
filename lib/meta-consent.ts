// The two Meta consent gates. Pure on purpose (no window, no document, no fbq)
// so both can be unit-tested in the Node test env — the same reason
// lib/meta-events.ts and lib/cta-destination.ts sit apart from the components
// that consume them. The callers do the reading: lib/analytics.ts for the send
// gate, components/analytics/meta-pixel.tsx for the load gate.
//
// WHY BOTH READ A MERGE, NOT COOKIEBOT ALONE. Cookiebot's answer here can
// legitimately be the OLDER of the two on record. A choice made on
// mijn.letsdog.nl reaches this host in the `ld_consent` handover cookie FIRST,
// and ConsentSync only pushes it into Cookiebot a beat later — so there is a
// window in which Cookiebot still reports the previous answer. Since 2026-08-12
// that window is the EXPECTED path rather than an edge case: ads land directly
// on the platform, which shows its own consent prompt there (platform decision
// D-103), so "chosen on the platform, Cookiebot here does not know yet" is
// simply what ad traffic looks like. A Meta beacon cannot be un-sent, which is
// exactly the class `newestRecordedConsent` was written for; the PostHog
// provider already reads its gate this way.
//
// WHY THEY ARE NOT THE SAME FUNCTION. They differ in what the merge is allowed
// to DO, and that difference is deliberate — see each doc comment below.

import { newestRecordedConsent, type ConsentPayload } from "@/lib/consent";

/**
 * MAY A MAPPED EVENT GO OUT TO fbq RIGHT NOW? The merged newest choice, taken at
 * its word in both directions.
 *
 * The refusal direction is unambiguous: a refusal recorded after Cookiebot's
 * grant suppresses the send, and suppressing is always safe.
 *
 * THE GRANT DIRECTION IS A QUESTION FOR THE OWNER, NOT FOR THIS FILE. Because
 * the merge is symmetric, a marketing grant recorded on the platform while
 * Cookiebot here has no answer at all also reads as granted. Whether a platform
 * answer may stand in for a local banner answer is loop decision D-4 — a legal
 * call. It is pinned in both directions in lib/meta-consent.test.ts, so if the
 * answer is no, the change is one line here: require `cookiebot?.m === true` as
 * well, i.e. the same reading as `metaLoadGranted` below.
 */
export function metaSendGranted(
  cookiebot: ConsentPayload | null,
  cookie: ConsentPayload | null,
): boolean {
  return newestRecordedConsent(cookiebot, cookie)?.m === true;
}

/**
 * MAY fbevents.js BE FETCHED AT ALL? Cookiebot must say yes AND the newest
 * record must not contradict it — so here the merge can only ever SUBTRACT.
 *
 * Deliberately stricter than the send gate, for two reasons:
 *
 * 1. IT KEEPS THE REVOKE PATH INDEPENDENT OF SUBSCRIBER ORDER. This gate runs
 *    inside a Cookiebot consent subscriber, and a withdrawal arrives there as
 *    `null` (Cookiebot's `withdraw()` clears `hasResponse` rather than reporting
 *    an all-false choice). The all-false record that makes `ld_consent` agree is
 *    written by a DIFFERENT subscriber — ConsentCookie — during that same event
 *    dispatch, so at the instant this gate runs the cookie can still hold the
 *    pre-withdrawal grant. Were the merge authoritative here, whether a
 *    withdrawal actually revokes the pixel would depend on which effect
 *    registered its listener first (today ConsentCookie's does, purely because
 *    of JSX order in app/layout.tsx). A gate that can only subtract has no such
 *    dependency: `null` from Cookiebot always revokes, as it does now.
 * 2. LOADING IS THE BIGGER COMMITMENT. fbevents.js cannot be unloaded once
 *    fetched and writes `_fbp`/`_fbc` the moment it runs; a send is per-event.
 *    "No consent, no request to connect.facebook.net" is the posture D-93 chose
 *    on purpose, so this gate does not widen on a merge — it only narrows.
 *
 * What it still buys, which is the whole point: a refusal recorded on the
 * platform after a grant here means `fbevents.js` is never fetched at all.
 */
export function metaLoadGranted(
  cookiebot: ConsentPayload | null,
  cookie: ConsentPayload | null,
): boolean {
  return cookiebot?.m === true && metaSendGranted(cookiebot, cookie);
}
