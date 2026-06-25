import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
  },
});
