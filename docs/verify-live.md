# `npm run verify:live` — the consent chain, measured at the objects

A deliberate, on-demand check that runs a real Chrome against the **deployed** site and
measures the consent and attribution chain **at the objects**, not at the bundle. It is not CI:
this repo has no GitHub Actions at all (Cloudflare Pages builds straight from pushes, and the
only PR check is "Cloudflare Pages"). You run it on purpose and tick it off the ship checklist
below.

## Why it exists

In August 2026 this repo shipped **three consecutive fixes for one consent bug**. The first two
were correct-looking, passed the whole unit suite, passed review, deployed — and did nothing.
307 green tests agreed with a broken production site across two deploys. What finally caught it
was measuring at the objects on the deployed build: `Cookiebot.hasResponse` still false after
2500 ms, the dialog on screen, no `_ga`, `fbq` undefined.

The lesson, now the rule for anything hanging off a third party:

> **A marker in the shipped bundle proves code was DELIVERED, not that it is CALLED.**

Unit tests describe a Cookiebot that exists all at once. Production delivers one that arrives in
pieces — `window.Cookiebot` published at byte 61890 of `uc.js`, `submitCustomConsent` at 105795,
its three scripts landing 221/441/549 ms in, while React finishes hydrating at 210 ms. No
double, no fixture and no typecheck can see that gap. A real browser on the real hosts can.

**It restates the contracts instead of importing them.** Nothing in `scripts/verify-live.mjs`
imports `lib/consent.ts` or `lib/attribution.ts`. A checker that builds its expectation out of
the code under test agrees with that code's bugs by construction — which is exactly how a green
suite sat on top of a broken site. Both wire formats are typed out from the contracts, so a
change on either side has to be made here too, in the open.

## Running it

```bash
npm run verify:live                       # the whole thing, ~2 minutes
npm run verify:live -- --help
npm run verify:live -- --only P3,P5       # a subset; the rest report NOT RUN (and the run fails)
npm run verify:live -- --commit <sha>     # pin the commit the live site must be built from
npm run verify:live -- --build <fp>       # pin the served build fingerprint as well
npm run verify:live -- --headed           # watch it happen
npm run verify:live -- --fault <id>       # inject a real breakage (see "Proving it can go red")
```

Exit code is 0 only when **every** proof passed. A proof that could not be attempted is `NOT RUN`
and fails the run — never a silent skip.

### What it needs

| | |
|---|---|
| **Real hosts** | `letsdog.nl` + `mijn.letsdog.nl`. The Cookiebot banner does not render on `*.pages.dev` (that host is not in the domain group) and the `ld_*` cookies are written host-only off production, so a preview cannot exercise the crossing this is about. |
| **A real Cookiebot** | Every proof drives the live CMP — its own dialog buttons, its own `withdraw()`. Never a stub. |
| **A real Chrome** | Driven by `playwright-core` (a **devDependency**). It downloads no browser of its own; it uses the Chrome already installed on the Mac. |
| **A clean cookie state** | Every proof opens a brand-new browser context. Nothing is shared between proofs and nothing touches your own Chrome profile. |
| **`wrangler`, logged in** | For the build-provenance precondition (`pages:read`). Without it the run refuses to start unless you pass `--skip-provenance`, and then says so on every summary line. |

### The price, stated not hidden

This measures production, so it **writes into** production. A full run answers the live banner a
handful of times and adds roughly a dozen real pageviews/events to GA4, Meta and PostHog from
one browser. That is the cost of measuring at the objects instead of at a mock. It is small
enough to pay on a release day and too big to put on a timer.

**And one part of what it leaves behind is misleading rather than merely noisy** — this is loop
T-61, and it is the reason every run now prints its own window. P6's refusal arm asserts that
Cookiebot deletes `ph_<token>_posthog`: **the deletion is the test, not a side effect.** So each
run deposits sessions into PostHog carrying a `$pageleave` with no `$pageview`. Extra pageviews
are noise anyone would suspect; that particular shape is not — it reads as a *finding*.

It was read as one. On 2026-08-17 two sessions built a "~14% of sessions lose their initial
pageview" figure out of a population that was two-thirds this instrument and bot traffic, and it
only came apart because someone split it per day and per device. So:

**Every run now prints the UTC window it occupied and appends it to `.verify-live-runs.log`**
(gitignored). A PostHog query over `app='website'` must exclude those windows the way it excludes
bots. The log is **local to the machine that ran it** — the durable, shared copy is the printed
window, which the ship checklist tells you to paste into the session LOG entry.

*Why a window and not a marker in the data:* tagging our own traffic (a super-property, a
recognisable `$device_id`) would filter better, but it puts this runner inside the very channel P6
measures — and P6 exists to prove that nothing sits in between. A timestamp range changes nothing
about what the site sends, and therefore nothing about what the proofs see.

## The precondition: which build am I measuring?

A check that passes against a stale bundle is the same failure in a new costume, and the
likeliest way to produce one is entirely ordinary: push, run this immediately, and measure the
**previous** build while Cloudflare is still building the new one. Green, wrong, and
indistinguishable from green and right.

So the run establishes a chain of measured facts rather than a claim:

1. `wrangler pages deployment list` names the newest **Production** deployment and the commit it
   was built from.
2. That deployment has its own permanent URL, `<id>.website-letsdog.pages.dev`. Fetch it, and
   fetch `letsdog.nl`, both with `cache-control: no-cache`.
3. Reduce each page to a **build fingerprint**: the sorted set of content-hashed
   `/_next/static/**` URLs it references, hashed to 12 hex characters. Turbopack renames every
   one of them when the code changes, so the fingerprint is the build's identity.
4. **Equal fingerprints prove the apex really is serving that deployment** — which is what turns
   "wrangler says commit X" into "the page in front of me is built from commit X". Unequal means
   the CDN, the browser or Cloudflare is handing you something else, and nothing below is worth
   measuring.
   *Stated precisely, because the weaker claim is the true one:* the fingerprint identifies the
   **built output**, not the commit. Two commits whose build is byte-identical — a merge commit
   over the same tree, a docs-only change — share a fingerprint. That is the right granularity
   for verifying behaviour, but do not read a match as a commit-level identity proof.
5. The commit is compared against `origin/main`, or `--commit <sha>`.
6. That fingerprint is then re-derived on **every** page load in every proof (assertion "page
   build matches the precondition"). A deploy landing mid-run turns the run red instead of
   quietly mixing two builds into one report.

Step 4 is also what covers the one thing step 1 cannot tell you: `wrangler` lists the newest
deployment whether or not its build succeeded. A failed build never becomes the thing the apex
serves, so its fingerprint will not match.

If the precondition fails, **no proof runs at all**.

**Right after a merge, expect to wait.** A Production deployment can be listed as `Active` while
its own `<id>.pages.dev` alias still answers 404 — measured at roughly ten minutes on
2026-08-15. The run retries that alias for two minutes and then refuses with
`… is not serving its own alias yet`, which is the correct answer: until it answers, the apex is
still on the previous build and measuring would test the wrong code. Grab a coffee and re-run.

## The proofs

Each one measures **both directions**. That is the standing rule from the cross-host contract,
and it is not symmetry for its own sake: a gate measured only in the direction it is meant to
allow has not been measured — you have proven the light turns green, not that it turns red. Every
consent bug this site has had was a light that failed to turn red.

| | Positive direction | Negative direction |
|---|---|---|
| **P0** the chain is present on this build | `Cookiebot.submitCustomConsent` is a function; the denied `consent default` is already in the dataLayer; the page's fingerprint matches the precondition | — (this one is the gate, not a behaviour) |
| **P1** return leg — a platform consent is adopted here | an all-true `ld_consent` on `.letsdog.nl` with no local answer ⇒ `hasResponse` true, no banner, `consent update` granting `analytics_storage` + `ad_storage`, `_ga` and `_fbp` present | no cookie at all ⇒ `hasResponse` false, banner up, zero consent updates, no `_ga`, no `fbevents.js` |
| **P2** the D-4 clamp | a cookie allowing **one** category (marketing only) is adopted | an **all-false** cookie is refused, the banner is shown, and its `t` is left **byte-identical** |
| **P3** outbound leg | "Allow all" on the real dialog ⇒ `ld_consent` in the contract's exact bytes (`v,t,p,s,m`, URL-encoded JSON, `Domain=.letsdog.nl`), read back identically on `mijn.letsdog.nl/checkout`, no second prompt | "Deny" ⇒ an **all-false** record that arrives on the platform as a refusal, not as an absence |
| **P4** GA4 | after consent, a `consent update` in the **dataLayer** granting all four ad/analytics signals, and `_ga` written | before any answer, the default is `denied` and there is no update at all; after "Deny", `analytics_storage` stays denied and `_ga` is absent |
| **P5** Meta | on marketing consent, `fbevents.js` is requested **and answered**, `window.fbq` is a function, `_fbp` written | without consent it is never requested, `fbq` is `undefined`, no `_fbp`; on `Cookiebot.withdraw()`, `fbq('consent','revoke')` is called and `_fbp`/`_fbc` are cleared |
| **P6** PostHog | with **no answer** (legitimate interest) captured events reach `eu.i.posthog.com`; the shared `ph_<token>_posthog` cookie carries a `$device_id` that survives a navigation and is readable on `mijn.letsdog.nl` | with statistics **explicitly refused**, zero requests to either PostHog host and the cookie is gone |
| **P7** `ld_attribution` | a tagged landing + consent records the first touch with the campaign params | an **untagged** return leaves it byte-identical; a **second, different tagged** touch does not win — FIRST touch, the inverse of `ld_consent`; and after a mid-page **statistics withdrawal** (which makes the CMP delete the record) the re-capture carries the **same `t`**, with `utm`/`gclid` gone, `fbclid` kept, and exactly one copy |
| **P8** `ld_consent` — adoption does not move `t` | a planted all-true cookie stamped **an hour ago** is adopted (`hasResponse` true, whole choice) and its `t` and bytes are **unchanged**, in exactly one copy | a real choice made *here* **does** carry a fresh moment — a writer that never stamps is frozen, not fixed |

### P7's second half and P8 both exist because of one blind spot

Seven proofs measured this chain for weeks and **not one compared a timestamp** — all seven asked
whether the *choice* arrives. That is how [T-53](../../loop/done/) (adoption restamping
`ld_consent`) survived months of green runs, and how T-58 (a first touch quietly becoming a last
touch on `ld_attribution`) survived six days. Both are timestamp bugs; nothing here could see a
timestamp.

**The planted `t` is an hour old, and without that these arms are worthless.** Stamped with
`new Date()`, the bug and the correct behaviour differ by milliseconds, and a broken site reads as
green. This is not a hypothetical: the unit test for T-58 initially failed against the broken code
by *one millisecond* — a true red that survives only as long as two `new Date()` calls happen to
straddle a boundary.

**P7's `_ga` check is the positive control, not decoration.** Deleted-and-recaptured and
merely-narrowed end in the same shape (`{t, fbclid}`); only `t` tells them apart. So if the CMP's
deletion sweep did not run at all on a given run, an unchanged `t` is green for entirely the wrong
reason. `_ga` is a known Statistics cookie in the same sweep — it going away is the evidence the
sweep ran, which is why it is asserted rather than noted.

**What P8 still guards, and what it does not.** Since `ld_consent` was registered with Cookiebot as
a necessary cookie (T-54) the CMP no longer deletes it, so `writeConsentCookie` finds the record
intact and its ordinary "same choice, nothing to write" gate keeps `t` in place — *without* the
T-53 restore path being needed. A plain green P8 therefore proves the **outcome** the contract
names, not that the restore code is alive. Measured, and it corrects the expectation this arm was
written under: `--fault restamp-refusal` leaves P8 **green** because the site puts the original
moment back, while the same fault turns P2 red — so the restore *is* running on production and
still wins. That pair of runs is now the cheapest way to ask whether it lives. The restore's own
unit test is where that code is watched by default.

Two details that will otherwise rot:

- **P6 asserts `$device_id`, not the identify shape.** T-46 is about to stop this site
  identifying on the e-mail address. `$device_id`, read from the shared cookie, is what the
  platform actually consumes and what stays true either way. An assertion written against
  `posthog.get_distinct_id()` being an e-mail would be wrong within the week.
- **P6 tells the two PostHog hosts apart.** `posthog-js` fetches remote config and extension
  bundles from `eu-**assets**.i.posthog.com` and sends captured events to `eu.i.posthog.com`.
  Only the second one is measurement. A check written against "any request to posthog" is green
  on a site that initialises the SDK perfectly and transmits nothing — which is the state this
  proof found on production (see below).

## Proving it can go red

A checker that cannot fail is worth nothing, and that is exactly the failure mode this whole
effort exists to abolish. `--fault <id>` injects a **real** breakage of the live page — a blocked
script, a planted cookie, a swallowed dataLayer entry — never a flipped expectation, so the red
output it produces is the output a real regression would produce.

| fault | what it actually does | goes red |
|---|---|---|
| `block-cookiebot` | aborts `consent.cookiebot.com` | P0–P5 report **NOT RUN** (the CMP never becomes usable) |
| `stale-consent` | the platform's cookie carries an unknown contract version | P1 (7 assertions) |
| `restamp-refusal` | rewrites `ld_consent`'s `t` after the page settles | P2 (the byte-identity + `t` assertions). **Measured not to redden P8** — on the adoption path the site restores the original moment first; see above |
| `restamp-adoption` | rewrites `ld_consent`'s `t` *after* the adoption has settled and our handlers have run | P8 (the `t` + byte-identity assertions) |
| `restamp-attribution` | rewrites `ld_attribution`'s `t` on the consent event that follows the CMP's deletion — the exact shape T-58 had in production | the T-58 half of P7 |
| `drop-handover` | deletes `ld_consent` before the hop to the platform | P3 ("readable on mijn.letsdog.nl") |
| `swallow-consent-update` | drops `consent update` on its way into the dataLayer | P4 (5 assertions; `_ga` still passes, which is the point — the dataLayer assertion is independent) |
| `block-fbevents` | aborts `connect.facebook.net` | P5 ("actually loaded" + `_fbp`) |
| `block-posthog` | aborts both PostHog hosts | P6 (the capture assertion) |
| `preset-attribution` | plants a rival first touch before the tagged landing | P7 (4 assertions) |
| `grant-uninvited` | grants full consent through the CMP's own API wherever no answer exists | the **negative** halves of P1, P2, P5 |
| `grant-statistics` | grants statistics over an already-adopted refusal | the **negative** half of P6 (the stop) |

**A green proof under its own fault is itself a failure**, and the run prints that reminder in
its header whenever `--fault` is set. Finding the fix for it is how the runner's own weakness was
caught: `block-posthog` originally left P6 green, because an aborted request still fires Chrome's
`request` event. Positives now assert on **responses**, negatives on **requests** — attempted is
the right question for "must never be asked for", answered for "must actually have loaded".

Not forced red on demand, and worth saying plainly rather than implying full coverage: the
negative halves of **P3** ("deny travels as a refusal"), **P4** ("deny leaves analytics denied")
and **P7** ("a second tagged touch does not win"). Each shares its measurement machinery with a
positive that *is* demonstrably red-able, but no single injected fault flips those three
specific expectations, so they are argued rather than demonstrated.

**`restamp-attribution` is declared but not yet demonstrated**, and that is a real gap rather than
an oversight — stated here so the next reader does not take the row above as measured. When these
arms were written, P7's T-58 half was **already red against production for the true reason** (`t`
moved 2.0 s on build `5999405b3604`, 2026-08-17, with `_ga` gone as the control), so injecting a
fault could not prove anything: a proof that is red cannot be shown to go red. It has to be
re-run once the fix is live and P7 is green. Everything else in the table above was measured on
that same build.

## Known red: PostHog transmits nothing from letsdog.nl

**As of 2026-08-15, P6's positive half fails on production, and the failure is real.** Measured
on build `00e27a62ddc0` (commit `bca5373`):

- PostHog **initialises**: it GETs `eu-assets.i.posthog.com/array/<token>/config.js` and gets a
  valid config back, loads `surveys.js` / `web-vitals.js` / `dead-clicks-autocapture.js`, writes
  the `ph_<token>_posthog` cookie on `.letsdog.nl`, and writes localStorage carrying
  `distinct_id`, `$device_id`, a session id, and the super-properties `app: "website"`,
  `platform: "web"`, `environment: "production"`.
- PostHog **transmits nothing**: zero requests of any method to `eu.i.posthog.com` across a 7 s
  dwell, a hard navigation, a Next `<Link>` soft navigation, a tracked CTA click, and a
  cross-origin unload — with consent granted and without. Confirmed independently by the page's
  own `performance.getEntriesByType("resource")`, so it is not an artefact of the automation.

So the marketing site currently measures nothing in PostHog, without an error anywhere — the
exact "fails silent" shape `CLAUDE.md` warns about for `NEXT_PUBLIC_POSTHOG_KEY`, except the key
is demonstrably valid (its remote config resolves). The assertion is deliberately **not** softened
to match: a checker rewritten to agree with the site is the failure this file exists to abolish.

## Ship checklist — analytics & consent

Work through this on any release that touches `components/analytics/**`, `lib/consent.ts`,
`lib/attribution.ts`, `lib/analytics.ts`, `lib/meta-*.ts` or `content/cookieverklaring.md`.

- [ ] `npm test` green
- [ ] `npm run typecheck:test` green
- [ ] `npx tsc -p tsconfig.json --noEmit` green
- [ ] merged to `main` and **Cloudflare has finished building** — do not skip this, the
      precondition below is what catches you if you do
- [ ] `npm run verify:live` — all proofs PASS, and the printed commit is the one you shipped
- [ ] record the build fingerprint the run printed, next to the release, so the next run can be
      pinned with `--build`
- [ ] **paste the printed run window (`from` / `to`) into the session LOG entry** — it is how a
      later PostHog query knows to exclude this run's traffic, and `.verify-live-runs.log` only
      exists on the machine that ran it
- [ ] **manual, not automatable here** — see below

### Manual steps this script cannot take

- **A choice made on the platform's own Cookie preferences screen.** P1 and P2 write `ld_consent`
  exactly as `packages/core/src/consent.ts` writes it — the wire is real, the *actor* is
  simulated, because reaching that screen needs a logged-in account. Once per release that
  touches the handover: sign in on `mijn.letsdog.nl`, change the choice there, open `letsdog.nl`
  and confirm the banner state matches.
- **Meta Events Manager.** P5 proves `fbevents.js` loads and `_fbp` is written; it cannot prove
  Meta *received* and *attributed* the event. Check Events Manager → Test Events once per release
  that touches `lib/meta-events.ts`. See
  `docs/solutions/developer-experience/verifying-a-tracking-pixel-fires-stub-fbq-not-network-reads.md`
  for why a network check reports false negatives here.
- **GA4 DebugView.** P4 proves the `consent update` reaches the dataLayer; that it lands in the
  right GA4 property with the right custom dimensions is a dashboard check.
- **Events this run pollutes.** After a run, remember that GA4/Meta/PostHog each carry ~a dozen
  synthetic events from your IP. Nothing filters them automatically.
