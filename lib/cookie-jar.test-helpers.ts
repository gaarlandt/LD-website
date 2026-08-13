// The cookie-jar stubs both handover cookies' tests need, in one place.
//
// WHY SHARED AND NOT COPIED, which is the same argument `lib/consent.ts` makes
// about the code under test. Contract rule 6 — more than one cookie of this name
// → delete the host-only copy, re-read, continue — now applies to `ld_consent`
// as well as `ld_attribution`, and it can only be tested against a jar that
// models the two browser behaviours the rule stands on. A jar that cannot tell
// the two copies apart turns GREEN on an implementation that does nothing, which
// is the failure mode the rule itself is about: no error, no throw, just the
// wrong copy winning. Two hand-written copies of this model is one copy that can
// quietly get more forgiving than a browser, in the file whose test then proves
// nothing.
//
// NOT A `*.test.ts` FILE ON PURPOSE: Vitest would collect it and fail on a suite
// with no tests. It carries its own suffix instead, excluded from the root
// tsconfig (which `next build` typechecks) and included in `tsconfig.test.json`
// alongside the tests — the same split that keeps a `vitest` import out of the
// production build.

import { vi } from "vitest";

/**
 * The one browser behaviour a jar HAS to reproduce for the size limit to be
 * testable at all: an assignment whose `name=value` runs past ~4096 bytes is
 * DROPPED, silently. No throw, no return value, no cookie afterwards. A stub
 * that stores everything it is handed makes both the broken and the fixed writer
 * look identical, and green then only proves the rig cannot see the bug.
 *
 * The number is written out here rather than imported from a module under test
 * on purpose. This is a statement about what browsers do, and it has to stay
 * true independently — importing `ATTRIBUTION_MAX_COOKIE_BYTES` would mean
 * raising that constant to 100 000 keeps every test green while production
 * writes cookies that vanish.
 */
export const BROWSER_COOKIE_BYTE_LIMIT = 4096;

/** One cookie as a browser holds it: a name, a value, and the Domain it was written with. */
export type JarEntry = { name: string; value: string; domain: string | null };

/**
 * A jar that can hold MORE THAN ONE cookie of the same name, and that knows the
 * one thing which tells them apart.
 *
 * The simpler stubs in the test files cannot express contract rule 6. A
 * Map-backed jar keys on the name, so it cannot hold two copies at all; a raw
 * string jar holds any string but cannot be written to. Both would turn green on
 * an implementation that does nothing.
 *
 * So this models the two browser behaviours the rule stands on, and no more:
 *
 *   - WHAT YOU READ NEVER REVEALS A DOMAIN. The getter renders name and value
 *     only, in specificity order — the host-only copy FIRST, per RFC 6265 §5.4.
 *     That ordering is the hijack: the planted copy is the one a reader meets.
 *   - WHAT YOU WRITE DECIDES WHICH COPY YOU TOUCH. An assignment without a
 *     `Domain` attribute reaches the host-only copy and nothing else, so
 *     `Max-Age=0` without a Domain deletes exactly the `domain === null` entry.
 *     Add a Domain and the same assignment hits the shared record instead —
 *     which is the accident that would destroy a real record, and is measured in
 *     its own test rather than left as a warning in prose.
 *
 * The silent over-size drop is modelled too, so a test can move between this jar
 * and a simpler one without the browser quietly getting more forgiving.
 */
export function stubDomainCookieJar(initial: JarEntry[] = []) {
  let entries: JarEntry[] = initial.map((entry) => ({ ...entry }));
  const writes: string[] = [];

  vi.stubGlobal("document", {
    get cookie() {
      // Stable sort, so copies within one group keep the order they were planted
      // in and a test can decide which of two shared copies comes first.
      return [...entries]
        .sort((a, b) => Number(a.domain !== null) - Number(b.domain !== null))
        .map((entry) => `${entry.name}=${entry.value}`)
        .join("; ");
    },
    set cookie(raw: string) {
      writes.push(raw);
      const [pair, ...attributes] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) return;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const domain =
        attributes
          .map((attribute) => /^\s*domain=(.+)$/i.exec(attribute)?.[1].trim())
          .find((found) => found !== undefined) ?? null;
      const matches = (entry: JarEntry) => entry.name === name && entry.domain === domain;

      const maxAge = attributes.find((attribute) => /^\s*max-age=/i.test(attribute));
      if (maxAge && Number(maxAge.split("=")[1]) === 0) {
        entries = entries.filter((entry) => !matches(entry));
        return;
      }
      if (new TextEncoder().encode(pair).length > BROWSER_COOKIE_BYTE_LIMIT) return;

      const existing = entries.find(matches);
      if (existing) existing.value = value;
      else entries.push({ name, value, domain });
    },
  });

  return { writes, entries: () => entries };
}

/**
 * Both console levels at once, silenced and captured. Rule 6 splits its report
 * across the two — error when a duplicate survives the wipe, warning when it
 * does not — so a test that watches only one of them cannot tell "reported at
 * the wrong level" from "reported correctly".
 */
export function stubConsoleReports() {
  return {
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
  };
}
