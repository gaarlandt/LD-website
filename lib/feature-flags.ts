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
