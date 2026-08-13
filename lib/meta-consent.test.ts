import { describe, it, expect } from "vitest";
import { metaLoadGranted, metaSendGranted } from "./meta-consent";
import {
  CONSENT_COOKIE_VERSION,
  consentCookieSupersedes,
  type ConsentPayload,
} from "./consent";

const at = (t: string, m: boolean): ConsentPayload => ({
  v: CONSENT_COOKIE_VERSION,
  t,
  p: false,
  s: true,
  m,
});

const EARLIER = "2026-08-12T10:00:00.000Z";
const LATER = "2026-08-12T10:30:00.000Z";

describe("metaSendGranted — the refusal direction", () => {
  // The reason this file exists. Cookiebot here still reports the grant; the
  // visitor has meanwhile said no on mijn.letsdog.nl and that answer is already
  // in ld_consent, waiting for ConsentSync to hand it over. A beacon sent in
  // that window cannot be recalled.
  it("suppresses when the handover cookie carries a NEWER refusal", () => {
    expect(metaSendGranted(at(EARLIER, true), at(LATER, false))).toBe(false);
  });

  it("still sends when the cookie's refusal is OLDER than Cookiebot's grant", () => {
    // Newest wins in both directions — a stale refusal is not a veto.
    expect(metaSendGranted(at(LATER, true), at(EARLIER, false))).toBe(true);
  });

  it("keeps sending on the unchanged happy path", () => {
    // Ties go to Cookiebot, which is the measured rest state once both hosts
    // agree; and a grant with no cookie at all is the pre-platform case.
    expect(metaSendGranted(at(EARLIER, true), at(EARLIER, true))).toBe(true);
    expect(metaSendGranted(at(EARLIER, true), null)).toBe(true);
  });

  it("suppresses on a local refusal, cookie or no cookie", () => {
    expect(metaSendGranted(at(EARLIER, false), null)).toBe(false);
    expect(metaSendGranted(null, null)).toBe(false);
  });

  it("ignores a cookie written to a contract version we do not know", () => {
    // parseConsentPayload keeps an unknown `v` so the reader can decide; a later
    // version may split marketing, and reading its `m` would be a guess.
    const future = { ...at(LATER, false), v: CONSENT_COOKIE_VERSION + 1 };
    expect(metaSendGranted(at(EARLIER, true), future)).toBe(true);
  });

  it("does not act on a comparison it could not make", () => {
    expect(metaSendGranted(at(EARLIER, true), at("gisteren", false))).toBe(true);
  });
});

// PINNED ON PURPOSE, AND NOW SETTLED. The merge is symmetric, so it changes the
// grant direction too: a marketing grant recorded on the platform while Cookiebot
// here has no answer at all reads as granted. That was loop decision D-4, and on
// 2026-08-13 the owner chose to honour it — so this block states live behaviour,
// not a parked question. It stays asserted in both directions because the
// alternative reading is still one line away (`cookiebot?.m === true` here, i.e.
// the same reading as metaLoadGranted), and a change of posture should have to
// edit a test that says so.
describe("metaSendGranted — the grant direction (D-4, settled 2026-08-13)", () => {
  it("grants when the platform recorded marketing and Cookiebot is silent", () => {
    expect(metaSendGranted(null, at(LATER, true))).toBe(true);
  });

  it("grants when the platform's grant is NEWER than a refusal here", () => {
    expect(metaSendGranted(at(EARLIER, false), at(LATER, true))).toBe(true);
  });
});

describe("metaLoadGranted — the merge may only subtract", () => {
  it("never fetches fbevents.js when a newer refusal is on record", () => {
    expect(metaLoadGranted(at(EARLIER, true), at(LATER, false))).toBe(false);
  });

  it("loads on Cookiebot's own grant, unchanged", () => {
    expect(metaLoadGranted(at(EARLIER, true), null)).toBe(true);
    expect(metaLoadGranted(at(LATER, true), at(EARLIER, false))).toBe(true);
  });

  // The revoke path. A withdrawal reaches the subscriber as `null` while
  // ld_consent may still hold the pre-withdrawal grant, because the all-false
  // record is written by a different subscriber in the same event dispatch. This
  // gate must revoke regardless of which one ran first.
  it("revokes on a Cookiebot withdrawal even while the cookie still says granted", () => {
    expect(metaLoadGranted(null, at(EARLIER, true))).toBe(false);
  });

  // Deliberately stricter than metaSendGranted above: the send gate answers true
  // here, the load gate does not. Loading is the commitment that cannot be taken
  // back (fbevents.js cannot be unloaded, and it writes _fbp/_fbc on arrival), so
  // D-4 does not get to widen it. Note this is the state BEFORE ConsentSync runs;
  // what happens after it is the describe block below.
  it("does not fetch on a platform-only grant with no answer here", () => {
    expect(metaLoadGranted(null, at(LATER, true))).toBe(false);
    expect(metaSendGranted(null, at(LATER, true))).toBe(true);
  });
});

// THE SECOND-ORDER EFFECT OF D-4, PROVED RATHER THAN ASSUMED.
//
// The load gate can only ever SUBTRACT from Cookiebot's answer, so it never opens
// on the cookie alone — which is why the grant direction of metaSendGranted was
// inert until now: nothing ever reached Cookiebot without a local answer, the
// pixel was never fetched, `window.fbq` did not exist, and the send gate had
// nothing to send. Adopting the cookie (consentCookieSupersedes, above) is what
// puts Cookiebot into the choice, and THAT is what opens the load gate.
//
// So the chain below is the actual behaviour change, and the refusal case is the
// one that must not move. Both are asserted through the real predicate rather
// than by hand-writing the post-adoption state.
describe("D-4 adoption and the Meta gates, in sequence", () => {
  it("opens the load gate for a marketing consent recorded on the platform", () => {
    const fromPlatform = at(LATER, true);

    // 1. Cookiebot holds nothing, so the pixel is not fetched yet…
    expect(metaLoadGranted(null, fromPlatform)).toBe(false);

    // 2. …but the choice allows something, so ConsentSync adopts it…
    expect(consentCookieSupersedes(fromPlatform, null)).toBe(true);

    // 3. …and Cookiebot, having accepted it, re-stamps at NOW and reports it.
    const adopted = at("2026-08-12T11:00:00.000Z", true);
    expect(metaLoadGranted(adopted, fromPlatform)).toBe(true);
    expect(metaSendGranted(adopted, fromPlatform)).toBe(true);
  });

  // "Refused marketing" and "refused everything" are different cookies and take
  // different routes to the same closed gate. Keeping both is the point: the
  // first is ADOPTED (it is a real choice, and statistics is a real yes) and the
  // pixel is still never fetched, because adoption carries m:false with it.
  it("adopts a statistics-only choice without ever opening the pixel", () => {
    const statsOnly = at(LATER, false); // p:false, s:true, m:false

    expect(consentCookieSupersedes(statsOnly, null)).toBe(true);
    const adopted = at("2026-08-12T11:00:00.000Z", false);
    expect(metaLoadGranted(adopted, statsOnly)).toBe(false);
    expect(metaSendGranted(adopted, statsOnly)).toBe(false);
  });

  it("keeps the pixel unfetchable when the platform choice refused everything", () => {
    // The all-false clamp means adoption never happens, so Cookiebot keeps no
    // response and the load gate stays shut on its own first term.
    const refusedAll: ConsentPayload = { ...at(LATER, false), p: false, s: false };

    expect(consentCookieSupersedes(refusedAll, null)).toBe(false);
    expect(metaLoadGranted(null, refusedAll)).toBe(false);
    expect(metaSendGranted(null, refusedAll)).toBe(false);
  });

  it("keeps a withdrawal made here from reopening the gate", () => {
    // The withdrawal round-trip seen from the pixel's side: `withdraw()` leaves
    // Cookiebot reporting null while ld_consent holds the all-false record this
    // site just wrote. Adoption is clamped, so the gate cannot be reopened by it.
    const ourWithdrawal: ConsentPayload = { ...at(LATER, false), p: false, s: false };
    expect(consentCookieSupersedes(ourWithdrawal, null)).toBe(false);
    expect(metaLoadGranted(null, ourWithdrawal)).toBe(false);
  });
});
