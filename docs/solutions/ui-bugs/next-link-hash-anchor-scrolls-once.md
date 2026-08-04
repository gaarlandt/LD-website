---
title: "A next/link same-page fragment scrolls once, then goes dead"
date: 2026-08-04
category: ui-bugs
module: Marketing site — in-page anchor CTAs (components/sections/final-cta.tsx, components/sections/partners/hero.tsx)
problem_type: ui_bug
component: tooling
symptoms:
  - "An anchor CTA scrolls to its section the first time and does nothing on every click after that, until the page is reloaded or another hash is visited"
  - "The URL shows the fragment (`/partners/#manieren`) but the viewport stays where it is"
  - "No console error, no failed request — the click just has no effect"
  - "Automated scroll assertions on the preview are unreliable for this bug and must not be used as proof — see 'Evidence, and the limits of it'"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags: [nextjs, app-router, next-link, anchor, fragment, scroll, in-page-navigation]
---

# A next/link same-page fragment scrolls once, then goes dead

## Problem

`<Link href="#manieren">` inside a `<Button asChild>` scrolled to the section on the first click. Scroll back up, click the same button again, and nothing happened — the page stayed put, with `/partners/#manieren` already in the address bar.

## Why

The App Router treats a navigation whose destination equals the current URL as a no-op. Once `location.hash` is already `#manieren`, clicking a link to `#manieren` produces no navigation — and therefore no scroll.

The browser's **native** fragment handling does not work that way: activating a fragment link re-scrolls to the target every time, whether or not the hash changed. Using `next/link` here replaces that native behaviour with routing that has an equality guard in front of it.

## Evidence, and the limits of it

The **symptom** is confirmed by a human on a real browser: click once, scroll back up, click again, nothing happens, with `/partners/#manieren` already in the address bar.

The **mechanism** is the App Router's same-URL guard, which is well-established behaviour, not a guess.

The **fix was not empirically confirmed in automation**, and it is worth recording why, because the next person will be tempted to try the same thing. Driving the anchors with `element.click()` from the browser-automation console produced results that did not reproduce between runs: the same bare control anchor scrolled on one run and not on the next, with no code change in between. Two known factors make this environment unsuitable for the measurement — the preview throttles scrolling (see `developer-experience/preview-throttles-intersection-observer-and-smooth-scroll.md`), and a synthetic `.click()` is not a user activation, which is exactly the input the "re-scroll on an unchanged fragment" path depends on.

**So: verify this one by clicking it, in a real browser.** Automated scroll assertions on fragment navigation are not trustworthy here, and a green synthetic check would have been worse than no check — it would have looked like proof.

## Solution

Use a plain `<a href="#section">` for same-page fragments. There is nothing for the router to do — no route change, no prefetch worth having — so `next/link` buys nothing here and costs the native re-scroll.

```tsx
// wrong — scrolls once per hash value
<Button variant="peach" pill asChild>
  <Link href="#manieren">Ambassadeur worden</Link>
</Button>

// right — scrolls on every click
<Button variant="peach" pill asChild>
  <a href="#manieren">Ambassadeur worden</a>
</Button>
```

`scroll-padding-top: 6rem` on `html` (`app/globals.css`) still applies — it is CSS, so it lands the target below the fixed navbar either way.

## Prevention

The rule is simply **same-page fragment → plain `<a>`; different route → `next/link`**. Two places in this repo already had it right (the `#main-content` skip link in `app/layout.tsx`, `#quiz` on `app/rassenkeuze/page.tsx`), which is what made the two broken ones look normal in review.

Worth knowing how this was found: the bug was reported on `/partners`, but a one-line grep for hash hrefs turned up a **third** instance nobody had reported — `components/sections/final-cta.tsx`, the homepage's "Start de cursus vandaag" CTA pointing at `#prijzen`. A conversion CTA on the busiest page had been scrolling once per session for as long as it had existed. When a bug turns out to be a wrong-API-for-the-job class rather than a typo, grep the class before closing it:

```bash
grep -rn 'href="#' --include="*.tsx" app components | grep -i Link
```

## Related

Analytics is unaffected: `components/analytics/cta-tracker.tsx` reads `anchor.href` and matches `url.hash === "#prijzen"`, which is identical for `<a>` and `<Link>` — the `link_destination: "pricing"` attribution on the homepage CTA survives the swap.
