---
title: "A fresh git worktree has no node_modules — run `npm install` in it before building"
date: 2026-06-02
category: developer-experience
module: development-workflow
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - First `npm run build` / `npm run dev` in a new `.claude/worktrees/<name>` checkout
  - Build fails with "Module not found: Can't resolve '<pkg>'" for a dependency that IS in package.json
  - A dependency was added on main since the parent checkout was last `npm install`-ed
tags: [git, worktree, npm, node-modules, dependencies, build-failure, gotcha]
---

# A fresh git worktree has no node_modules — run `npm install` in it before building

## Context

Building the homepage restructure inside a `.claude/worktrees/<name>` worktree, the first `npm run build` failed:

```
Module not found: Can't resolve '@radix-ui/react-label'
  ./components/ui/label.tsx
  ./components/ui/index.ts        ← the barrel, imported by app/not-found.tsx + the contact page
```

The worktree had **no `node_modules` of its own**. Node's module resolution walks up parent directories, so it found the **parent checkout's** `node_modules` (at the repo root) and resolved *most* deps from there — `next`, `react`, even `@radix-ui/react-slot`. But the parent's install was **stale**: `@radix-ui/react-label`, `-dialog`, and `-accordion` were added to `package.json` in the brand-guide-v2 commit and never `npm install`-ed locally. So the build half-worked and failed only on the newer deps — which reads like a missing *dependency* but is really a missing *install*.

## Guidance

**In a fresh worktree, run `npm install` before the first build.** Don't trust the parent checkout's `node_modules` — it can be stale relative to `package.json` after any dependency change merged to main.

```bash
# first thing in a new .claude/worktrees/<name> checkout
npm install --no-audit --no-fund
npm run build
```

`node_modules` is gitignored and not copied into worktrees (nor would you want to — a clean install is correct). `.worktreeinclude` is for small gitignored files like `.env`, not `node_modules`.

## Why This Matters

git worktrees share the `.git` object store but each has its **own working directory with no `node_modules`**. Node's upward resolution masks the gap by finding the parent's modules, so the failure is **partial and misleading**: the build compiles hundreds of modules, then dies on the one package the parent lacks. You chase a phantom "missing dependency" when the real fix is one `npm install` in the worktree.

A harmless side effect: `npm install` may touch `package-lock.json` with metadata-only churn (e.g. adding `"peer": true` lines from an npm-version difference). Revert it (`git checkout package-lock.json`) to keep a feature diff clean — the deps are already correct in the committed `package.json`/lock, and Cloudflare does a fresh install on every build regardless.

## When to Apply

- The first `npm run build`/`dev` in any new `.claude/worktrees/*` checkout.
- Especially right after a dependency change has merged to main (the parent's `node_modules` is now behind).
- Whenever a build error names a package you can confirm is already present in `package.json`.

## Examples

```bash
# Symptom (fresh worktree, parent node_modules stale):
$ npm run build
#   Module not found: Can't resolve '@radix-ui/react-label'

# Fix:
$ npm install --no-audit --no-fund   # e.g. "added 504 packages in 12s"
$ npm run build                       # ✓ all routes prerender
$ git checkout package-lock.json      # optional: drop benign "peer": true churn
```

## Related

- `docs/solutions/developer-experience/one-worktree-per-claude-session.md` — why each session gets its own worktree (the collision class); this is the dependency corollary.
- `docs/solutions/developer-experience/gh-pr-merge-from-worktree-false-failure.md` — another worktree gotcha (`gh pr merge` reporting from a worktree).
- `docs/solutions/integration-issues/design-system-into-nextjs-static-export.md` — why the `components/ui` barrel pulls `label.tsx`/`dialog.tsx` (and their Radix deps) into the build graph.
