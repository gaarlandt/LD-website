---
title: A fault that stays green may mean the site repaired it — discriminate by timing
date: 2026-08-17
category: developer-experience
module: verify:live fault injection — scripts/verify-live.mjs
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - "An injected --fault leaves its target proof green and you are about to call the proof broken"
  - "Writing a new verify:live arm and picking which fault should redden it"
  - "Any check whose subject is a TIMESTAMP rather than a value"
tags: [verify-live, fault-injection, positive-control, self-healing, timestamps, consent, attribution, evidence]
---

# A fault that stays green may mean the site repaired it

## Context

`verify:live` injects real breakages (`--fault <id>`) to prove each proof can still go red. The
standing reading of a green proof under its own fault is "this proof guards nothing". That reading
is incomplete, and on 2026-08-17 it would have produced a wrong conclusion in both directions.

Building P8 (T-55 — *adopting the platform's `ld_consent` must not move its `t`*), the obvious
fault to reuse was `restamp-refusal`: it rewrites exactly that field on exactly that cookie, and it
already reddens P2. It left P8 **green**.

## The three readings, and only measurement separates them

A fault that does not redden its proof has three possible causes, and the report shows the same
line for all three:

1. **The proof is not wired up** — it does not really assert what it claims.
2. **The fault never fired** — it silently returned early, or ran against a state where its
   precondition was absent.
3. **The site repaired the damage** before the proof looked.

Reading 1 is the one everybody reaches for. Here it was reading 3.

## The discriminating pair

Two runs settle it, and neither is expensive:

```bash
node scripts/verify-live.mjs --only P2 --fault restamp-refusal   # does the fault fire at all?
node scripts/verify-live.mjs --only P8 --fault restamp-adoption  # is the proof wired up?
```

- `P2` went **red** → the fault fires. Reading 2 is out.
- `restamp-adoption` is the same rewrite placed **after** the proof's own wait instead of at the
  settle, and `P8` went **red** → the proof is wired up. Reading 1 is out.

The only difference between the green run and the red one is *when* the rewrite lands relative to
our handlers. So the site put the original moment back: the T-53 restore path (PR #97) is alive on
production and wins.

## What this buys, beyond avoiding a wrong conclusion

The loop item that asked for P8 predicted the arm could no longer reach that restore code, because
T-54 stopped the CMP deleting `ld_consent` and the ordinary "same choice, nothing to write" gate
would hold `t` in place on its own. The measurement says otherwise — and it turns an unusable
fault into the cheapest liveness check available:

- **plain `--only P8`** proves the *outcome* the contract names (no restamp on adoption).
- **`--only P8 --fault restamp-refusal`** proves the *restore code* is still running, because only
  live restore code can turn that run green.

A fault that fails to redden a proof is therefore not automatically a defect in the proof. It can
be a free probe for self-healing behaviour — but only once the other two readings are excluded,
and only in that order.

## The related trap, on the same day

Every one of these checks compares a **timestamp**, and a timestamp comparison is worthless when
its two sides are close together. The unit test for T-58 first failed against the broken code by
**one millisecond** — a true red that survives only as long as two `new Date()` calls happen to
straddle a boundary. Plant an hour, or fake the clock; never `new Date()` on both sides. That
margin is why T-53 lived for months and T-58 for six days with green suites on both.

## Rule

1. A green proof under its own fault means one of three things, not one. Exclude "the fault never
   fired" with a proof it *does* redden, and "the proof is not wired up" with a fault placed late
   enough that nothing can repair it — then, and only then, conclude the site repaired it.
2. When the subject of a check is a timestamp, make the expected and the wrong value **far** apart
   by construction. Milliseconds read a broken site as green.

## Related

- [`verifying-a-deploy-really-carries-your-change.md`](verifying-a-deploy-really-carries-your-change.md)
  — the same shape one layer down: a missing marker has more than one reading too.
- `docs/verify-live.md` → "Proving it can go red" (the fault table and what each row is measured
  against).
