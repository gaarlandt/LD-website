import { describe, it, expect } from "vitest";
import { metaLoadGranted, metaSendGranted } from "./meta-consent";
import { CONSENT_COOKIE_VERSION, type ConsentPayload } from "./consent";

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

// PINNED ON PURPOSE, AND FLIPPABLE IN ONE LINE. The merge is symmetric, so it
// changes the grant direction too: a marketing grant recorded on the platform
// while Cookiebot here has no answer at all now reads as granted, where before
// it read as refused. That is adjacent to loop decision D-4 (may a platform
// answer stand in for a local banner answer?), which is the owner's call and not
// this PR's. The behaviour is asserted here rather than guarded against, so the
// answer can be applied deliberately: if it is no, require `cookiebot?.m ===
// true` in metaSendGranted and this describe block inverts.
describe("metaSendGranted — the grant direction (D-4, owner's call)", () => {
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
  // D-4 does not get to widen it.
  it("does not fetch on a platform-only grant with no answer here", () => {
    expect(metaLoadGranted(null, at(LATER, true))).toBe(false);
    expect(metaSendGranted(null, at(LATER, true))).toBe(true);
  });
});
