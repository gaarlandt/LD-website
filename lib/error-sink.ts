// The BROWSER half of the error sink (T-44, executing loop decision D-6).
//
// -----------------------------------------------------------------------------
// THERE IS NO SDK HERE, AND THAT IS A CHANGE OF PLAN WITH A MEASUREMENT BEHIND IT
// -----------------------------------------------------------------------------
// T-44 said to use the browser side of `@sentry/nextjs` or plain
// `@sentry/browser`. `@sentry/nextjs` was never a candidate: it is a build-time
// wrapper first and an SDK second — `withSentryConfig`, an `instrumentation.ts`,
// server and edge runtimes to instrument, source-map upload, a tunnel route —
// and this site is `output: "export"`, so all of that is either inert or a new
// moving piece in a build that must stay a plain `next build`.
//
// `@sentry/browser` WAS built, shipped and then measured, and the measurement is
// why it is gone (`npm run build`, 2026-08-15, @sentry/browser 10.70.0):
//
//   - it added a 438 KB / 144 KB-gzipped async chunk — by a wide margin the
//     largest artifact in the export — for four fixed report sites;
//   - `sideEffects: false` did not save it. The package's only entry point is the
//     barrel, and Turbopack does not tree-shake a barrel behind a dynamic
//     `import()`, so `defaultIntegrations: false` removed the RUNTIME cost and
//     none of the bytes;
//   - and the bytes are the wrong bytes. Grepping the chunk found `rrweb`,
//     `sentryReplaySession`, `MutationObserver` and the canvas recorder: the
//     session-replay engine. `content/cookieverklaring.md` §6 says "We nemen geen
//     schermopnames van wat je doet." Never initialising rrweb keeps that true,
//     but shipping it to the visitor's browser to sit unused is not a thing to do
//     quietly on a site that publishes that sentence.
//
// So the browser posts the envelope itself, through the SAME
// `buildSentryEvent` / `buildSentryEnvelope` the Cloudflare Function uses. That
// is the better shape here for a reason beyond bytes: the two runtimes now share
// one wire format and ONE redaction, pinned by one set of tests, instead of a
// hand-rolled payload on one side and an SDK's on the other.
//
// WHAT IS GIVEN UP, STATED RATHER THAN HIDDEN. No transport retry, no
// `Retry-After` / rate-limit backoff, no offline queue, and no stack traces. The
// first three are bounded by `MAX_BROWSER_REPORTS_PER_PAGE` and by the fact that
// every report here is already latched at its call site. The last one is not a
// loss: these are contract-rule breaches, not exceptions — there is no throw to
// trace, and the diagnosis is the rule id plus what was measured, which is
// exactly the platform's own lesson (`a-tidy-failure-path-erases-the-cause-it-
// was-built-to-report.md`).
//
// THE REQUEST IS SHAPED LIKE THE OFFICIAL SDK'S, deliberately, and the details
// were read off `@sentry/browser`'s own `transports/fetch.js` rather than
// guessed:
//   - NO `Content-Type` header. The envelope endpoint answers a simple CORS
//     request; adding `application/x-sentry-envelope` would make it a preflight.
//     The SDK omits it in the browser for the same reason (and the Function,
//     which has no CORS to satisfy, does send it).
//   - `keepalive: true`, so a report fired just before a navigation is not
//     cancelled. Safe here: keepalive is capped at 64 KB of in-flight body and
//     these envelopes are ~1 KB.
//   - `referrerPolicy: "strict-origin"`, so the full URL of the page the visitor
//     was on does not travel in a Referer header.
//
// -----------------------------------------------------------------------------
// UNGATED, AND DELIBERATELY IGNORANT OF CONSENT
// -----------------------------------------------------------------------------
// Per D-6 this does not sit behind the consent layer — a contract breach can
// happen precisely to someone who refused everything, and a gated sink goes
// quiet at the moment it has the most to say. So this module imports NOTHING
// from `lib/consent.ts`, subscribes to nothing, and waits on no consent event.
// The counterpart of that freedom is the redaction in `lib/error-report.ts`:
// read the hard limit at the top of that file before adding a measurement here.
//
// AND NOTHING IS CAPTURED AUTOMATICALLY. D-6 considered and rejected reporting
// all unhandled browser errors. With no SDK that is not a setting to get right
// but a fact about the file: there is no `window.onerror` handler, no
// `unhandledrejection` listener, and no console patching anywhere in it. The
// only way an event exists is a call to `reportRuleBreach`.
//
// NO DSN IS THE NORMAL STATE. `NEXT_PUBLIC_SENTRY_DSN` lives only in the
// Cloudflare Pages dashboard, and `NEXT_PUBLIC_*` is inlined AT BUILD TIME, so
// on localhost, in the unit tests, and on any deploy made before the variable is
// set, this whole module is a silent no-op. That is a requirement, not a
// tolerance: the sink is reached only from failure paths, so a reporter that
// threw when unconfigured would turn a logged problem into a broken page.

import { isProdHost } from "./prod-hosts";
import {
  buildSentryEnvelope,
  buildSentryEvent,
  newEventId,
  parseSentryDsn,
  ruleLevel,
  type Measurements,
  type ReportLevel,
  type ReportRule,
} from "./error-report";

/**
 * A ceiling on reports per page load.
 *
 * Every call site already has a latch of its own, so this is not the primary
 * defence — it is the one that does not depend on the next call site
 * remembering. A repair that runs on every CTA click, or a consent event
 * arriving in a loop, must not turn an error sink into a firehose against a
 * monthly volume quota that is shared with the platform.
 */
export const MAX_BROWSER_REPORTS_PER_PAGE = 10;

let sent = 0;

/** The DSN as the build inlined it, or undefined. */
function sentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * `production` on the two real hostnames, `preview` everywhere else — the same
 * classification GA4 and PostHog already use (`lib/prod-hosts.ts`), so a report
 * and the analytics around it agree about which deploy they came from.
 *
 * Note this is the ANALYTICS classification, which counts
 * `website-letsdog.pages.dev` as preview. `functions/api/contact.ts` takes the
 * opposite stance for its own reports, matching the Turnstile posture it
 * enforces there; `lib/prod-hosts.ts` explains why both are right for their own
 * question.
 */
function environment(): "production" | "preview" {
  // `window.location` is read through an optional chain rather than assumed. It
  // always exists in a browser, but this function is called from inside a
  // failure path and an error sink may not depend on the shape of anything it
  // has not checked — a TypeError here would replace a reported problem with an
  // unreported one. An unreadable hostname is not production, which is the safe
  // direction: a preview-tagged production report is findable, a
  // production-tagged preview report pollutes the stream you triage.
  const hostname = window.location?.hostname;
  return typeof hostname === "string" && isProdHost(hostname) ? "production" : "preview";
}

/**
 * Report a broken rule. Fire-and-forget, never throws, never awaited.
 *
 * There is no free-text parameter, on purpose: the message comes from the rule
 * id and the measurements go through the allowlist, so a call site cannot
 * narrate a visitor's consent choice into an issue title or an extra field. See
 * the hard limit at the top of `lib/error-report.ts`.
 */
export function reportRuleBreach(
  rule: ReportRule,
  measured: Measurements = {},
  level: ReportLevel = ruleLevel(rule),
): void {
  try {
    if (typeof window === "undefined" || typeof fetch !== "function") return;
    const dsn = parseSentryDsn(sentryDsn());
    if (!dsn) return;
    if (sent >= MAX_BROWSER_REPORTS_PER_PAGE) return;
    sent += 1;

    const event = buildSentryEvent({
      rule,
      runtime: "browser",
      environment: environment(),
      eventId: newEventId(),
      timestampMs: Date.now(),
      level,
      measured,
    });

    void fetch(dsn.envelopeUrl, {
      method: "POST",
      body: buildSentryEnvelope(event, dsn, new Date().toISOString()),
      keepalive: true,
      referrerPolicy: "strict-origin",
    }).then(
      () => undefined,
      // Swallowed at the source rather than with a trailing `.catch`, so the
      // promise can never reject: an unhandled rejection here is an error the
      // sink itself caused, reported by nobody.
      () => undefined,
    );
  } catch {
    // An error sink that throws while reporting an error is worse than no sink.
    // Every caller is already on a failure path, none of them can afford a second
    // exception, and all of them have written to the console first.
  }
}

/** Test seam: forget the per-page ceiling. Not used in production code. */
export function resetErrorSinkForTests(): void {
  sent = 0;
}
