---
title: "Bootstrapping Vitest in a Next static-export + Cloudflare Pages repo — two build traps"
date: 2026-06-25
category: developer-experience
module: Testing / build tooling
problem_type: convention
component: build_tooling
severity: high
applies_when:
  - Adding the first test framework (Vitest) to a Next.js static-export repo
  - Adding any *.test.ts or test-only config to a repo whose tsconfig includes **/*.ts
  - Installing/updating npm deps when local Node differs from the Cloudflare build Node
tags: [vitest, testing, next-build, typecheck, tsconfig, cloudflare-pages, npm-ci, lockfile, node-version]
---

# Bootstrapping Vitest in a Next static-export + Cloudflare Pages repo — two build traps

## Context

Phase A of the 2026-06-23 review remediation (PR #48) added the repo's **first** automated tests (Vitest, covering the contact Cloudflare Pages Function). Two non-obvious traps broke the production build before they were fixed — both invisible to a local `npm run build` on a newer Node, both caught only on the Cloudflare branch preview (preview-first discipline earning its keep).

## Trap 1 — `next build` typechecks ALL `**/*.ts`, so a test file breaks the production build

`tsconfig.json` has `include: ["**/*.ts", ...]` and `next build` runs a full `tsc` over it (no `typescript.ignoreBuildErrors`). The moment you add a `*.test.ts` that imports `vitest` (a devDep absent from the production type graph) — or a `vitest.config.ts` importing `vitest/config` — `next build` tries to typecheck it and fails.

**Fix:** exclude the test tooling from the root tsconfig, and typecheck it separately.

```jsonc
// tsconfig.json
"exclude": ["node_modules", "**/*.test.ts", "vitest.config.ts"]
```
```jsonc
// tsconfig.test.json  — Vitest runs via esbuild and ignores this; it exists for editor IntelliSense + an optional `tsc -p tsconfig.test.json --noEmit`
{ "extends": "./tsconfig.json", "include": ["**/*.test.ts", "vitest.config.ts"], "exclude": ["node_modules"] }
```

Add `"typecheck:test": "tsc -p tsconfig.test.json --noEmit"` so the test surface is still type-checked on demand. (Same root cause as the WS lesson *"`next build` is the integration source of truth"* — a file that "looks fine" still breaks the real build. Note `functions/**/*.ts` is **deliberately** kept in the build typecheck — only the test surface is carved out.)

## Trap 2 — the lockfile must be generated with the Cloudflare toolchain (Node 20 / npm 10), or `npm ci` fails

Cloudflare Pages builds with **`NODE_VERSION=20`** → **npm 10.8.2**, running **`npm ci`** (strict — the lockfile must fully describe the install). If you `npm install <newdep>` with a **newer local Node** (Node 24 → npm 11), npm 11 can write a `package-lock.json` that **omits optional native-dep entries** (here `@emnapi/core` + `@emnapi/runtime`, pulled in via the Vitest/Rolldown tree) which npm 10's `npm ci` then **rejects as out-of-sync** — failing the deploy at the install step. Your local `npm run build` (newer Node, lenient `npm install`) never sees it.

**Symptom** (Cloudflare build log / local repro under Node 20):
```
npm error `npm ci` can only install packages when your package.json and package-lock.json ... are in sync.
npm error Missing: @emnapi/runtime@1.x from lock file
```

**Fix / prevention:** install & update deps with the **same Node the deploy uses**. This repo pins it in `.claude/launch.json`: `/Users/jurriaan/.nvm/versions/node/v20.19.5/bin/npm install` (or `nvm use 20`). Reconcile a broken lockfile by running `npm install` under Node 20, then verify with `npm ci` (Cloudflare's exact step) **before** pushing.

## When to apply
- Any first-test-framework bootstrap in a Next static-export repo with a repo-wide tsconfig `include`.
- Any dependency add/update in a repo whose Cloudflare/CI Node differs from your local Node.

## Related
- [`../conventions/turnstile-on-cloudflare-pages-function.md`](../conventions/turnstile-on-cloudflare-pages-function.md) + [`../conventions/transactional-confirmation-email-postmark-batch.md`](../conventions/transactional-confirmation-email-postmark-batch.md) — the contact Function these tests cover.
- [`../conventions/cloudflare-pages-preview-functions-gotchas.md`](../conventions/cloudflare-pages-preview-functions-gotchas.md) — verification reality (Functions don't run under `next dev`).
- [`../integration-issues/design-system-into-nextjs-static-export.md`](../integration-issues/design-system-into-nextjs-static-export.md) — "`next build` is the integration source of truth."
- Implemented in PR #48 (`vitest.config.ts`, `tsconfig.test.json`, `functions/api/contact.test.ts`).
