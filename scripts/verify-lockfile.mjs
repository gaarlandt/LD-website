#!/usr/bin/env node
// Does `npm ci` still accept this package.json + package-lock.json pair?
//
// WHY THIS EXISTS, and it is not hypothetical: between 2026-08-15 and 2026-08-17
// every Cloudflare production build failed because the lockfile had drifted out
// of sync with package.json (sharp's optional @emnapi shims, introduced by the
// commit that added playwright-core). The site kept serving an older deployment
// for two days and nothing said so out loud. Loop task T-51; second occurrence
// of the same cause, after commit 6e2f8fd.
//
// THE POINT IS THE COMMAND, NOT THE COVERAGE. `npm run build`, the typecheck and
// all 420 unit tests passed happily on the broken lockfile — every local gate we
// had was green while production could not build. Cloudflare runs `npm ci`, and
// `npm ci` is the one command nobody runs locally. A guard that re-runs the gates
// we already have cannot catch this class by construction; this one runs the
// failing command itself.
//
// TWO DESIGN CHOICES THAT MAKE IT USABLE, both measured rather than assumed:
//
//   1. `--dry-run`, in a COPY of the two files, in a temp directory. Resolution
//      is the part that fails on drift; the download and the write are not. That
//      turns a ~40 s install into **407 ms** (measured 2026-08-17), which is what
//      makes it cheap enough to run automatically. Copying rather than running in
//      the repo also means it can never touch node_modules — a real `npm ci`
//      deletes that directory first, so a guard that ran in place would wreck a
//      working checkout every time it fired.
//
//   2. It refuses to run under the wrong Node major. Cloudflare builds with
//      NODE_VERSION=20 while the local default here is 24, and these optional
//      binary packages resolve DIFFERENTLY per major — regenerating a lockfile
//      under 24 is how the file drifted in the first place. A guard that measured
//      the wrong runtime would hand out false green, which is worse than no guard.
//
// Verified in both directions on the day it was written (the only kind of green
// that means anything): it passes on today's lockfile, and it fails on the exact
// lockfile from commit 48725a5 with `Missing: @emnapi/runtime@1.11.3 from lock file`.

import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["package.json", "package-lock.json"];

// The major Cloudflare Pages builds with. Keep in step with NODE_VERSION in the
// Pages dashboard and with the `NODE_VERSION` note in CLAUDE.md; if that moves,
// this has to move with it or the guard measures a runtime nobody deploys on.
const REQUIRED_NODE_MAJOR = 20;

function fail(message, detail) {
  console.error(`\n✗ verify:lockfile — ${message}\n`);
  if (detail) console.error(detail.trimEnd() + "\n");
  process.exit(1);
}

const major = Number(process.versions.node.split(".")[0]);
if (major !== REQUIRED_NODE_MAJOR) {
  fail(
    `draait op Node ${process.versions.node}, maar Cloudflare bouwt op Node ${REQUIRED_NODE_MAJOR}.`,
    `Deze controle zegt alleen iets als hij dezelfde major gebruikt als de build:\n` +
      `optionele binaries (sharp's @emnapi-shims) lossen per major anders op, en\n` +
      `dat is precies hoe de lockfile in T-51 uit de pas liep.\n\n` +
      `  nvm exec ${REQUIRED_NODE_MAJOR} npm run verify:lockfile\n`,
  );
}

const dir = mkdtempSync(join(tmpdir(), "ld-lockfile-"));
try {
  for (const file of FILES) copyFileSync(join(REPO_ROOT, file), join(dir, file));
  try {
    execFileSync("npm", ["ci", "--dry-run", "--no-audit", "--no-fund"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    fail(
      "package.json en package-lock.json lopen uit de pas — Cloudflare's `npm ci` gaat hierop falen.",
      `${err.stderr || err.stdout || err.message}\n` +
        `Herstel met de versie die Cloudflare gebruikt, niet met de lokale standaard:\n\n` +
        `  nvm exec ${REQUIRED_NODE_MAJOR} npm install --package-lock-only\n\n` +
        `Commit de gewijzigde package-lock.json mee.`,
    );
  }
  console.log(`✓ verify:lockfile — npm ci accepteert deze lockfile (Node ${process.versions.node}).`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
