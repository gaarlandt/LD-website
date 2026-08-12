"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { asset } from "@/lib/utils";

/**
 * "Binnenkort beschikbaar" popover wrapped around a store badge.
 *
 * IN USE AGAIN since the platform cutover (2026-08-12). The store listings it
 * used to link to belong to the RETIRED WordPress/BuddyBoss environment; the
 * rebuilt platform does not ship to the stores until phase 3. So the badges stay
 * (they still say "an app is coming"), but the links come off — a live badge
 * pointing at an app that is no longer the product is worse than no link.
 *
 * Takes the badge as a prop because both badges now need it, and their heights
 * are NOT interchangeable: Apple's SVG is edge-to-edge at `h-11`, Google's PNG
 * bakes in a symmetric ~33% transparent clear-space margin and therefore renders
 * at `h-[4.09rem]` (250/168) so the two visible pills match. Pass the same class
 * the plain <img> used, or the badges drift apart. Full reasoning lives in the
 * comment above the badge row in footer.tsx.
 *
 * Still the canonical local example for the invoker-commands convention: a
 * useState + onClick + ARIA popover that should become native command/commandfor
 * + the Popover API (CLAUDE.md "Interactive overlays" and the cross-project
 * invoker-commands contract point here).
 */
export function AppStoreComingSoon({
  src,
  alt,
  width,
  height,
  imageClassName,
  ariaLabel,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  imageClassName: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Dismiss on outside-click or Esc while the bubble is open.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="inline-flex items-center border-0 bg-transparent p-0 opacity-90 transition-opacity duration-200 hover:opacity-100 cursor-pointer"
      >
        <Image
          src={asset(src)}
          alt={alt}
          width={width}
          height={height}
          className={imageClassName}
        />
      </button>
      {open && (
        <span
          role="status"
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--ld-paper)] px-3 py-1.5 text-xs font-semibold text-[var(--ld-ink)] shadow-[var(--ld-sh-2)]"
        >
          Binnenkort beschikbaar
        </span>
      )}
    </span>
  );
}
