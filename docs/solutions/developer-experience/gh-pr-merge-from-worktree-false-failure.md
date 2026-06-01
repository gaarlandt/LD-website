---
title: gh pr merge --delete-branch false-fails from a git worktree
date: 2026-06-01
category: developer-experience
module: Dev workflow — PR merge from .claude worktrees (gh CLI + git)
problem_type: developer_experience
component: development_workflow
severity: low
applies_when:
  - Merging a PR with `gh pr merge --delete-branch` from inside a .claude/worktrees/ git worktree
  - "`gh pr merge` reports `fatal: 'main' is already used by worktree` but the API merge already succeeded"
  - Deleting a local feature branch from a secondary worktree where main is checked out elsewhere
tags: [git-worktree, gh-cli, pr-merge, false-failure, branch-cleanup, development-workflow]
---

# gh pr merge --delete-branch false-fails from a git worktree

## Context

Claude Code sessions for this repo often run inside an ephemeral git worktree under
`.claude/worktrees/<name>/`, on a `feat/*` branch, while the primary checkout at the repo
root stays on `main` (see [one-worktree-per-claude-session.md](one-worktree-per-claude-session.md)).
When a `/new-feature` flow finishes by merging the PR with the GitHub CLI **from inside that
worktree**, `gh pr merge <n> --merge --delete-branch` prints a fatal git error and exits
non-zero — which reads like the merge failed. It didn't.

## Guidance

`gh pr merge` does two things in sequence: (1) merges the PR **server-side via the GitHub
API**, then (2) cleans up **locally** — with `--delete-branch` it tries to
`git checkout <default-branch>` before deleting the merged local branch. Step 1 succeeds
first. Step 2 fails inside a secondary worktree because git refuses to check out `main` when
the primary worktree already has it checked out (a branch can live in only one worktree at a
time).

So the error is cosmetic: **the merge already landed.** Don't re-run the merge, don't
force-push, don't assume failure.

**Recover — verify first, then clean up by hand:**

```bash
# 1. Confirm the merge actually landed — do NOT trust the CLI exit code
gh pr view <n> --json state,mergedAt,mergeCommit   # state will be "MERGED"

# 2. Finish cleanup worktree-safely
git push origin --delete <branch>                  # delete the remote branch
git fetch origin --prune
# (tag the release against the merge commit here if your flow tags releases)
git checkout --detach && git branch -D <branch>    # delete the local branch
#   ^ detaching avoids needing `git checkout main`, which is impossible
#     from a secondary worktree
```

**Avoid it next time** — from a worktree, merge *without* `--delete-branch` and do branch
cleanup manually, so gh never attempts the impossible local checkout:

```bash
gh pr merge <n> --merge          # no --delete-branch → no local checkout attempt
git push origin --delete <branch>
git checkout --detach && git branch -D <branch>
```

## Why This Matters

The non-zero exit plus `fatal:` text strongly imply the merge was rejected. Reacting to that
illusion — re-running `gh pr merge`, force-pushing, or "fixing" a non-problem — can disturb a
clean merge or burn a deploy cycle (on this repo, merging to `main` triggers a Cloudflare Pages
**production** build). Knowing the failure is only the local-cleanup half turns a scary red
error into a 30-second manual cleanup, and stops you from reporting a successful ship as a
failure.

## When to Apply

- Merging a PR with `gh pr merge --delete-branch` from inside a `.claude/worktrees/` worktree
- Seeing `fatal: '<branch>' is already used by worktree at '<path>'` right after a `gh pr merge`
- Deleting a local feature branch from a secondary worktree where `main` is checked out elsewhere

## Examples

Observed 2026-06-01 merging PR #24 (`feat/over-ons-cta-prijzen-pills`) from worktree
`great-goldberg-5e791e`:

```
$ gh pr merge 24 --merge --delete-branch
failed to run git: fatal: 'main' is already used by worktree at
'/Users/jurriaan/Documents/Coding/ldcoding/website-redesign'

$ gh pr view 24 --json state,mergedAt,mergeCommit
{"state":"MERGED","mergedAt":"2026-06-01T20:34:27Z","mergeCommit":{"oid":"ebc38d1..."}}
# → merge succeeded; only the local cleanup failed.
#   Deleted the remote + local branch by hand and tagged the release. Done.
```

## Related
- [one-worktree-per-claude-session.md](one-worktree-per-claude-session.md) — why these sessions run in `.claude/worktrees/` in the first place
