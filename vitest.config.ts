import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

// Node environment: the only code under test is server-side (the Cloudflare Pages
// Function in functions/ and pure lib helpers) — no DOM needed. Test files live
// next to their source as *.test.ts.
//
// NOTE: *.test.ts and this config are EXCLUDED from the root tsconfig.json so
// `next build` (which typechecks **/*.ts) never compiles them — they reference
// `vitest`, a devDep absent from the production graph. tsconfig.test.json is the
// dedicated project for type-checking the test surface.
export default defineConfig({
  // Mirror tsconfig's "@/*" → repo root so tests can import lib modules that use
  // the alias (e.g. lib/structured-data.ts → @/lib/seo). The `@/` (with slash)
  // form avoids matching scoped npm packages like @scope/pkg.
  resolve: {
    alias: [{ find: /^@\//, replacement: `${root}/` }],
  },
  test: {
    environment: "node",
    // GIT WORKTREES ARE NOT PART OF THIS CHECKOUT'S SUITE, and leaving them in
    // makes `npm test` lie in both directions. The prescribed way to build here
    // is one worktree per PR under `.claude/worktrees/<task>/`, which is inside
    // the repo — so vitest's default globs walk straight into every parallel
    // branch. Measured 2026-08-15 with two worktrees present: `npm test` in the
    // main checkout reported 37 files / 927 tests instead of 12 / 310, ran
    // another branch's tests against THIS branch's `@/` alias, and produced a
    // failure that belonged to neither. The inflation is the worse half: a
    // sibling's green tests pad the count that a session reads as "my suite
    // passed".
    exclude: [...configDefaults.exclude, "**/.claude/worktrees/**"],
  },
});
