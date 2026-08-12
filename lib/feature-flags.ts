// Build-time feature flags. NEXT_PUBLIC_* env vars are for values that differ per
// environment; these are for offers that are temporarily not deliverable, where the
// same answer applies everywhere and the markup should survive to be switched back on.

/**
 * The persoonlijk consult (€39,50 with a certified trainer).
 *
 * Turned OFF on 2026-08-07 while the platform moves off WooCommerce: the offer is
 * not deliverable in that window, and a visible buy button that leads nowhere is
 * worse than no button at all (loop item T-13). Jur rebuilds the functionality and
 * expects to switch it back on around 2026-08-18.
 *
 * Deliberately a flag rather than a deletion — flipping this one constant back to
 * `true` restores every surface at once, instead of someone reconstructing the card
 * from git history. The JSX stays in the tree, which also keeps its imports live.
 *
 * Surfaces this governs:
 *   - app/contact/contact-content.tsx  — the whole consult card, including its photo
 *   - app/contact/page.tsx             — the SEO description that offers a consult
 *   - app/over-ons/page.tsx            — the "Plan een consult" CTA
 *
 * NOT governed by this flag, so check it by hand when switching back on:
 *   - public/llms.txt — a static file, not built from TS. Its Contact line named the
 *     consult and its price; restore that sentence when the offer returns.
 *
 * Typed as `boolean` rather than inferred as the literal `false` so the guarded JSX
 * does not read as statically unreachable.
 */
export const CONSULT_AVAILABLE: boolean = false;

/**
 * Where a consult is bought. **Empty on purpose, and that is the current state of
 * the world, not a placeholder someone forgot to fill in.**
 *
 * It used to be `https://app.letsdog.nl/consult/`. That host is the WordPress
 * environment that retired at the 2026-08-12 platform cutover, and the consult has
 * NOT been rebuilt on the platform yet — so there is no URL to point at. The dead
 * one was removed rather than repointed at a guessed `mijn.letsdog.nl/consult/`,
 * because a plausible-looking 404 is harder to notice than an absent link, and it
 * would read to the next person as already-done work.
 *
 * The two surfaces render only when this is non-empty AND the flag above is true,
 * so switching the offer back on is deliberately two facts, not one: flipping
 * CONSULT_AVAILABLE alone cannot ship a link to nowhere. Loop item T-4 carries the
 * real URL/SKU.
 */
export const CONSULT_URL: string = "";
