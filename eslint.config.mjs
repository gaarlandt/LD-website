import nextConfig from "eslint-config-next/core-web-vitals";

// ESLint 9 flat config. `eslint-config-next/core-web-vitals` already ships a
// flat array (next, next/typescript, next/core-web-vitals), so there is no
// FlatCompat shim here and no .eslintrc to migrate.
//
// WHY THIS FILE EXISTS AT ALL: `npm run lint` had been exiting 2 —
// "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" — for as long as the
// repo has been on ESLint 9. That is not a lint failure, it is a gate that never
// ran, and a gate that never runs reads exactly like a gate that always passes
// (T-64 in the loop repo is the same failure with the colours reversed).
const config = [
  {
    // Generated and vendored trees. `out/` is the static export and `.next/` the
    // build cache: linting them means linting the compiler's output, which is
    // both slow and never actionable.
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      // BOTH worktree paths on purpose: .gitignore names `.worktrees/`, but the
      // convention this repo actually builds under is `.claude/worktrees/<task>/`
      // (see vitest.config.ts, which measured a sibling branch inflating `npm test`
      // from 12 files to 37). A linter that walks into a parallel branch reports
      // errors that belong to neither branch.
      ".worktrees/**",
      ".claude/worktrees/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...nextConfig,
];

export default config;
