// The loader for the SHARED contract vectors, which live in the cross-knowledge
// hub and are run by BOTH repos.
//
// WHY THE VECTORS ARE NOT IN THIS REPO. `ld_consent` and `ld_attribution` each
// have an implementation on both sides of `.letsdog.nl`, and twice in one week
// the two were each internally consistent, each fully tested, and disagreed
// about the same bytes. T-37: this repo TRUNCATED an oversized `t` where the
// platform REFUSED the record — 233 tests, a mutation test, a typecheck, a build
// and a Cloudflare deploy were all green on the wrong verb, and it was caught
// only because a human happened to read the other repo. T-39: the same field on
// the other cookie needed the opposite verb again. A test suite cannot notice
// that class of bug from inside one repo, however thorough it is; the two sides
// have to be measured against ONE artefact that neither of them owns. That
// artefact is `<hub>/fixtures/*.vectors.json` — data, not code, so neither
// repo's module system, TypeScript version or bundler stands between a reader
// and the bytes.
//
// WHY DATA AND NOT A SHARED PACKAGE. A package would have to be published,
// versioned and installed, which means the two sides can sit on different
// versions of it and go green apart — the failure again, one level up. A JSON
// file read off disk at test time cannot be stale on one side and fresh on the
// other.
//
// THREE PROPERTIES OF THIS LOADER, AND THEY ARE HALF THE POINT:
//
//   1. The hub is FOUND, not assumed to be at a fixed relative depth. This file
//      runs both from a normal checkout and from `.claude/worktrees/<task>/`,
//      which is three directories deeper; a hardcoded `../../` resolves in one
//      and misses in the other, and "misses" is the dangerous half.
//   2. A hub that is not there is a HARD FAILURE, never a skip. That is the
//      whole reason this file exists: 307 green tests agreed with a broken site
//      for two deploys, and a fixture loader that silently finds nothing
//      reproduces that exact failure at a new altitude. The honest cost is
//      stated rather than hidden — a checkout without the hub cannot run the
//      full suite. The alternative is a test that passes by not running.
//   3. The FILE ITSELF is validated, strictly and with unknown keys refused. A
//      typo in a key name is otherwise indistinguishable from an assertion that
//      was never made — `expect.rewriteFts` would be silently ignored and the
//      vector would pass while pinning nothing.
//
// NOT A `*.test.ts` FILE ON PURPOSE: Vitest would collect it and fail on a suite
// with no tests. It carries the `*.test-helpers.ts` suffix instead, which is
// excluded from the root tsconfig (the one `next build` typechecks) and included
// in tsconfig.test.json — the same split that keeps a `vitest` import out of the
// production build.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The hub directory's name on disk. Spaces and all — it is the real folder. */
const HUB_DIRECTORY_NAME = "LD - project cross knowledge";

/** Where the vectors sit inside the hub. */
const FIXTURES_SUBDIRECTORY = "fixtures";

/**
 * The hub's `fixtures/` directory, found by walking UP from this file.
 *
 * The search is upward and by NAME because the two repos sit as siblings under
 * `~/Documents/Coding/ldcoding/` while this file's depth below that point varies:
 * `LDwebsite/website-redesign/lib` in a normal checkout,
 * `LDwebsite/website-redesign/.claude/worktrees/<task>/lib` in a subagent's
 * worktree. Every ancestor is asked whether it has a `LD - project cross
 * knowledge/fixtures` child, and the first one that does wins.
 *
 * `LD_HUB` overrides it, the same variable name the loop's `scripts/loop/check.sh`
 * already uses so there is one thing to set rather than two. An override that
 * does not resolve is an ERROR and not a fallback to the search: someone who
 * sets it has said where the hub is, and quietly looking somewhere else is how a
 * suite ends up measuring a copy nobody is editing.
 */
export function findHubFixtures(): string {
  const override = process.env.LD_HUB;
  if (override !== undefined && override !== "") {
    const overridden = resolve(override, FIXTURES_SUBDIRECTORY);
    if (existsSync(overridden)) return overridden;
    throw new Error(
      `LD_HUB is set to "${override}" but "${overridden}" does not exist.\n` +
        `LD_HUB must point at the root of the cross-knowledge hub (the directory ` +
        `containing "${FIXTURES_SUBDIRECTORY}/"), not at the fixtures directory itself.`,
    );
  }

  const searched: string[] = [];
  let directory = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(directory, HUB_DIRECTORY_NAME, FIXTURES_SUBDIRECTORY);
    searched.push(candidate);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  throw new Error(
    `The shared contract fixtures were not found, so the cross-repo contract is UNTESTED.\n\n` +
      `This is deliberately a failure and not a skip. The vectors under ` +
      `"${HUB_DIRECTORY_NAME}/${FIXTURES_SUBDIRECTORY}/" are the only thing that measures this ` +
      `repo's cookie parsers against the platform's, and a suite that goes green without them is ` +
      `exactly the false assurance they exist to abolish (T-37, T-39).\n\n` +
      `Fix it by cloning the hub next to this repo's werkmap:\n` +
      `  git clone git@github.com:gaarlandt/ld-project-cross-knowledge.git ` +
      `"~/Documents/Coding/ldcoding/${HUB_DIRECTORY_NAME}"\n` +
      `or by pointing LD_HUB at an existing checkout:\n` +
      `  LD_HUB="/path/to/${HUB_DIRECTORY_NAME}" npm test\n\n` +
      `Searched, in order:\n${searched.map((path) => `  ${path}`).join("\n")}`,
  );
}

/** One vector: the bytes, the verdict, and why the verdict is what it is. */
export type Vector<Expectation> = {
  /** Stable identifier; also the test name on both sides. */
  name: string;
  /**
   * The cookie VALUE exactly as it arrives on the wire — or `null` for NO COOKIE
   * OF THIS NAME AT ALL.
   *
   * `null` is a distinct state from `""`, and conflating the two is the whole
   * reason it exists (added 2026-08-17 with the `silent` verdict). `""` is a
   * cookie that is PRESENT with an empty value — somebody wrote it — while
   * `null` means nobody did. Under the consent contract those fall on opposite
   * sides of the legitimate-interest question: an empty value is a refusal, an
   * absent cookie is silence.
   *
   * Without this, `silent` could never be asserted as `true` on any vector: a
   * vector is bytes, "no cookie" has none, and a field that is constant across
   * every vector discriminates nothing.
   */
  raw: string | null;
  /** The contract rule or the task this vector pins. What makes a failure legible. */
  why: string;
  /** The EFFECTIVE verdict both repos must reach. */
  expect: Expectation;
};

export type VectorFile<Expectation> = {
  /** The cookie these vectors describe, e.g. `ld_consent`. */
  cookie: string;
  /** Path to the governing contract, relative to the hub root. */
  contract: string;
  /** `newest wins` or `first touch wins` — the two are opposites and get copied wrongly. */
  conflictRule: string;
  /** What the verdict MEANS, in prose, so an adapter author cannot guess at it. */
  verdict: string;
  vectors: Vector<Expectation>[];
};

const FILE_KEYS = ["cookie", "contract", "conflictRule", "verdict", "vectors"] as const;
const VECTOR_KEYS = ["name", "raw", "why", "expect"] as const;

function refuseUnknownKeys(where: string, value: Record<string, unknown>, allowed: readonly string[]) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(
      `${where} carries key(s) [${unknown.join(", ")}] this loader does not know. ` +
        `Unknown keys are refused rather than ignored: a typo in an assertion's name is otherwise ` +
        `indistinguishable from an assertion nobody made, and the vector would pass while pinning nothing.`,
    );
  }
  const missing = allowed.filter((key) => !(key in value));
  if (missing.length > 0) throw new Error(`${where} is missing key(s) [${missing.join(", ")}]`);
}

/**
 * Read and validate one vector file. Throws on anything unexpected.
 *
 * `validateExpectation` belongs to the caller because the two cookies have
 * different verdicts — `ld_consent` asks which choice governs, `ld_attribution`
 * asks whether a touch exists — and a loader that accepted either shape for
 * either file would let a consent verdict sit in the attribution vectors and
 * pass.
 */
export function loadVectorFile<Expectation>(
  fileName: string,
  expectedCookieName: string,
  validateExpectation: (where: string, expectation: unknown) => Expectation,
): VectorFile<Expectation> {
  const path = join(findHubFixtures(), fileName);
  if (!existsSync(path)) {
    throw new Error(
      `The hub was found but "${path}" is not in it. The fixtures are a cross-repo artefact: ` +
        `renaming or removing one is a change to what the platform runs too.`,
    );
  }

  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON object`);
  }
  const file = parsed as Record<string, unknown>;
  refuseUnknownKeys(path, file, FILE_KEYS);

  for (const key of ["cookie", "contract", "conflictRule", "verdict"] as const) {
    if (typeof file[key] !== "string" || (file[key] as string).length === 0) {
      throw new Error(`${path}: "${key}" must be a non-empty string`);
    }
  }
  if (file.cookie !== expectedCookieName) {
    throw new Error(
      `${path} describes cookie "${String(file.cookie)}" but was loaded as "${expectedCookieName}". ` +
        `The two cookies carry OPPOSITE conflict rules, so running one file's vectors through the ` +
        `other's adapter is the single most likely way to get this wrong.`,
    );
  }
  if (!Array.isArray(file.vectors) || file.vectors.length === 0) {
    throw new Error(`${path}: "vectors" must be a non-empty array`);
  }

  const seen = new Set<string>();
  const vectors = file.vectors.map((raw, index) => {
    const where = `${path} vector #${index}`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`${where} is not an object`);
    }
    const vector = raw as Record<string, unknown>;
    refuseUnknownKeys(where, vector, VECTOR_KEYS);

    if (typeof vector.name !== "string" || vector.name.length === 0) {
      throw new Error(`${where}: "name" must be a non-empty string`);
    }
    if (seen.has(vector.name)) throw new Error(`${where}: duplicate name "${vector.name}"`);
    seen.add(vector.name);

    // `null` is allowed and means "no cookie of this name at all" — see the
    // `raw` field's own note for why that is a different state from `""` and why
    // the `silent` verdict cannot be asserted without it. `undefined` is not
    // allowed: a missing key must stay distinguishable from a deliberate null,
    // or a typo in the key name reads as an assertion about absence.
    if (vector.raw !== null && typeof vector.raw !== "string") {
      throw new Error(
        `${where} (${vector.name}): "raw" must be a string, or null for "no cookie at all"`,
      );
    }
    // A `;` ends a cookie in a header, so a vector carrying one could never
    // arrive at a parser intact — it would silently become a different, shorter
    // value, and the verdict either side reached would be about bytes nobody
    // wrote down.
    if (vector.raw !== null && vector.raw.includes(";")) {
      throw new Error(
        `${where} (${vector.name}): "raw" contains a ";", which a browser would read as the end ` +
          `of the cookie. A vector has to survive a cookie header to mean anything.`,
      );
    }
    // A vector without a reason is a vector nobody can act on a year from now.
    if (typeof vector.why !== "string" || vector.why.length < 40) {
      throw new Error(
        `${where} (${vector.name}): "why" must name the contract rule or the task this vector ` +
          `pins, in a sentence (at least 40 characters).`,
      );
    }

    return {
      name: vector.name,
      raw: vector.raw,
      why: vector.why,
      expect: validateExpectation(`${where} (${vector.name})`, vector.expect),
    };
  });

  return {
    cookie: file.cookie as string,
    contract: file.contract as string,
    conflictRule: file.conflictRule as string,
    verdict: file.verdict as string,
    vectors,
  };
}

/**
 * The difference between an expected verdict and the one this repo reached, or
 * null when there is none.
 *
 * ONE COMPARISON, USED TWICE, and that is what makes the self-test worth having.
 * The real run asserts this returns null for every vector; the self-test asserts
 * it returns something for every DELIBERATELY CORRUPTED vector. If the
 * comparison were ever weakened into always answering "same", the second suite
 * goes red — so the fixtures cannot quietly stop being executed. A one-off
 * manual check ("I edited a vector once and saw red") proves nothing the day
 * after it is thrown away.
 *
 * Compared as canonical JSON, so key ORDER never matters and a missing key never
 * silently equals an undefined one.
 */
export function describeMismatch(expected: unknown, actual: unknown): string | null {
  const left = canonical(expected);
  const right = canonical(actual);
  if (left === right) return null;
  return `expected ${left}\n  actual   ${right}`;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
  return `{${entries.join(",")}}`;
}
