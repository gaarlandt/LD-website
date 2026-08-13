---
title: Verifying a deploy really carries your change (marker, three clean rounds, counter-proof)
date: 2026-08-13
category: developer-experience
module: Deploy verification — Cloudflare Pages static export + CDN cache
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - "Claiming a merged change is LIVE on letsdog.nl (or any minified bundle behind a CDN)"
  - "A production check says the marker is missing and you are about to conclude the deploy failed"
  - "Verifying the other host (mijn.letsdog.nl) shipped its half of a cross-repo contract"
tags: [deploy-verification, cloudflare-pages, cdn-cache, minification, evidence, cross-host, false-negative]
---

# Verifying a deploy really carries your change

## Context

"Merged, CI green, Cloudflare says Success" is not evidence that the change is live. Three
things sit between the merge and the visitor, and each fails quietly:

- **The build is asynchronous.** The PR check goes green on the *preview*; production builds
  after the merge, and nothing tells you when it finished.
- **The CDN empties non-monotonically.** Measured twice (2026-08-07, 2026-08-08): round 1 served
  the new chunk, round 2 served the old one again, and only then did it stay new. A single
  positive round proves nothing.
- **The bundle is minified.** Whatever you look for has to survive that, and "it looked fine in
  my editor" is not a prediction of what the minifier emits.

This pass has been run on every consent/attribution change since B6 (T-26, T-27, T-28, T-31,
T-32, T-30, T-6, T-37, D-4, T-33). It is written down because it was re-derived each time, and
because the one time a step was skipped it produced a **false negative** — see the counter-proof.

## Guidance

### 1. Pick a marker and prove it survives minification *before* you deploy

Grep the **local production build** (`npm run build`, then `out/_next/static/chunks/`) for the
string you intend to search for on production. Do not reason about it; look.

Markers that survive: property accesses on third-party objects (`submitCustomConsent` — a
minifier cannot rename what it does not own), string literals, cookie names, a new call shape
with a distinctive argument. Markers that do not: your own local identifiers, and anything that
depends on **syntax** rather than text.

### 2. Grep the chunk the page actually loads

Fetch the served HTML, resolve the script URLs *from that HTML*, and grep those. Not the local
build, and not a chunk filename you remember from last time — the hash changes on every build,
and grepping yesterday's chunk is how a shipped change looks missing.

### 3. Three clean rounds, not one

Repeat the fetch until you have **three consecutive rounds** carrying the marker. Rounds 1 and 2
disagreeing is the normal shape of a cache emptying, not a failure.

### 4. Counter-proof the detector itself

Run the detector against a state you know does **not** carry the marker — the previous
production state, an older chunk, or `main` before the merge — and confirm it reports absence.
A detector that answers "no" to everything is indistinguishable from a failed deploy.

**This is not hypothetical.** In B11 the detector for D-4 searched for `null!==`, a form the
minifier never emits (it reorders the comparison). The deploy had succeeded; the detector said
no. Only running it against the older production state — where it *also* said no — showed the
detector was broken rather than the deploy.

## Worked example (2026-08-13): did the platform ship its half?

B12 depends on `mijn.letsdog.nl` having promoted its T-564 (contract rules 5 and 6 on
`ld_attribution`). The claim was "promoted"; the check took two commands:

```bash
curl -s https://mijn.letsdog.nl/ | grep -oE 'src="[^"]*\.js"'     # resolve the served bundle
curl -s https://mijn.letsdog.nl/_expo/static/js/web/entry-<hash>.js > pf.js
grep -c "RECORD TE GROOT VOOR EEN COOKIE" pf.js                    # 1
grep -o "MEER DAN EEN.\{0,90\}" pf.js
```

The second grep returned:

```
MEER DAN EEN ${t.ATTRIBUTION_COOKIE_NAME}-cookie${o?': OOK NA de host-only wisopdracht':''}`
```

Which carries the whole lesson in one line: **the literal fragments survived, the interpolation
did not.** Searching for the rendered sentence (`MEER DAN EEN ld_attribution-cookie`) would have
returned zero and read as "not shipped". Search for the part that is a literal in the source,
never for the string a user would see.

## Related

- `two-writers-on-one-record-need-a-newest-wins-rule.md` (logic-errors) — why cross-host claims
  need measuring on both hosts rather than reading one repo's status field.
- Cross-host contracts in the knowledge hub state their own verification rule: a handover is only
  measured once you have checked the direction where it *does not* write, too.
