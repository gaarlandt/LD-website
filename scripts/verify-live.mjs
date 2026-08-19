#!/usr/bin/env node
//
// verify:live — the consent and attribution chain, measured AT THE OBJECTS on
// the deployed site. Run it deliberately, before and after a release that
// touches components/analytics/**, lib/consent.ts, lib/attribution.ts or the
// cookie declaration. It is not CI: this repo has no GitHub Actions at all
// (Cloudflare Pages builds straight from pushes), and Jur's call was a script
// you run on purpose and tick off a checklist.
//
// WHY IT EXISTS, and it is not hypothetical. In August 2026 this repo shipped
// three consecutive fixes for one consent bug. The first two were correct-
// looking, passed the whole unit suite, passed review, deployed — and did
// nothing. 307 green tests agreed with a broken production site across two
// deploys. What finally caught it was measuring at the objects on the deployed
// build: Cookiebot.hasResponse still false after 2500 ms, the dialog on screen,
// no _ga, fbq undefined. The lesson, now the rule for anything hanging off a
// third party: A MARKER IN THE SHIPPED BUNDLE PROVES CODE WAS DELIVERED, NOT
// THAT IT IS CALLED. Unit tests describe a Cookiebot that exists all at once;
// production delivers one that arrives in pieces (window.Cookiebot published at
// byte 61890 of uc.js, submitCustomConsent at 105795; its three scripts land
// 221/441/549 ms in, while React finishes hydrating at 210 ms). No double, no
// fixture and no typecheck can see that. A real browser on the real hosts can.
//
// IT RESTATES THE CONTRACT INSTEAD OF IMPORTING IT. Nothing here imports
// lib/consent.ts or lib/attribution.ts, and that is deliberate rather than lazy:
// a checker that builds its expectation out of the code under test agrees with
// that code's bugs by construction — which is exactly how a green suite sat on
// top of a broken site. The wire formats below are typed out from the contracts
// (`ld_consent`: URL-encoded JSON, keys v,t,p,s,m in that order; `ld_attribution`:
// v,t then the seven campaign names) so that a change on either side has to be
// made here too, in the open.
//
// WHAT IT NEEDS, stated because none of it is optional:
//   * the REAL hosts — letsdog.nl and mijn.letsdog.nl. The Cookiebot banner does
//     not render on *.pages.dev (that host is not in the domain group) and the
//     ld_* cookies are written host-only off production, so a preview cannot
//     exercise the crossing this file is about.
//   * a REAL Cookiebot. Every proof drives the live CMP — its own dialog
//     buttons, its own withdraw() — never a stub.
//   * a REAL Chrome, driven by playwright-core (a devDependency; it downloads no
//     browser of its own and uses the Chrome already installed on this Mac).
//   * a CLEAN cookie state per proof. Every proof gets a brand-new browser
//     context; nothing is shared, and nothing is left behind on your own profile.
//   * `wrangler`, logged in, for the build-provenance precondition. Without it
//     the run refuses to start unless you pass --skip-provenance, and then says
//     so on every line of the report.
//
// THE PRICE, STATED NOT HIDDEN: this measures production, so it writes into
// production. A full run answers the live banner a handful of times and
// therefore adds roughly a dozen real pageviews/events to GA4, Meta and PostHog
// from one browser. That is the cost of measuring at the objects instead of at a
// mock, and it is small enough to pay on a release day.

import { appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error(
    "verify:live needs the playwright-core devDependency.\n" +
      "  npm install            (or, if you installed with --omit=dev, re-run without it)\n" +
      "It downloads no browser: it drives the Chrome already on this machine.",
  );
  process.exit(2);
}

// =============================================================================
// WHAT WE MEASURE AGAINST
// =============================================================================

const SITE_HOST = "letsdog.nl";
const SITE_ORIGIN = `https://${SITE_HOST}`;
const PLATFORM_ORIGIN = "https://mijn.letsdog.nl";
const PLATFORM_CHECKOUT = `${PLATFORM_ORIGIN}/checkout`;
const PAGES_PROJECT = "website-letsdog";

/**
 * WHERE THIS RUN RECORDS THAT IT EXISTED (T-61).
 *
 * This script measures production by writing into production, and one of the
 * things it writes is MISLEADING rather than merely noisy. P6's refusal arm
 * asserts that Cookiebot deletes `ph_<token>_posthog` — the deletion IS the
 * test — so every run leaves behind sessions whose PostHog signature is a
 * `$pageleave` with no `$pageview`. That is not a shape anyone reads as noise;
 * it is a shape people read as a FINDING, and on 2026-08-17 two sessions did
 * exactly that and built a loss rate out of a denominator that was mostly
 * themselves.
 *
 * So the run writes down when it ran. A later query over `app='website'` can
 * then exclude these windows the way it excludes bot traffic, instead of
 * reconstructing them forensically from device ids and timestamps.
 *
 * DELIBERATELY A WINDOW AND NOT A MARKER IN THE DATA. Tagging our own traffic
 * (a super-property, a recognisable `$device_id`) would filter better, but it
 * would put this runner inside the very channel P6 measures — and P6 exists
 * precisely to prove nothing sits in between. A timestamp range changes nothing
 * about what the site sends, and therefore nothing about what the proofs see.
 *
 * LOCAL BY DESIGN, AND THAT IS THE LIMIT: this file records what THIS machine
 * did. The durable, shared copy is the run window printed at the end of the
 * report, which the ship checklist says to paste into the session LOG entry.
 */
const RUN_LOG = new URL("../.verify-live-runs.log", import.meta.url).pathname;

const CONSENT_COOKIE = "ld_consent";
const ATTRIBUTION_COOKIE = "ld_attribution";
const COOKIEBOT_COOKIE = "CookieConsent";
const GA_COOKIE = "_ga";
const META_COOKIES = ["_fbp", "_fbc"];
const POSTHOG_COOKIE_PATTERN = /^ph_.*_posthog$/;

const COOKIEBOT_DIALOG = "#CybotCookiebotDialog";
const BUTTON_ALLOW_ALL = "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll";
const BUTTON_DENY = "#CybotCookiebotDialogBodyButtonDecline";

/**
 * HOW LONG A "NOTHING HAPPENED" CLAIM HAS TO WATCH FOR.
 *
 * A positive needs no clock — the request either arrived or it did not, and once
 * it has, waiting longer changes nothing. A NEGATIVE is the opposite: "no
 * request to connect.facebook.net" is only worth something if you looked for
 * long enough that one would have shown up. So every must-not-happen assertion
 * sits behind this window, timed from the moment the CMP has settled.
 *
 * 3500 ms because the positive direction is fast and measured: on this site
 * Cookiebot's own three scripts complete at 221/441/549 ms, and on a grant
 * fbevents.js and the first PostHog capture follow inside the next second (the
 * report prints the exact latency it saw on each run, so the margin stays
 * visible rather than assumed). This is several times that, and still short
 * enough that a full run stays around two minutes.
 */
const NEGATIVE_WINDOW_MS = 3500;

/** Cookiebot's whole chain completes inside ~550 ms; this is twenty times that. */
const CMP_TIMEOUT_MS = 15_000;

// -----------------------------------------------------------------------------
// The two wire formats, typed out from the contracts rather than imported.
// -----------------------------------------------------------------------------

/** `ld_consent` on the wire: URL-encoded JSON, keys in the contract's order. */
function serializeConsent({ v, t, p, s, m }) {
  return encodeURIComponent(JSON.stringify({ v, t, p, s, m }));
}

function parseConsent(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw));
    return typeof o === "object" && o !== null ? o : null;
  } catch {
    return null;
  }
}

function parseJsonCookie(raw) {
  return parseConsent(raw);
}

/** An ISO instant with Z and milliseconds — the only shape the contract accepts. */
function isoNow(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

/** A cookie as the PLATFORM would have written it, on the shared parent domain. */
function platformConsentCookie({ p, s, m, t = isoNow(-10 * 60 * 1000), v = 1 }) {
  return {
    name: CONSENT_COOKIE,
    value: serializeConsent({ v, t, p, s, m }),
    domain: ".letsdog.nl",
    path: "/",
    secure: true,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  };
}

// =============================================================================
// REPORTING — a red run must say WHICH LINK OF THE CHAIN BROKE
// =============================================================================
// Every assertion carries three things: what it measured, what it expected, and
// why the site is supposed to behave that way. The third one is not decoration.
// The failure this whole file exists to catch was invisible precisely because
// nothing on screen named the broken link — the tests were green, the bundle
// carried the fix, and the site was wrong.

const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  dim: (s) => (TTY ? `\x1b[2m${s}\x1b[0m` : s),
  red: (s) => (TTY ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (TTY ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (TTY ? `\x1b[33m${s}\x1b[0m` : s),
  bold: (s) => (TTY ? `\x1b[1m${s}\x1b[0m` : s),
};

const show = (value) => {
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
};

class Report {
  constructor() {
    this.proofs = [];
    this.current = null;
  }

  begin(id, title) {
    this.current = { id, title, checks: [], status: "NOT RUN", reason: "no assertion was reached" };
    this.proofs.push(this.current);
    console.log(`\n${c.bold(id)} ${title}`);
  }

  /** One assertion. `why` is the contract sentence this line defends. */
  check(label, measured, expected, why) {
    const ok = expected.test(measured);
    this.current.checks.push({ label, measured, expected: expected.describe, why, ok });
    const mark = ok ? c.green("  ok  ") : c.red(" FAIL ");
    console.log(`  ${mark} ${label.padEnd(46)} ${c.dim("measured")} ${show(measured)}`);
    if (!ok) {
      console.log(`         ${" ".repeat(46)} ${c.dim("expected")} ${expected.describe}`);
      console.log(`         ${c.yellow("why")} ${why}`);
    }
    return ok;
  }

  /** Something worth printing that is not an assertion (a latency, a device id). */
  note(text) {
    console.log(`  ${c.dim("·")}      ${c.dim(text)}`);
  }

  end() {
    const failed = this.current.checks.filter((k) => !k.ok);
    if (this.current.checks.length === 0) return;
    this.current.status = failed.length === 0 ? "PASS" : "FAIL";
    this.current.reason = failed.length === 0 ? "" : `${failed.length} assertion(s) failed`;
  }

  /**
   * A proof that could not be attempted. Loud, and fatal — never a silent skip.
   * `broke` distinguishes the two reasons a proof goes unmeasured: you did not
   * ask for it, or it fell over. Both leave the run unable to claim the
   * behaviour; only the second one is a surprise.
   */
  notRun(error, broke = true) {
    this.current.status = "NOT RUN";
    this.current.reason = error;
    console.log(`  ${c.red("NOT RUN")} ${error}`);
    if (broke) {
      console.log(
        `         ${c.yellow("why")} an unrunnable proof is not a passing proof — this run cannot ` +
          `claim the behaviour it did not measure`,
      );
    }
  }
}

// =============================================================================
// PRECONDITION — WHICH BUILD AM I MEASURING?
// =============================================================================
// Read this before touching anything below it. A check that passes against a
// stale bundle is the same failure in a new costume, and the likeliest way to
// produce one is entirely ordinary: push, run this immediately, and measure the
// PREVIOUS build while Cloudflare is still building the new one. Green, wrong,
// and indistinguishable from green and right.
//
// So the run establishes a chain of measured facts rather than a claim:
//
//   1. wrangler names the newest PRODUCTION deployment and the commit it was
//      built from.
//   2. That deployment has its own permanent URL (<id>.website-letsdog.pages.dev).
//      Fetch it, and fetch letsdog.nl, both with cache-control: no-cache.
//   3. Reduce each page to a BUILD FINGERPRINT: the sorted set of content-hashed
//      /_next/static/** URLs it references, hashed. Turbopack renames every one
//      of them when the code changes, so the fingerprint is the build's identity
//      and two builds cannot share it by accident.
//   4. Equal fingerprints prove the apex really is serving that deployment —
//      which is what turns "wrangler says commit X" into "the page in front of
//      me IS commit X". Unequal means the CDN, the browser or Cloudflare is
//      handing you something else, and nothing below is worth measuring.
//   5. That fingerprint is then re-derived on EVERY page load in every proof. A
//      deploy landing mid-run turns the run red instead of quietly mixing two
//      builds into one report.
//
// The commit is compared against origin/main by default, or --commit <sha>.
// Note what step 1 alone cannot tell you: `wrangler pages deployment list` shows
// the newest deployment whether or not its build succeeded. Step 4 is what
// covers that — a failed build never becomes the thing the apex serves, so its
// fingerprint will not match.

function buildFingerprint(html) {
  const assets = [...html.matchAll(/\/_next\/static\/[A-Za-z0-9._/-]+\.(?:js|css)/g)].map((m) => m[0]);
  const unique = [...new Set(assets)].sort();
  return {
    count: unique.length,
    hash: createHash("sha256").update(unique.join("\n")).digest("hex").slice(0, 12),
  };
}

async function fetchFingerprint(url) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache", pragma: "no-cache" } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return buildFingerprint(await res.text());
}

/**
 * The same, but patient — for a deployment's own `<id>.pages.dev` alias.
 *
 * MEASURED WHILE BUILDING THIS, and it is exactly the moment the precondition is
 * for: a deployment can be listed as Active and its own subdomain still answer
 * 404 while Cloudflare propagates it. Timed on 2026-08-15 against deployment
 * f6148f18 — the alias 404'd for roughly ten minutes after the row went Active,
 * then answered normally. A run started right after a merge lands in that
 * window, so the budget below is two minutes rather than a token retry, and the
 * refusal after it is still correct: until that alias answers, we cannot prove
 * what the apex is serving.
 */
async function fetchFingerprintPatiently(url, attempts = 8, delayMs = 15_000) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchFingerprint(url);
    } catch (error) {
      last = error;
      if (i < attempts - 1) {
        console.log(`  ${c.dim("·")}     waiting for ${url} to come up (${error.message})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw last;
}

async function git(...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: new URL("..", import.meta.url).pathname });
  return stdout.trim();
}

async function newestProductionDeployment() {
  const { stdout } = await execFileAsync(
    "wrangler",
    ["pages", "deployment", "list", "--project-name", PAGES_PROJECT, "--json"],
    { env: { ...process.env, CI: "1" }, maxBuffer: 16 * 1024 * 1024 },
  );
  const rows = JSON.parse(stdout.slice(stdout.indexOf("[")));
  const production = rows.find((r) => r.Environment === "Production");
  if (!production) throw new Error("no Production deployment in the wrangler listing");
  return production;
}

// =============================================================================
// FAULT INJECTION — proving each proof can go red
// =============================================================================
// A checker that cannot fail is worth nothing, and that is the exact failure
// mode this bundle exists to abolish. Every fault below is a REAL breakage of
// the live page (a blocked script, a planted cookie, a swallowed dataLayer
// entry), never a flipped expectation, so the red output it produces is the same
// output a real regression would produce. Run one with --fault <id>.
//
//   block-cookiebot         aborts consent.cookiebot.com — no CMP at all
//   stale-consent           the platform's cookie carries an unknown version
//   restamp-refusal         rewrites ld_consent's `t` after the page settles
//   drop-handover           deletes ld_consent before the hop to the platform
//   swallow-consent-update  drops `consent update` on its way into the dataLayer
//   block-fbevents          aborts connect.facebook.net
//   block-posthog           aborts *.i.posthog.com
//   bot-probe               restores navigator.webdriver, so posthog-js
//                          discards this runner's events as a bot's
//   preset-attribution      plants a rival first touch before the tagged landing
//   restamp-attribution     rewrites ld_attribution's `t` on the consent event

const FAULTS = {
  "block-cookiebot": {
    breaks: "P1 P2 P3 P4 P5",
    route: async (ctx) => ctx.route("**://consent.cookiebot.com/**", (r) => r.abort()),
  },
  "stale-consent": {
    breaks: "P1",
    mapCookies: (cookies) =>
      cookies.map((k) => (k.name === CONSENT_COOKIE ? { ...k, value: k.value.replace("%22v%22%3A1", "%22v%22%3A2") } : k)),
  },
  // BREAKS P2 AND NOT P8, WHICH WAS THE SURPRISE — see `restamp-adoption` below
  // for the measurement. Both proofs assert an unmoved `t`, so this fault was
  // expected to redden both; on the adoption path the site REPAIRS it before
  // this proof looks, so only the un-adopted path stays red.
  "restamp-refusal": {
    breaks: "P2",
    afterSettle: async (page) => {
      await page.evaluate((name) => {
        const raw = document.cookie
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith(`${name}=`))
          ?.slice(name.length + 1);
        if (!raw) return;
        const payload = JSON.parse(decodeURIComponent(raw));
        payload.t = new Date().toISOString();
        const { v, t, p, s, m } = payload;
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify({ v, t, p, s, m }))}; Path=/; SameSite=Lax; Secure; Domain=.letsdog.nl; Max-Age=31536000`;
      }, CONSENT_COOKIE);
    },
  },
  "drop-handover": {
    breaks: "P3",
    beforePlatformHop: async (page) => {
      await page.evaluate(
        (name) => (document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.letsdog.nl`),
        CONSENT_COOKIE,
      );
    },
  },
  "swallow-consent-update": {
    breaks: "P4",
    init: (ctx) =>
      ctx.addInitScript(() => {
        const dl = [];
        const push = Array.prototype.push.bind(dl);
        dl.push = (...args) => {
          const entry = args[0];
          if (entry && entry[0] === "consent" && entry[1] === "update") return dl.length;
          return push(...args);
        };
        window.dataLayer = dl;
      }),
  },
  "block-fbevents": {
    breaks: "P5",
    route: async (ctx) => ctx.route("**://connect.facebook.net/**", (r) => r.abort()),
  },
  "block-posthog": {
    breaks: "P6",
    route: async (ctx) => ctx.route("**i.posthog.com/**", (r) => r.abort()),
  },
  // THE FAULT THAT GUARDS THE GUARD. `openSession` hides `navigator.webdriver`
  // so posthog-js does not classify this runner as a bot and silently discard
  // every event; this fault puts it back, which is the only way to show that the
  // hiding is what makes P6's positive half able to pass at all. Without it the
  // mask is an unexplained line that a later cleanup deletes, and P6 goes red
  // against a working site again — which is exactly what happened for the four
  // days before 2026-08-19.
  "bot-probe": {
    breaks: "the POSITIVE half of P6 (posthog-js discards a bot's events)",
    init: (ctx) =>
      ctx.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, "webdriver", { get: () => true, configurable: true });
      }),
  },
  // THE ONE THAT ATTACKS THE NEGATIVES. Every other fault above breaks something
  // a proof expects to see; this one makes something happen that four proofs
  // expect NOT to see. It grants full consent through the CMP's own API on any
  // page that has not been answered, which is the shape of the failure the whole
  // "both directions" rule exists for: a gate that never turns red.
  "grant-uninvited": {
    breaks: "the NEGATIVE halves of P1 P2 P5 P6",
    afterSettle: async (page) => {
      await page.evaluate(() => {
        if (window.Cookiebot?.hasResponse !== true) window.Cookiebot?.submitCustomConsent(true, true, true);
      });
      await page.waitForTimeout(1500);
    },
  },
  // The same idea aimed at the one negative `grant-uninvited` cannot reach: a
  // statistics refusal that has ALREADY been adopted (hasResponse is true), where
  // the thing that must not happen is PostHog resuming. Unconditional, so it
  // overrides a recorded refusal rather than filling in a missing answer.
  "grant-statistics": {
    breaks: "the NEGATIVE half of P6 (the stop)",
    afterSettle: async (page) => {
      await page.evaluate(() => window.Cookiebot?.submitCustomConsent(true, true, true));
      await page.waitForTimeout(1500);
    },
  },
  // P8'S OWN FAULT, AND THE REASON IT EXISTS IS A MEASUREMENT THAT CAME OUT THE
  // OTHER WAY. `restamp-refusal` above rewrites the same field on the same
  // cookie, so it was expected to redden P8 too. It does not — and the run that
  // showed it is worth keeping, because a fault that quietly fails to fire and a
  // site that quietly repairs itself look identical from the report.
  //
  // Measured 2026-08-17 against build 5999405b3604, three runs:
  //   --only P8 --fault restamp-refusal   → P8 GREEN, `t` back at the planted value
  //   --only P2 --fault restamp-refusal   → P2 RED   (so the fault does fire)
  //   --only P8 --fault restamp-adoption  → P8 RED
  // The only difference between the first and the third is WHEN the rewrite
  // lands: at the settle, or after this proof's own wait. So the site put the
  // original moment back — which is the T-53 restore path (PR #97), running on
  // production, doing exactly what it was built for.
  //
  // THAT CORRECTS THE NOTE IN LOOP T-55, and in the reassuring direction. It
  // predicted this arm could no longer reach the restore code once T-54 stopped
  // Cookiebot deleting `ld_consent` — the ordinary "same choice" gate would keep
  // `t` in place on its own and the restore would never be needed. The pair of
  // runs above shows the restore still fires and still wins. The caveat is worth
  // keeping anyway, because it holds for the UNFAULTED run: a plain green P8
  // proves the outcome, not that the restore is alive. `--fault restamp-refusal`
  // is what proves the second, and it is now the cheapest way to ask.
  "restamp-adoption": {
    breaks: "P8",
    afterAdoption: async (page) => {
      await page.evaluate((name) => {
        const raw = document.cookie
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith(`${name}=`))
          ?.slice(name.length + 1);
        if (!raw) return;
        const payload = JSON.parse(decodeURIComponent(raw));
        payload.t = new Date().toISOString();
        const { v, t, p, s, m } = payload;
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify({ v, t, p, s, m }))}; Path=/; SameSite=Lax; Secure; Domain=.letsdog.nl; Max-Age=31536000`;
      }, CONSENT_COOKIE);
    },
  },
  // THE FAULT FOR THE T-58 HALF OF P7, and it fires later than every other one
  // here because that is where the failure lived: not on the landing, not at the
  // settle, but on the consent event that follows a deletion. It rewrites `t` to
  // now on a record that already exists — the exact shape production had for six
  // days, where a first touch quietly became a last touch.
  //
  // `afterWithdrawal` is invoked by P7 itself, the way P3 invokes
  // `beforePlatformHop`: a hook that has to sit inside a proof's own sequence
  // cannot be driven from openSession.
  "restamp-attribution": {
    breaks: "the T-58 half of P7",
    afterWithdrawal: async (page) => {
      await page.evaluate((name) => {
        const raw = document.cookie
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith(`${name}=`))
          ?.slice(name.length + 1);
        if (!raw) return;
        const payload = JSON.parse(decodeURIComponent(raw));
        payload.t = new Date().toISOString();
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; SameSite=Lax; Secure; Domain=.letsdog.nl; Max-Age=7776000`;
      }, ATTRIBUTION_COOKIE);
    },
  },
  "preset-attribution": {
    breaks: "P7",
    mapCookies: (cookies) => [
      ...cookies,
      {
        name: ATTRIBUTION_COOKIE,
        value: encodeURIComponent(
          JSON.stringify({ v: 1, t: isoNow(-60 * 60 * 1000), utm_source: "planted-rival", utm_campaign: "not-ours" }),
        ),
        domain: ".letsdog.nl",
        path: "/",
        secure: true,
        sameSite: "Lax",
      },
    ],
  },
};

// =============================================================================
// BROWSER PLUMBING
// =============================================================================

const expect = {
  eq: (want) => ({ describe: show(want), test: (got) => got === want }),
  not: (want) => ({ describe: `anything but ${show(want)}`, test: (got) => got !== want }),
  absent: { describe: "absent", test: (got) => got === null || got === undefined || got === false },
  present: { describe: "present", test: (got) => got !== null && got !== undefined && got !== false },
  atLeast: (n) => ({ describe: `at least ${n}`, test: (got) => typeof got === "number" && got >= n }),
  exactly: (n) => ({ describe: `exactly ${n}`, test: (got) => got === n }),
  json: (want) => ({ describe: JSON.stringify(want), test: (got) => JSON.stringify(got) === JSON.stringify(want) }),
  matches: (re) => ({ describe: `matching ${re}`, test: (got) => typeof got === "string" && re.test(got) }),
  // ISO 8601 with Z sorts lexicographically, which both contracts already rely
  // on for newest-wins — so a string compare is the comparison, not a shortcut.
  atOrAfter: (iso) => ({
    describe: `an ISO moment at or after ${iso}`,
    test: (got) => typeof got === "string" && got >= iso,
  }),
};

/**
 * One proof's browser session: its own context, its own cookie jar, its own
 * request log. Nothing is reused between proofs — a leftover CookieConsent from
 * the previous proof would silently answer the banner for the next one, which is
 * the same class of mistake as measuring a stale build.
 */
async function openSession(run, { cookies = [], url = `${SITE_ORIGIN}/` } = {}) {
  const context = await run.browser.newContext(run.userAgent ? { userAgent: run.userAgent } : {});
  const fault = run.fault;

  // NAVIGATOR.WEBDRIVER IS HIDDEN, AND WITHOUT THIS LINE P6 CANNOT GO GREEN NO
  // MATTER WHAT THE SITE DOES. This is not a softened assertion — it is the
  // opposite, and the distinction is the whole comment.
  //
  // posthog-js drops every captured event when it thinks it is talking to a bot,
  // and it decides that with `!!navigator.webdriver` (plus a UA blocklist that
  // contains "headlesschrome"). Playwright sets `navigator.webdriver` on every
  // context it creates and cannot be told not to, so EVERY probe this runner has
  // ever fired was classified as a bot and had its events discarded inside the
  // SDK — before any request was made, with no error and no console line. The
  // drop is silent by construction:
  //
  //     var l = !this.config.opt_out_useragent_filter && this._is_bot();
  //     if (!l || this.config.__preview_capture_bot_pageviews) { …send… }
  //
  // MEASURED 2026-08-19 on production build 8cb1e07debc8, two sessions differing
  // in this one property and nothing else, with the SDK's own state read out of a
  // patched bundle:
  //   webdriver visible → _is_bot() true  → 0 requests to the ingestion host
  //   webdriver hidden  → _is_bot() false → POST eu.i.posthog.com/e/
  // Every other gate was already open in both (capture_pageview true, consent
  // isOptedIn true, is_capturing true, visibilityState visible).
  //
  // WHAT THIS COST US, and it is the reason to state it here rather than in a
  // commit message: the bot filter made BOTH halves of P6 unfalsifiable at once.
  // The positive half stayed red against a working site — which is how T-62 came
  // to be diagnosed twice — and the negative half ("statistics refused · any
  // request to i.posthog.com" = 0) stayed green by construction, because a probe
  // whose events are discarded sends zero whether the stop works or not. An
  // assertion that cannot discriminate is worse than a missing one; its title
  // promises exactly what it does not deliver.
  //
  // THE PRICE OF THE FIX IS REAL AND ALREADY MITIGATED. The bot filter was
  // incidentally keeping this runner's traffic out of the product data; hiding
  // webdriver means our synthetic sessions now land in PostHog looking like
  // visitors. That is what the run window printed at the end of every run is for
  // (T-61) — exclude it in any query over app='website'.
  //
  // Overridable by a fault on purpose: `bot-probe` puts webdriver back, which is
  // what proves this line is load-bearing rather than decorative.
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false, configurable: true });
  });

  if (fault?.route) await fault.route(context);
  if (fault?.init) await fault.init(context);

  const initialCookies = fault?.mapCookies ? fault.mapCookies(cookies) : cookies;
  if (initialCookies.length) await context.addCookies(initialCookies);

  // TWO LOGS, AND THE DIFFERENCE BETWEEN THEM IS LOAD-BEARING — found by turning
  // this runner's own faults on it. A request that an extension, a route rule or
  // a blocked host aborts still fires Chrome's `request` event, so counting
  // requests answers "did the page TRY", never "did it succeed". That is the
  // right question for a NEGATIVE (a pixel that tries and is blocked by someone
  // else's ad blocker has still been asked for by us, and the gate has still
  // failed) and the wrong one for a POSITIVE: --fault block-posthog left the
  // capture assertion green because the aborted request was counted. Positives
  // therefore assert on RESPONSES, negatives on REQUESTS.
  const requests = [];
  const responses = [];
  context.on("request", (r) => requests.push({ url: r.url(), method: r.method(), at: Date.now() }));
  context.on("response", (r) => responses.push({ url: r.url(), status: r.status(), at: Date.now() }));

  const page = await context.newPage();
  const session = {
    context,
    page,
    requests,
    responses,
    fingerprints: [],
    settledAt: 0,
    async goto(target) {
      const response = await page.goto(target, { waitUntil: "load", timeout: 30_000 });
      if (target.startsWith(SITE_ORIGIN)) {
        this.fingerprints.push({ url: target, ...buildFingerprint(await response.text()) });
      }
      return response;
    },
    /**
     * Wait until the CMP has actually finished arriving, then hold still for the
     * downstream chain. "Usable" is submitCustomConsent being a function, not
     * window.Cookiebot merely existing — uc.js publishes the object in an earlier
     * phase than the one that builds its API, and reading the half-built object
     * is precisely how the second fix died quietly.
     */
    async settle() {
      await page.waitForFunction(
        () => typeof window.Cookiebot?.submitCustomConsent === "function",
        undefined,
        { timeout: CMP_TIMEOUT_MS },
      );
      await page
        .waitForFunction(
          () => window.Cookiebot?.hasResponse === true || !!document.getElementById("CybotCookiebotDialog"),
          undefined,
          { timeout: CMP_TIMEOUT_MS },
        )
        .catch(() => {});
      this.settledAt = Date.now();
      if (fault?.afterSettle) await fault.afterSettle(page);
    },
    /** The clock a must-not-happen claim is only worth anything behind. */
    async observeNegative() {
      await page.waitForTimeout(NEGATIVE_WINDOW_MS);
    },
    raw(name) {
      return page.evaluate((n) => {
        for (const part of document.cookie.split(";")) {
          const s = part.trim();
          const i = s.indexOf("=");
          if (i !== -1 && s.slice(0, i) === n) return s.slice(i + 1);
        }
        return null;
      }, name);
    },
    async cookieNames() {
      return (await context.cookies()).map((k) => k.name);
    },
    async cookieOn(name) {
      return (await context.cookies()).find((k) => k.name === name) ?? null;
    },
    /**
     * How many cookies carry this name — the SECOND failure form for a handover
     * record, and one `raw()` cannot see.
     *
     * `document.cookie` never reveals a Domain, so two copies (one host-only,
     * one on `.letsdog.nl`) read as one string there and the writer that meant
     * to correct the record has silently created a rival instead. Both contracts
     * carry a duplicate-repair rule for exactly this; asking the browser's own
     * jar is the only way to count them.
     */
    async cookieCount(name) {
      return (await context.cookies()).filter((k) => k.name === name).length;
    },
    cmp() {
      return page.evaluate(() => {
        const cb = window.Cookiebot;
        const dialog = document.getElementById("CybotCookiebotDialog");
        return {
          hasResponse: cb ? cb.hasResponse === true : null,
          consent: cb?.consent
            ? { p: !!cb.consent.preferences, s: !!cb.consent.statistics, m: !!cb.consent.marketing }
            : null,
          method: cb?.consent?.method ?? null,
          bannerVisible: !!dialog && !!(dialog.offsetWidth || dialog.offsetHeight),
          fbq: typeof window.fbq,
          consentUpdates: (window.dataLayer || [])
            .map((a) => Array.from(a))
            .filter((a) => a[0] === "consent" && a[1] === "update")
            .map((a) => a[2]),
          consentDefaults: (window.dataLayer || [])
            .map((a) => Array.from(a))
            .filter((a) => a[0] === "consent" && a[1] === "default")
            .map((a) => a[2]),
        };
      });
    },
    /** Attempted — the right count for "this must never be asked for". */
    hits(pattern) {
      return requests.filter((r) => pattern.test(r.url));
    },
    /** Answered — the right count for "this must actually have loaded". */
    loaded(pattern) {
      return responses.filter((r) => pattern.test(r.url) && r.status < 400);
    },
    /** ms between the CMP settling and the first matching response, or null. */
    latency(pattern) {
      const first = responses.find((r) => pattern.test(r.url));
      return first && this.settledAt ? first.at - this.settledAt : null;
    },
    close() {
      return context.close();
    },
  };

  await session.goto(url);
  await session.settle();
  return session;
}

const FBEVENTS = /connect\.facebook\.net\/.*fbevents\.js/;

// TWO POSTHOG HOSTS, AND CONFUSING THEM IS THE WHOLE TRAP. posthog-js fetches
// its remote config and extension bundles from eu-ASSETS.i.posthog.com and sends
// captured events to eu.i.posthog.com. Only the second one is measurement. A
// check written against "any request to posthog" is green on a site that
// initialises the SDK perfectly and transmits nothing — which is exactly the
// state this proof found on production (see docs/verify-live.md).
const POSTHOG_ANY = /https:\/\/[a-z0-9-]*\.?i\.posthog\.com\//;
const POSTHOG_ASSETS = /https:\/\/[a-z0-9-]*assets\.i\.posthog\.com\//;
const POSTHOG_INGEST = (url) => POSTHOG_ANY.test(url) && !POSTHOG_ASSETS.test(url);

async function clickBanner(session, selector) {
  await session.page.waitForSelector(selector, { state: "visible", timeout: CMP_TIMEOUT_MS });
  await session.page.click(selector);
  await session.page.waitForFunction(() => window.Cookiebot?.hasResponse === true, undefined, {
    timeout: CMP_TIMEOUT_MS,
  });
  session.settledAt = Date.now();
}

// =============================================================================
// THE PROOFS
// =============================================================================
// Each one measures BOTH DIRECTIONS. That is the standing rule from the
// cross-host contract, and it is not symmetry for its own sake: a gate measured
// only in the direction it is meant to allow has not been measured. You have
// proven the light turns green, not that it turns red — and every consent bug
// this site has had was a light that failed to turn red.

const PROOFS = [];
const proof = (id, title, run) => PROOFS.push({ id, title, run });

// -----------------------------------------------------------------------------
proof("P1", "return leg — a consent recorded on the platform is adopted here", async (run, r) => {
  // GRANTED on the platform. The cookie is written exactly as the platform's
  // packages/core/src/consent.ts writes it, on the shared parent domain, with no
  // Cookiebot answer of our own: that is the visitor who answered on
  // mijn.letsdog.nl (the normal path for ad traffic since platform D-103) and
  // then opened letsdog.nl.
  const granted = await openSession(run, { cookies: [platformConsentCookie({ p: true, s: true, m: true })] });
  try {
    await granted.page.waitForFunction(() => window.Cookiebot?.hasResponse === true, undefined, { timeout: CMP_TIMEOUT_MS }).catch(() => {});
    await granted.page.waitForTimeout(1500);
    const cmp = await granted.cmp();
    const cookies = await granted.cookieNames();
    const why =
      "the platform's Cookie preferences screen promises 'Je keuze geldt op letsdog.nl en in de app' — " +
      "ConsentSync + consentCookieSupersedes are what make that sentence true (D-4)";

    r.check("Cookiebot.hasResponse", cmp.hasResponse, expect.eq(true), why);
    r.check("Cookiebot.consent p/s/m", cmp.consent, expect.json({ p: true, s: true, m: true }), why);
    r.check("banner on screen", cmp.bannerVisible, expect.eq(false), `${why} — a visitor who already chose must not be asked again`);
    r.check(
      "dataLayer consent update · analytics_storage",
      cmp.consentUpdates.at(-1)?.analytics_storage ?? null,
      expect.eq("granted"),
      "Consent Mode is what actually lets GA4 measure; a <script> tag on the page proves nothing",
    );
    r.check(
      "dataLayer consent update · ad_storage",
      cmp.consentUpdates.at(-1)?.ad_storage ?? null,
      expect.eq("granted"),
      why,
    );
    r.check("_ga cookie", cookies.includes(GA_COOKIE), expect.eq(true), "granted analytics_storage is what lets gtag.js write _ga");
    r.check("_fbp cookie", cookies.includes("_fbp"), expect.eq(true), "D-4 is what makes the Meta LOAD gate reachable without a local answer");
  } finally {
    await granted.close();
  }

  // AND THE OTHER DIRECTION: no cookie at all is not a consent. Same page, same
  // browser, nothing recorded anywhere — everything above must be absent.
  const unasked = await openSession(run, { cookies: [] });
  try {
    await unasked.observeNegative();
    const cmp = await unasked.cmp();
    const cookies = await unasked.cookieNames();
    const why = "'no CMP answer here' is not 'the visitor consented' — reporting one for the other invents a choice nobody made";
    r.check("no cookie · hasResponse", cmp.hasResponse, expect.eq(false), why);
    r.check("no cookie · banner on screen", cmp.bannerVisible, expect.eq(true), why);
    r.check("no cookie · consent updates", cmp.consentUpdates.length, expect.exactly(0), why);
    r.check("no cookie · _ga cookie", cookies.includes(GA_COOKIE), expect.eq(false), why);
    r.check("no cookie · fbevents.js requests", unasked.hits(FBEVENTS).length, expect.exactly(0), why);
  } finally {
    await unasked.close();
  }
});

// -----------------------------------------------------------------------------
proof("P2", "the D-4 clamp — a refusal recorded on the platform is NOT adopted", async (run, r) => {
  // An all-false cookie is indistinguishable from this site's own withdrawal:
  // Cookiebot's withdraw() clears hasResponse, so "took it all back" and "never
  // asked here" are the same observable state, and recordConsentWithdrawal has
  // just written an all-false cookie stamped NOW. Adopting it would feed this
  // site's own withdrawal back into its own banner.
  const stamp = isoNow(-10 * 60 * 1000);
  const planted = serializeConsent({ v: 1, t: stamp, p: false, s: false, m: false });
  const refused = await openSession(run, { cookies: [platformConsentCookie({ p: false, s: false, m: false, t: stamp })] });
  try {
    await refused.observeNegative();
    const cmp = await refused.cmp();
    const raw = await refused.raw(CONSENT_COOKIE);
    const why =
      "D-4: where Cookiebot holds no answer, only a cookie that ALLOWS something may be adopted. " +
      "The accepted price is that someone who refused everything on the platform is asked once more here";

    r.check("hasResponse", cmp.hasResponse, expect.eq(false), why);
    r.check("banner on screen", cmp.bannerVisible, expect.eq(true), why);
    r.check(
      "ld_consent left byte-identical",
      raw,
      expect.eq(planted),
      "the clamp must not restamp the record it declined to adopt — a moved `t` makes the platform " +
        "append a consent row for a choice nobody made",
    );
    r.check("`t` unchanged", parseJsonCookie(raw)?.t ?? null, expect.eq(stamp), why);
  } finally {
    await refused.close();
  }

  // THE OTHER SIDE OF THE SAME LINE. allowsAnyCategory is the whole predicate, so
  // a cookie that grants exactly one category must be adopted — otherwise the
  // clamp is not a clamp, it is a wall, and the return leg does not exist.
  const partial = await openSession(run, { cookies: [platformConsentCookie({ p: false, s: false, m: true })] });
  try {
    await partial.page.waitForFunction(() => window.Cookiebot?.hasResponse === true, undefined, { timeout: CMP_TIMEOUT_MS }).catch(() => {});
    await partial.page.waitForTimeout(1500);
    const cmp = await partial.cmp();
    const why = "allowsAnyCategory: a withdrawal is all-false BY DEFINITION, so a cookie allowing one category provably did not come from one";
    r.check("marketing-only · hasResponse", cmp.hasResponse, expect.eq(true), why);
    r.check("marketing-only · consent p/s/m", cmp.consent, expect.json({ p: false, s: false, m: true }), why);
    r.check("marketing-only · banner on screen", cmp.bannerVisible, expect.eq(false), why);
  } finally {
    await partial.close();
  }
});

// -----------------------------------------------------------------------------
proof("P3", "outbound leg — a choice made here lands intact on the platform", async (run, r) => {
  // The real dialog, the real button. Cookiebot renders its dialog in ordinary
  // DOM here (no shadow root), so the proof clicks what a visitor clicks rather
  // than calling submitCustomConsent behind the CMP's back.
  const accepted = await openSession(run);
  try {
    await clickBanner(accepted, BUTTON_ALLOW_ALL);
    await accepted.page.waitForTimeout(1500);

    const raw = await accepted.raw(CONSENT_COOKIE);
    const parsed = parseJsonCookie(raw);
    const cookie = await accepted.cookieOn(CONSENT_COOKIE);
    const contractWhy =
      "the platform's reader must agree byte for byte — one character off and it reads 'everything refused', " +
      "silently, which looks exactly like working code";

    r.check("ld_consent written", raw, expect.present, contractWhy);
    r.check("payload p/s/m", parsed && { p: parsed.p, s: parsed.s, m: parsed.m }, expect.json({ p: true, s: true, m: true }), contractWhy);
    r.check("contract version", parsed?.v ?? null, expect.eq(1), contractWhy);
    r.check("`t` is an ISO instant with Z", parsed?.t ?? null, expect.matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/), contractWhy);
    r.check(
      "wire bytes are the contract's key order",
      raw,
      expect.eq(parsed ? serializeConsent(parsed) : null),
      `${contractWhy} — keys are v,t,p,s,m, URL-encoded JSON`,
    );
    r.check("Domain", cookie?.domain ?? null, expect.eq(".letsdog.nl"), "host-only would never reach mijn.letsdog.nl — that is the entire reason this cookie exists");

    if (run.fault?.beforePlatformHop) await run.fault.beforePlatformHop(accepted.page);

    // THE HOP. Same browser, same jar, real platform host.
    await accepted.page.goto(PLATFORM_CHECKOUT, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await accepted.page.waitForTimeout(2500);
    const onPlatform = await accepted.raw(CONSENT_COOKIE);
    const platformState = await accepted.page.evaluate(() => ({
      cookiebot: !!window.Cookiebot,
      dialog: !!document.getElementById("CybotCookiebotDialog"),
      body: document.body.innerText.slice(0, 200),
    }));

    r.check("readable on mijn.letsdog.nl", onPlatform, expect.eq(raw), contractWhy);
    r.check("no second consent prompt at the checkout", platformState.dialog || platformState.cookiebot, expect.eq(false), "asking again on the platform would make the handover pointless and the promise false");
    r.check("checkout rendered (chars of body text)", platformState.body.length, expect.atLeast(20), "an empty or errored checkout makes the cookie read above meaningless");
  } finally {
    await accepted.close();
  }

  // AND THE REFUSAL TRAVELS TOO — the direction that matters most. A "Deny" here
  // must arrive on the platform AS a refusal, not as an absence: the platform
  // reads absence as 'everything refused' anyway, so an all-false record is the
  // only thing that proves the leg carried the answer rather than losing it.
  const denied = await openSession(run);
  try {
    await clickBanner(denied, BUTTON_DENY);
    await denied.page.waitForTimeout(1500);
    const parsed = parseJsonCookie(await denied.raw(CONSENT_COOKIE));
    const why = "a refusal that does not travel leaves the platform measuring on a consent that was taken back";
    r.check("deny · payload p/s/m", parsed && { p: parsed.p, s: parsed.s, m: parsed.m }, expect.json({ p: false, s: false, m: false }), why);

    await denied.page.goto(PLATFORM_CHECKOUT, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await denied.page.waitForTimeout(2000);
    const onPlatform = parseJsonCookie(await denied.raw(CONSENT_COOKIE));
    r.check("deny · read as a refusal on the platform", onPlatform && { p: onPlatform.p, s: onPlatform.s, m: onPlatform.m }, expect.json({ p: false, s: false, m: false }), why);
  } finally {
    await denied.close();
  }
});

// -----------------------------------------------------------------------------
proof("P4", "GA4 — the consent update reaches the dataLayer, not just the page", async (run, r) => {
  const session = await openSession(run);
  try {
    const beforeClick = await session.cmp();
    r.check(
      "default state is denied before any answer",
      beforeClick.consentDefaults.at(0)?.analytics_storage ?? null,
      expect.eq("denied"),
      "consent-default.tsx is the half Cookiebot does NOT send; without it Google tags run at full permission until the visitor answers",
    );
    r.check("no update before an answer", beforeClick.consentUpdates.length, expect.exactly(0), "a granted signal before the answer is the ePrivacy Art. 5(3) problem D-93 fixed");

    await clickBanner(session, BUTTON_ALLOW_ALL);
    await session.page.waitForTimeout(1500);
    const after = await session.cmp();
    const update = after.consentUpdates.at(-1) ?? {};
    const why = "measured at the dataLayer object because a <script> present in the HTML proves delivery, not that anything called it";

    r.check("consent update pushed", after.consentUpdates.length, expect.atLeast(1), why);
    for (const signal of ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"]) {
      r.check(`update · ${signal}`, update[signal] ?? null, expect.eq("granted"), why);
    }
    r.check("_ga cookie now exists", (await session.cookieNames()).includes(GA_COOKIE), expect.eq(true), "the cookie is the observable consequence of the granted signal");
  } finally {
    await session.close();
  }

  // THE RED DIRECTION: Deny must leave analytics_storage denied and _ga absent.
  const denied = await openSession(run);
  try {
    await clickBanner(denied, BUTTON_DENY);
    await denied.observeNegative();
    const cmp = await denied.cmp();
    const update = cmp.consentUpdates.at(-1) ?? {};
    const why = "a refusal that does not reach Consent Mode is a banner that decorates rather than governs";
    r.check("deny · analytics_storage", update.analytics_storage ?? "denied", expect.eq("denied"), why);
    r.check("deny · ad_storage", update.ad_storage ?? "denied", expect.eq("denied"), why);
    r.check("deny · _ga cookie", (await denied.cookieNames()).includes(GA_COOKIE), expect.eq(false), why);
  } finally {
    await denied.close();
  }
});

// -----------------------------------------------------------------------------
proof("P5", "Meta — fbevents.js only on marketing consent, revoked on withdrawal", async (run, r) => {
  // NO CONSENT: the request must not be made at all. Not blocked, not tagged —
  // never issued. Cookiebot's auto-blocker demonstrably does not catch this
  // pixel (measured 2026-08-08: _fbp survived an explicit refusal), which is why
  // meta-pixel.tsx owns the lifecycle itself.
  const refused = await openSession(run);
  try {
    await clickBanner(refused, BUTTON_DENY);
    await refused.observeNegative();
    const why = "no consent, no measurement (D-93) — and 'not requested' is stricter than 'requested and ignored', deliberately";
    r.check("no consent · fbevents.js requests", refused.hits(FBEVENTS).length, expect.exactly(0), why);
    r.check("no consent · window.fbq", (await refused.cmp()).fbq, expect.eq("undefined"), why);
    r.check("no consent · _fbp cookie", (await refused.cookieNames()).includes("_fbp"), expect.eq(false), why);
  } finally {
    await refused.close();
  }

  // MARKETING GRANTED: it loads, once, and writes _fbp.
  const granted = await openSession(run);
  try {
    await clickBanner(granted, BUTTON_ALLOW_ALL);
    await granted.page.waitForTimeout(2500);
    const latency = granted.latency(FBEVENTS);
    if (latency !== null) r.note(`fbevents.js answered ${latency} ms after the consent was recorded`);
    r.check("marketing · fbevents.js requested", granted.hits(FBEVENTS).length, expect.atLeast(1), "the load gate is the consent gate");
    r.check("marketing · fbevents.js actually loaded", granted.loaded(FBEVENTS).length, expect.atLeast(1), "a request that never gets an answer is a pixel that is not there — assert on the response, not the attempt");
    r.check("marketing · window.fbq", (await granted.cmp()).fbq, expect.eq("function"), "an fbq that never becomes a function means trackEvent's Meta sink is silently dead");
    r.check("marketing · _fbp cookie", (await granted.cookieNames()).includes("_fbp"), expect.eq(true), "the cookie is the observable consequence of a loaded pixel");

    // WITHDRAWAL, through Cookiebot's own withdraw(). A loaded fbevents.js cannot
    // be unloaded, so the two things that CAN be done must both happen: Meta's
    // own revoke signal, and the cookies deleted.
    await granted.page.evaluate(() => {
      window.__verifyLiveFbqCalls = [];
      const inner = window.fbq;
      const wrapper = function (...args) {
        window.__verifyLiveFbqCalls.push(args);
        return inner.apply(this, args);
      };
      Object.assign(wrapper, inner);
      window.fbq = wrapper;
    });
    await granted.page.evaluate(() => window.Cookiebot.withdraw());
    await granted.page.waitForTimeout(2500);

    const calls = await granted.page.evaluate(() => window.__verifyLiveFbqCalls ?? []);
    const names = await granted.cookieNames();
    const why = "a withdrawal that leaves _fbp standing is the exact failure D-93 was raised for";
    r.check(
      "withdrawal · fbq('consent','revoke') called",
      calls.some((a) => a[0] === "consent" && a[1] === "revoke"),
      expect.eq(true),
      "Meta's own documented stop signal — events fired while revoked are held, not sent",
    );
    for (const name of META_COOKIES) {
      r.check(`withdrawal · ${name} cleared`, names.includes(name), expect.eq(false), why);
    }
  } finally {
    await granted.close();
  }
});

// -----------------------------------------------------------------------------
proof("P6", "PostHog — runs without an answer, STOPS on an explicit refusal of statistics", async (run, r) => {
  // HALF ONE: legitimate interest means we may measure while the visitor has not
  // answered. This is the half that has always worked.
  const unanswered = await openSession(run);
  let deviceId = null;
  try {
    await unanswered.observeNegative();
    const assets = unanswered.responses.filter((h) => POSTHOG_ASSETS.test(h.url) && h.status < 400);
    const ingest = unanswered.responses.filter((h) => POSTHOG_INGEST(h.url) && h.status < 400);
    r.note(
      `${assets.length} request(s) to the assets host (remote config, extensions) · ` +
        `${ingest.length} to the ingestion host (captured events)`,
    );
    r.check(
      "no answer · captured events reaching eu.i.posthog.com",
      ingest.length,
      expect.atLeast(1),
      "D-93 part C: legitimate interest buys exactly one thing — measuring while nobody has answered. " +
        "Requests to the ASSETS host only prove the SDK initialised; a site that inits, writes its cookie, " +
        "registers its super-properties and transmits nothing measures nothing, and does it without an error",
    );

    // $DEVICE_ID, NOT THE IDENTIFY SHAPE. T-46 is about to stop this site
    // identifying on the e-mail address; $device_id from the shared cookie is
    // what the platform actually consumes and stays true either way. An
    // assertion written against get_distinct_id() being an e-mail would be wrong
    // within the week.
    const cookies = await unanswered.context.cookies();
    const phCookie = cookies.find((k) => POSTHOG_COOKIE_PATTERN.test(k.name)) ?? null;
    deviceId = parseJsonCookie(phCookie?.value)?.$device_id ?? null;
    if (deviceId) r.note(`$device_id ${deviceId}`);
    r.check("ph_<token>_posthog cookie", phCookie?.name ?? null, expect.matches(POSTHOG_COOKIE_PATTERN), "the shared cookie is the join, not the SDK's in-memory state");
    r.check("cookie Domain", phCookie?.domain ?? null, expect.eq(".letsdog.nl"), "host-only would hand the platform nothing to read");
    r.check("$device_id present", deviceId, expect.matches(/^[0-9a-f-]{20,}$/), "no device id means no continuity to carry anywhere");

    // Continuity across a navigation on this host…
    await unanswered.goto(`${SITE_ORIGIN}/prijzen/`);
    await unanswered.page.waitForTimeout(1500);
    const afterNav = parseJsonCookie(
      (await unanswered.context.cookies()).find((k) => POSTHOG_COOKIE_PATTERN.test(k.name))?.value,
    )?.$device_id ?? null;
    r.check("$device_id survives a navigation", afterNav, expect.eq(deviceId), "a device id that rotates per page is not an identity");

    // …and, the part that matters, on the platform host.
    await unanswered.page.goto(`${PLATFORM_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await unanswered.page.waitForTimeout(2000);
    const onPlatform = parseJsonCookie(
      (await unanswered.context.cookies()).find((k) => POSTHOG_COOKIE_PATTERN.test(k.name))?.value,
    )?.$device_id ?? null;
    r.check(
      "$device_id readable on mijn.letsdog.nl",
      onPlatform,
      expect.eq(deviceId),
      "cross_subdomain_cookie is what puts the id where the platform can read it — the SDKs never talk to each other",
    );
  } finally {
    await unanswered.close();
  }

  // HALF TWO: the stop. This is the half that did not exist until 2026-08-12 and
  // is what makes the published cookie declaration ("Zeg je nee tegen statistiek,
  // dan stopt hij meteen") true rather than a sentence.
  const refused = await openSession(run, { cookies: [platformConsentCookie({ p: false, s: false, m: true })] });
  try {
    await refused.observeNegative();
    const why =
      "legitimate interest is TWO halves. Without the stop the real posture is 'always measure' and the " +
      "grounds are a fiction — and the cookie declaration says otherwise in as many words";
    r.check(
      "statistics refused · any request to i.posthog.com",
      refused.hits(POSTHOG_ANY).length,
      expect.exactly(0),
      `${why}. Counted across BOTH hosts here on purpose: a stopped PostHog must not even fetch its own config`,
    );
    r.check(
      "statistics refused · ph_<token>_posthog cookie",
      (await refused.cookieNames()).some((n) => POSTHOG_COOKIE_PATTERN.test(n)),
      expect.eq(false),
      "Cookiebot deletes the cookie for a refused category; if it survives, something re-created it after the refusal",
    );
  } finally {
    await refused.close();
  }
});

// -----------------------------------------------------------------------------
proof("P7", "ld_attribution — FIRST touch survives a return AND a mid-page deletion", async (run, r) => {
  // FIRST WINS HERE, THE EXACT INVERSE OF ld_consent. Copying the neighbouring
  // newest-wins rule would hand every conversion to whatever the visitor clicked
  // last — the silent kind of wrong: the columns fill up, the numbers look
  // healthy, the credit is on the wrong campaign. So this proof's real work is
  // the two RETURNS, not the landing.
  const landing = `${SITE_ORIGIN}/?utm_source=verify-live&utm_medium=proof&utm_campaign=t45-u3&gclid=verifylive.gclid`;
  const session = await openSession(run, { url: landing });
  try {
    const before = await session.raw(ATTRIBUTION_COOKIE);
    r.check(
      "nothing stored before the answer",
      before,
      expect.absent,
      "reading a URL needs no consent, keeping the values does — the params are held in memory until the banner is answered",
    );

    await clickBanner(session, BUTTON_ALLOW_ALL);
    await session.page.waitForTimeout(1500);
    const firstTouch = await session.raw(ATTRIBUTION_COOKIE);
    const parsed = parseJsonCookie(firstTouch);
    const cookie = await session.cookieOn(ATTRIBUTION_COOKIE);
    const why = "the seven names are byte-identical to the platform's ATTRIBUTION_URL_PARAMS and land in its profiles columns";

    r.check("first touch recorded", parsed?.utm_source ?? null, expect.eq("verify-live"), why);
    r.check("campaign", parsed?.utm_campaign ?? null, expect.eq("t45-u3"), why);
    r.check("gclid (statistics-gated)", parsed?.gclid ?? null, expect.eq("verifylive.gclid"), "utm + gclid ride on STATISTICS, fbclid on MARKETING — two gates, never one boolean");
    r.check("Domain", cookie?.domain ?? null, expect.eq(".letsdog.nl"), why);

    // RETURN 1 — untagged. The first touch must simply still be there.
    await session.goto(`${SITE_ORIGIN}/prijzen/`);
    await session.page.waitForTimeout(2000);
    r.check(
      "untagged return leaves it byte-identical",
      await session.raw(ATTRIBUTION_COOKIE),
      expect.eq(firstTouch),
      "a later direct visit is not new information, it is the same person coming back",
    );

    // RETURN 2 — tagged with a DIFFERENT campaign. This is the negative that
    // catches someone reaching for lib/consent.ts as the worked example.
    await session.goto(`${SITE_ORIGIN}/?utm_source=second-touch&utm_campaign=should-not-win`);
    await session.page.waitForTimeout(2000);
    const afterSecond = await session.raw(ATTRIBUTION_COOKIE);
    r.check(
      "a SECOND tagged touch does not win",
      afterSecond,
      expect.eq(firstTouch),
      "FIRST touch wins on ld_attribution — the inverse of ld_consent's newest-wins, and the record is taken whole, never merged field by field",
    );
    r.check(
      "no field of the second touch leaked in",
      parseJsonCookie(afterSecond)?.utm_source ?? null,
      expect.not("second-touch"),
      "merging would blend two campaigns into one record that never happened",
    );
  } finally {
    await session.close();
  }

  // ---------------------------------------------------------------------------
  // THE SAME RULE ON THE ROUTE THAT ACTUALLY BROKE IT (loop T-58).
  // ---------------------------------------------------------------------------
  // The two returns above are the newest-wins trap, and they were green through
  // all six days this was broken — because nothing above ever LOOKED at `t`.
  // That is the finding, not the fix: a first-touch rule measured only by "which
  // campaign is in the record" cannot see a first touch that has become a last
  // touch, and the platform builds Meta's fbc from this very field as the click
  // moment.
  //
  // The route is one page view, no navigation: land tagged, allow everything,
  // then withdraw statistics. `ld_attribution` is a Statistics cookie at the CMP
  // since T-57, so Cookiebot deletes it here — correctly — and our recorder runs
  // on that same event, finds an empty jar, and captures the landing parameters
  // again from a URL that still carries them.
  //
  // THE _ga CHECK IS NOT DECORATION, IT IS THE POSITIVE CONTROL. Deleted-and-
  // recaptured and merely-narrowed end in the same shape ({t, fbclid}); only `t`
  // tells them apart. So if Cookiebot's deletion routine did not run at all this
  // run, an unchanged `t` is green for entirely the wrong reason. `_ga` is a
  // known-Statistics cookie in the same sweep: it going away is the evidence the
  // routine ran. A run where `_ga` survives has measured nothing here, which is
  // why it is asserted rather than noted.
  const withdrawal = await openSession(run, {
    url: `${SITE_ORIGIN}/?utm_source=verify-live&utm_campaign=t55-p7b&gclid=verifylive.gclid&fbclid=verifylive.fbclid`,
  });
  try {
    await clickBanner(withdrawal, BUTTON_ALLOW_ALL);
    await withdrawal.page.waitForTimeout(2000);
    const firstTouch = parseJsonCookie(await withdrawal.raw(ATTRIBUTION_COOKIE));
    r.check(
      "T-58 · tagged landing recorded, with a moment",
      firstTouch?.t ?? null,
      expect.matches(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/),
      "everything below compares against this value, so a run that never stored one has proved nothing",
    );

    // Cookiebot's own API, driving a real category change — the state a visitor
    // reaches through "Wijzig je toestemming". Marketing stays open on purpose:
    // it is what keeps a record alive for `t` to be compared on at all.
    await withdrawal.page.evaluate(() => window.Cookiebot?.submitCustomConsent(false, false, true));
    await withdrawal.page.waitForTimeout(2500);
    if (run.fault?.afterWithdrawal) await run.fault.afterWithdrawal(withdrawal.page);

    const afterWithdrawal = parseJsonCookie(await withdrawal.raw(ATTRIBUTION_COOKIE));
    const cookies = await withdrawal.cookieNames();

    r.check(
      "T-58 · the CMP's deletion sweep really ran",
      cookies.includes(GA_COOKIE),
      expect.eq(false),
      "_ga is a known Statistics cookie: if it survives a statistics withdrawal the sweep did not run, " +
        "and every 'unchanged' below is unchanged for the wrong reason",
    );
    r.check(
      "T-58 · `t` survives delete-then-recapture",
      afterWithdrawal?.t ?? null,
      expect.eq(firstTouch?.t ?? null),
      "a gate that closes later NARROWS the stored record, it does not restamp it — the platform reads " +
        "this field as the click moment when it builds Meta's fbc, so a moved `t` is a wrong click moment",
    );
    r.check(
      "T-58 · the withdrawn gate really closed",
      afterWithdrawal?.utm_source ?? null,
      expect.absent,
      "keeping the moment must not become keeping the record: utm + gclid ride on STATISTICS and have to go",
    );
    r.check(
      "T-58 · the gate still open kept its field",
      afterWithdrawal?.fbclid ?? null,
      expect.eq("verifylive.fbclid"),
      "two gates, never one boolean — a visitor who keeps marketing keeps their click id",
    );
    r.check(
      "T-58 · exactly one ld_attribution",
      await withdrawal.cookieCount(ATTRIBUTION_COOKIE),
      expect.exactly(1),
      "a re-capture that writes on a different Domain than the record it replaced leaves two rivals, " +
        "and document.cookie shows a writer only one of them (contract rule 6)",
    );
  } finally {
    await withdrawal.close();
  }
});

// -----------------------------------------------------------------------------
proof("P8", "ld_consent — adopting the platform's choice does not move its moment", async (run, r) => {
  // THE ARM THAT WAS MISSING WHILE T-53 RAN FOR MONTHS. Seven proofs measured
  // this chain and all seven asked whether the CHOICE arrives; none compared a
  // timestamp. So a return leg that adopted the platform's choice correctly and
  // restamped it to `now` on the way was green every single time — while the
  // platform, reading newest-wins, saw a fresh answer appear out of nowhere on
  // every page view of ours.
  //
  // THE PLANTED `t` IS AN HOUR OLD, AND WITHOUT THAT THIS ARM IS WORTHLESS.
  // Stamped with `new Date()`, the bug and the correct behaviour differ by
  // milliseconds and a broken site reads as green — which is precisely how this
  // stayed invisible in both repos. An hour cannot be mistaken for jitter.
  //
  // WHAT IT STILL GUARDS AFTER T-54, AND WHAT IT NO LONGER GUARDS — read this
  // before treating a green here as "the restore works". Since `ld_consent` was
  // registered with Cookiebot as a necessary cookie (T-54), the CMP no longer
  // deletes it, so `writeConsentCookie` finds the record intact, its ordinary
  // "same choice, nothing to write" gate stops the write, and `t` stays put
  // WITHOUT the restore path being reached at all. This arm therefore still
  // guards the OUTCOME the contract names (no restamp on adoption) and no longer
  // guards the restore code itself. That is the right trade — the contract is
  // what the platform depends on — but it means a green line here is not
  // evidence that the restore lives. The restore has its own unit test, which
  // goes red without it; that is where that code is watched.
  const plantedAt = isoNow(-60 * 60 * 1000);
  const planted = serializeConsent({ v: 1, t: plantedAt, p: true, s: true, m: true });
  const adopted = await openSession(run, {
    cookies: [platformConsentCookie({ p: true, s: true, m: true, t: plantedAt })],
  });
  try {
    await adopted.page.waitForFunction(() => window.Cookiebot?.hasResponse === true, undefined, { timeout: CMP_TIMEOUT_MS }).catch(() => {});
    await adopted.page.waitForTimeout(2500);
    if (run.fault?.afterAdoption) await run.fault.afterAdoption(adopted.page);
    const cmp = await adopted.cmp();
    const raw = await adopted.raw(CONSENT_COOKIE);

    // THE POSITIVE CONTROL FIRST. "`t` did not move" is trivially true on a page
    // where the adoption never happened — a blocked CMP, a cookie nobody read.
    // These two lines are what make the comparison below mean anything.
    r.check(
      "the adoption really happened",
      cmp.hasResponse,
      expect.eq(true),
      "an unchanged `t` on a page that never adopted the choice measures nothing at all",
    );
    r.check(
      "adopted the whole choice",
      cmp.consent,
      expect.json({ p: true, s: true, m: true }),
      "D-4: a cookie allowing at least one category is adopted where Cookiebot holds no answer",
    );

    r.check(
      "`t` is still the platform's, an hour old",
      parseJsonCookie(raw)?.t ?? null,
      expect.eq(plantedAt),
      "newest-wins is what the platform reads: a `t` we moved to now makes our own adoption look like a " +
        "newer choice than the one the visitor actually made, and it wins against it",
    );
    r.check(
      "the record is byte-identical",
      raw,
      expect.eq(planted),
      "a timestamp-only difference is never a change — a rewritten envelope is churn the platform must ignore",
    );
    r.check(
      "exactly one ld_consent",
      await adopted.cookieCount(CONSENT_COOKIE),
      expect.exactly(1),
      "the other way this fails: a restore that writes without the shared Domain leaves a host-only rival " +
        "that document.cookie cannot tell apart from the real record (contract rule 6)",
    );
  } finally {
    await adopted.close();
  }

  // AND THE OTHER DIRECTION — because a writer that never stamps is not fixed,
  // it is frozen. A real choice made HERE must carry a fresh moment, or the
  // platform can never learn that the visitor changed their mind.
  const chosen = await openSession(run, { cookies: [] });
  try {
    const before = isoNow();
    await clickBanner(chosen, BUTTON_ALLOW_ALL);
    await chosen.page.waitForTimeout(2000);
    const written = parseJsonCookie(await chosen.raw(CONSENT_COOKIE));
    const why = "newest-wins cuts both ways: a genuine new answer has to be newer, or the platform keeps the stale one";

    r.check("a choice made here is recorded", written?.s ?? null, expect.eq(true), why);
    r.check(
      "and stamped with a moment from THIS session",
      written?.t ?? null,
      expect.atOrAfter(before),
      why,
    );
  } finally {
    await chosen.close();
  }
});

// =============================================================================
// RUNNER
// =============================================================================

function parseArgs(argv) {
  const args = { only: null, commit: null, build: null, skipProvenance: false, fault: null, headed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--only") args.only = argv[++i].split(",").map((s) => s.trim().toUpperCase());
    else if (a === "--commit") args.commit = argv[++i];
    else if (a === "--build") args.build = argv[++i];
    else if (a === "--fault") args.fault = argv[++i];
    else if (a === "--skip-provenance") args.skipProvenance = true;
    else if (a === "--headed") args.headed = true;
    else {
      console.error(`unknown option ${a} — try --help`);
      process.exit(2);
    }
  }
  return args;
}

const HELP = `
npm run verify:live -- [options]

Measures the consent and attribution chain AT THE OBJECTS on the deployed site.
Needs the real hosts (letsdog.nl + mijn.letsdog.nl), a real Cookiebot, a real
Chrome, and \`wrangler\` logged in. Every proof gets a clean cookie state.

  --only P1,P5            run a subset (the rest are reported as NOT RUN)
  --commit <sha>          the commit the live site is expected to be built from
                          (default: origin/main)
  --build <fingerprint>   pin the served build fingerprint as well
  --skip-provenance       run without wrangler; the report then says on every
                          line that the build was never identified
  --fault <id>            inject a real breakage, to prove a proof can go red
  --headed                watch it happen

Faults: ${Object.keys(FAULTS).join(", ")}
`;

/**
 * Print the run window and append it to RUN_LOG — see that constant for why.
 *
 * Printing matters as much as the file: the file is local to this machine, and
 * whoever queries PostHog in a month may not be sitting at it. The printed
 * block is what the ship checklist tells you to paste into the session LOG
 * entry, which is where it becomes shared knowledge instead of a local artefact.
 *
 * A failure to write is reported and never thrown: this runs after every proof
 * has already been measured, and losing a bookkeeping line must not turn a
 * green run red or a red run into a crash.
 */
function recordRunWindow({ startedAt, endedAt, build, commit, fault, only, verdict }) {
  const scope = only ? only.join("+") : "all";
  const line =
    `${startedAt}\t${endedAt}\tbuild=${build ?? "unknown"}\tcommit=${commit}` +
    `\tproofs=${scope}\tfault=${fault ?? "none"}\t${verdict}`;

  console.log(c.bold("\n  THIS RUN WROTE INTO PRODUCTION — record the window (T-61)"));
  console.log(`  from  ${startedAt}`);
  console.log(`  to    ${endedAt}`);
  console.log(
    c.dim("  A PostHog query over app='website' must EXCLUDE this range, the way it excludes bots:"),
  );
  console.log(
    c.dim("  every run leaves sessions carrying a $pageleave with no $pageview, because deleting"),
  );
  console.log(
    c.dim("  ph_<token>_posthog on a statistics refusal is P6's assertion. Paste this window into"),
  );
  console.log(c.dim("  the session LOG entry — this log file is local to this machine."));

  try {
    appendFileSync(RUN_LOG, `${line}\n`);
    console.log(c.dim(`  appended to ${RUN_LOG}`));
  } catch (error) {
    console.log(c.yellow(`  could not append to ${RUN_LOG} — ${error.message}`));
    console.log(c.yellow("  the printed window above is the record; nothing else was affected"));
  }
  console.log("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  if (args.fault && !FAULTS[args.fault]) {
    console.error(`unknown fault ${args.fault} — one of: ${Object.keys(FAULTS).join(", ")}`);
    return 2;
  }

  console.log(c.bold("\nverify:live — the consent chain, measured at the objects on production"));
  console.log(`  site        ${SITE_ORIGIN}`);
  console.log(`  platform    ${PLATFORM_ORIGIN}`);
  console.log(`  browser     system Chrome via playwright-core`);
  const startedAt = new Date().toISOString();
  console.log(`  started     ${startedAt}`);
  if (args.fault) {
    console.log(
      c.yellow(`  FAULT       ${args.fault} — expected to turn ${FAULTS[args.fault].breaks} red. ` +
        `A green run under a fault is itself a failure.`),
    );
  }

  // ---- precondition -------------------------------------------------------
  console.log(c.bold("\nPRECONDITION — which build am I measuring?"));
  let liveFingerprint = null;
  let provenance = "NOT VERIFIED";
  let preconditionFailed = false;

  const fail = (line, why) => {
    preconditionFailed = true;
    console.log(`  ${c.red("FAIL")}  ${line}`);
    console.log(`        ${c.yellow("why")} ${why}`);
  };
  const ok = (label, value) => console.log(`  ${c.green(" ok ")}  ${label.padEnd(16)} ${value}`);

  try {
    const live = await fetchFingerprint(`${SITE_ORIGIN}/`);
    liveFingerprint = live.hash;
    ok("served build", `${live.hash} (${live.count} static assets)`);
  } catch (error) {
    fail(`could not fetch ${SITE_ORIGIN}/ — ${error.message}`, "nothing below can be measured against a site that will not answer");
  }

  if (args.skipProvenance) {
    console.log(
      `  ${c.yellow("SKIP")}  provenance       ${c.yellow("--skip-provenance: the commit behind this build was never identified")}`,
    );
  } else if (liveFingerprint) {
    // THREE SEPARATE FAILURES, THREE SEPARATE MESSAGES. Rolling them into one
    // catch is how this block first shipped, and the first real deploy it met
    // reported "needs wrangler logged in" for a deployment alias that was merely
    // still propagating. A precondition whose job is naming the broken link may
    // not misname it.
    let deployment;
    let deployed;
    let expectedCommit;
    try {
      deployment = await newestProductionDeployment();
      expectedCommit = args.commit ?? (await git("rev-parse", "--short", "origin/main"));
    } catch (error) {
      fail(
        `build provenance could not be established — ${error.message}`,
        "needs `wrangler` logged in (pages:read) and a git checkout with an origin/main. Pass " +
          "--skip-provenance to run anyway; the report will then say on every line that the build " +
          "was never identified",
      );
    }

    if (deployment) {
      try {
        deployed = await fetchFingerprintPatiently(`${deployment.Deployment}/`);
      } catch (error) {
        fail(
          `the newest Production deployment (${deployment.Id.slice(0, 8)}, commit ${deployment.Source}, ` +
            `${deployment.Status}) is not serving its own alias yet — ${error.message}`,
          "Cloudflare has not finished building or propagating it, so the apex is still on the PREVIOUS " +
            "build. Measuring now would test the wrong code and call it green. Wait a minute and re-run",
        );
      }
    }

    if (deployment && deployed) {
      if (deployed.hash !== liveFingerprint) {
        fail(
          `the apex is NOT serving deployment ${deployment.Id.slice(0, 8)} ` +
            `(apex ${liveFingerprint}, deployment ${deployed.hash})`,
          "wrangler names the newest Production deployment, but only equal fingerprints prove the apex actually " +
            "serves it — a build still running, or one that failed, looks exactly like this",
        );
      } else if (!deployment.Source.startsWith(expectedCommit) && !expectedCommit.startsWith(deployment.Source)) {
        fail(
          `live build is commit ${deployment.Source}, expected ${expectedCommit}`,
          "you are about to measure a different build than the one you think you are shipping — the likeliest " +
            "cause is that Cloudflare has not finished building yet",
        );
      } else {
        provenance = `${deployment.Source} (${deployment.Status})`;
        ok("deployment", `${deployment.Id.slice(0, 8)} · Production · ${deployment.Status}`);
        ok("commit", `${deployment.Source} — matches ${args.commit ? "--commit" : "origin/main"}`);
        ok("apex serves it", `identical fingerprint on ${deployment.Deployment}`);
      }
    }
  }

  if (args.build && liveFingerprint && args.build !== liveFingerprint) {
    fail(`served build ${liveFingerprint}, --build pinned ${args.build}`, "the pin is what stops a run from silently measuring yesterday's bundle");
  }

  if (preconditionFailed) {
    console.log(c.red("\nPRECONDITION FAILED — no proof was run.\n"));
    return 1;
  }

  // ---- proofs -------------------------------------------------------------
  const report = new Report();
  const browser = await chromium.launch({ channel: "chrome", headless: !args.headed });
  // THE HEADLESS MARKER COMES OUT OF THE USER AGENT — the second half of the
  // bot problem documented at length in `openSession`. Chrome's headless mode
  // ships a UA containing "HeadlessChrome", and "headlesschrome" is a literal
  // entry in posthog-js's blocked-user-agent list, so the UA alone is enough to
  // have every event discarded even once `navigator.webdriver` is hidden.
  //
  // Derived from the real UA rather than hard-coded: pinning a version string
  // here would drift from the browser actually driving the run, and a stale UA
  // is its own quiet lie about what was measured. Only the marker is removed —
  // the version, platform and engine stay exactly as this Chrome reports them.
  const defaultUserAgent = await (async () => {
    const probe = await browser.newContext();
    try {
      const page = await probe.newPage();
      return await page.evaluate(() => navigator.userAgent);
    } finally {
      await probe.close();
    }
  })();
  const userAgent = defaultUserAgent.replace(/HeadlessChrome/g, "Chrome");
  const run = { browser, userAgent, fault: args.fault ? FAULTS[args.fault] : null };

  try {
    // The consent chain has to be PRESENT on this build before any proof can
    // mean anything — a bundle without a constructed Cookiebot API cannot be
    // measured, and reporting green for it would be the marker-not-called
    // failure all over again.
    report.begin("P0", "the chain under test is present on this build");
    try {
      const session = await openSession(run);
      try {
        const cmp = await session.cmp();
        const usable = await session.page.evaluate(() => typeof window.Cookiebot?.submitCustomConsent === "function");
        report.check("Cookiebot API constructed", usable, expect.eq(true), "window.Cookiebot existing is not the same as its API being built — uc.js publishes the object at byte 61890 and submitCustomConsent only at 105795");
        report.check("consent default already pushed", cmp.consentDefaults.length, expect.atLeast(1), "consent-default.tsx runs during head parsing; if it did not, there is no denied state for Consent Mode to start from");
        report.check("page build matches the precondition", session.fingerprints.at(0)?.hash ?? null, expect.eq(liveFingerprint), "the browser must be running the build the precondition identified, not something out of a cache");
      } finally {
        await session.close();
      }
    } catch (error) {
      report.notRun(error.message);
    }
    report.end();

    for (const p of PROOFS) {
      report.begin(p.id, p.title);
      if (args.only && !args.only.includes(p.id)) {
        report.notRun(`not selected by --only ${args.only.join(",")}`, false);
        continue;
      }
      try {
        await p.run(run, report);
        report.end();
      } catch (error) {
        report.notRun(`${error.name}: ${error.message.split("\n")[0]}`);
      }
    }
  } finally {
    await browser.close();
  }

  // ---- verdict ------------------------------------------------------------
  const failed = report.proofs.filter((p) => p.status === "FAIL");
  const notRun = report.proofs.filter((p) => p.status === "NOT RUN");
  const passed = report.proofs.filter((p) => p.status === "PASS");

  console.log(c.bold("\nVERDICT"));
  for (const p of report.proofs) {
    const tag =
      p.status === "PASS" ? c.green("PASS   ") : p.status === "FAIL" ? c.red("FAIL   ") : c.red("NOT RUN");
    console.log(`  ${tag} ${p.id}  ${p.title}${p.reason ? c.dim(` — ${p.reason}`) : ""}`);
  }
  console.log(
    `\n  ${passed.length} passed · ${failed.length} failed · ${notRun.length} not run` +
      `   ${c.dim(`build ${liveFingerprint} · commit ${provenance}`)}`,
  );
  if (args.skipProvenance) {
    console.log(c.yellow("  the build behind these results was never identified (--skip-provenance)"));
  }
  if (args.fault) {
    console.log(c.yellow(`  fault ${args.fault} was injected — ${FAULTS[args.fault].breaks} were expected to be red`));
  }

  recordRunWindow({
    startedAt,
    endedAt: new Date().toISOString(),
    build: liveFingerprint,
    commit: provenance,
    fault: args.fault,
    only: args.only,
    verdict: `${passed.length} passed / ${failed.length} failed / ${notRun.length} not run`,
  });

  return failed.length === 0 && notRun.length === 0 ? 0 : 1;
}

process.exit(await main());
