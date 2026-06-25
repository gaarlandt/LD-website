// Pure helper (no DOM) shared by app/rassenkeuze/rassenkeuze-embed.tsx and its
// unit test — kept out of the "use client" component so it's importable from a
// Node Vitest test without pulling React in.

export const KEUZEHULP_ORIGIN = "https://keuzehulp.letsdog.nl";

/**
 * Builds the keuzehulp (BreedSelector) iframe URL from the current page's query
 * string. Forwards the whole incoming query — BreedSelector ignores params it
 * doesn't recognise — strips any incoming `source`, and always forces
 * `source=website` (so it's never duplicated and the website's value wins).
 *
 * No query string → `https://keuzehulp.letsdog.nl/?source=website` — the fresh
 * quiz. With result params → BreedSelector deep-links straight to those results
 * (this powers its results-email links back to us).
 */
export function buildEmbedUrl(search: string): string {
  // URLSearchParams strips a leading "?" itself, so window.location.search
  // ("" or "?q1=a&q2=b") can be passed in directly.
  const params = new URLSearchParams(search);
  params.delete("source");
  params.set("source", "website");
  return `${KEUZEHULP_ORIGIN}/?${params.toString()}`;
}
