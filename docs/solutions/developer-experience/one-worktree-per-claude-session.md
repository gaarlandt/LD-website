---
title: "Run each concurrent Claude Code session in its own git worktree — shared checkouts collide"
date: 2026-06-01
category: developer-experience
module: development-workflow
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - Running two or more Claude Code sessions against this repo at the same time
  - A docs/cleanup session and a /new-feature build session are both open at once
  - git status or the current branch unexpectedly shows another session's uncommitted changes
tags: [git, worktree, claude-code, concurrent-sessions, working-tree, gotcha]
---

# Run each concurrent Claude Code session in its own git worktree

## Context

During the over-ons + FAQ redesign, **two Claude Code sessions were open against the same working directory at once** — a docs/cleanup session and a `/new-feature` build session. They shared one git checkout. A `git checkout main` in the cleanup session **carried the build session's ~377 lines of uncommitted work onto the wrong branch**, and an earlier `git status` had looked deceptively clean only because it ran a moment *before* the build's edits landed. Nothing was ultimately lost, but it was an avoidable scare.

## Guidance

Give each concurrent session **its own git worktree** so the sessions can't touch each other's tree:

- **CLI:** `claude --worktree <name>` — creates an isolated checkout under `.claude/worktrees/<name>/` on a fresh branch.
- **Desktop app (Mac/Windows):** each new session gets its own worktree automatically; **Settings → Claude Code** controls the worktree location, a branch prefix, and "auto-archive after PR merge/close".
- **VS Code:** run `claude --worktree` in the integrated terminal (the graphical panel has no worktree toggle).

**Never point two interactive sessions at the same checkout simultaneously.** Add `.claude/worktrees/` to `.gitignore`, and use a `.worktreeinclude` file to copy gitignored files (`.env`, etc.) into each new worktree.

## Why This Matters

Uncommitted changes live in the **working tree**, not on the branch. So any `git checkout` / branch switch in one session moves the *other* session's in-progress edits along with it. Best case it's a confusing `git status`; worst case it's a commit landing on the wrong branch, or — with a destructive command — lost work. A worktree gives each session an isolated checkout **and** branch, eliminating the entire class of collision.

## When to Apply

- Any time you'll have more than one Claude Code (or human + agent) session live on this repo at once.
- Before kicking off a `/new-feature` build while another session is still open for docs, review, or cleanup.

## Examples

```bash
# Session A — the build
claude --worktree over-ons-faq      # isolated checkout, own branch

# Session B — docs/cleanup, started separately
claude --worktree docs-cleanup      # cannot see or disturb A's tree
```

**If a collision already happened — recover before doing anything else.** Because uncommitted changes follow `HEAD` when two branches share a SHA, simply **switching back to the original branch restores the working tree intact** — nothing is lost, *as long as you do not run a destructive command* (`git reset --hard`, `git checkout -- .`, `git stash drop`). Confirm with `git status` / `git diff --stat` first, then carry on.

## Related

- `docs/solutions/conventions/cloudflare-pages-preview-functions-gotchas.md` — the 28-char preview-alias note; keep branch names short *and* worktree-isolated.
