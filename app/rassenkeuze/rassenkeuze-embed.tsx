"use client";

import { useEffect, useState } from "react";

const KEUZEHULP_ORIGIN = "https://keuzehulp.letsdog.nl";

/**
 * Builds the keuzehulp (BreedSelector) iframe URL from the current page's query
 * string. Forwards the whole incoming query — BreedSelector ignores params it
 * doesn't recognise — strips any incoming `source`, and always forces
 * `source=website` (so it's never duplicated and the website's value wins).
 *
 * No query string → `https://keuzehulp.letsdog.nl/?source=website` — the fresh
 * quiz, exactly as before. With result params → BreedSelector deep-links
 * straight to those results (this powers its results-email links back to us).
 */
function buildEmbedUrl(search: string): string {
  // URLSearchParams strips a leading "?" itself, so window.location.search
  // ("" or "?q1=a&q2=b") can be passed in directly.
  const params = new URLSearchParams(search);
  params.delete("source");
  params.set("source", "website");
  return `${KEUZEHULP_ORIGIN}/?${params.toString()}`;
}

export function RassenkeuzeEmbed() {
  // `src` stays null until mount. We read window.location.search client-side
  // because the site is a static export (no server searchParams) and
  // useSearchParams() would force a Suspense boundary. Server HTML and the
  // first client render both show the placeholder (src === null), so there's no
  // hydration mismatch; gating the iframe on a computed src also avoids a
  // fresh-quiz → results double-load on the deep-link path.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(buildEmbedUrl(window.location.search));
  }, []);

  return (
    <>
      <div className="rounded-[var(--ld-r-lg)] overflow-hidden border border-[var(--ld-border)] bg-white shadow-[var(--ld-sh-3)]">
        {src ? (
          <iframe
            src={src}
            title="Let's dog Rassenkeuze hulp — rasadvies quiz"
            className="w-full min-h-[700px] border-0"
            loading="lazy"
            allow="clipboard-write"
          />
        ) : (
          // Same-height placeholder keeps the card from shifting before mount.
          <div className="w-full min-h-[700px]" aria-hidden="true" />
        )}
      </div>

      <p className="text-center text-sm text-[var(--ld-text-subtle)] mt-6">
        Laadt de rassenkeuze hulp niet?{" "}
        <a
          href={src ?? KEUZEHULP_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ld-green)] underline hover:text-[var(--ld-green-ink)]"
        >
          Open in een nieuw tabblad
        </a>
      </p>
    </>
  );
}
