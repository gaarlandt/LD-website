"use client";

import { useEffect, useState } from "react";
import { buildEmbedUrl, KEUZEHULP_ORIGIN } from "@/lib/embed-url";

export function RassenkeuzeEmbed() {
  // `src` stays null until mount. We read window.location.search client-side
  // because the site is a static export (no server searchParams) and
  // useSearchParams() would force a Suspense boundary. Server HTML and the
  // first client render both show the placeholder (src === null), so there's no
  // hydration mismatch; gating the iframe on a computed src also avoids a
  // fresh-quiz → results double-load on the deep-link path.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    // Deliberate, and the comment on `src` above says why: on a static export the
    // query string only exists client-side, and both the server HTML and the first
    // client render must show the placeholder or hydration mismatches. Setting it
    // after mount IS the fix for that, not a cascade to avoid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
