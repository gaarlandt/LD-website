"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { asset } from "@/lib/utils";

/**
 * Hand-rolled "Binnenkort beschikbaar" popover for the App Store badge.
 *
 * NO LONGER RENDERED: the iOS app launched 2026-07-02, so the footer now links
 * straight to the App Store (see components/layout/footer.tsx). Kept on purpose
 * as the canonical local example for the invoker-commands convention — a
 * useState + onClick + ARIA popover that should be refactored to native
 * command/commandfor + the Popover API (CLAUDE.md "Interactive overlays" and
 * the cross-project invoker-commands contract point here).
 */
export function AppStoreComingSoon() {
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
        aria-label="App Store — binnenkort beschikbaar"
        aria-expanded={open}
        className="inline-flex items-center border-0 bg-transparent p-0 opacity-90 transition-opacity duration-200 hover:opacity-100 cursor-pointer"
      >
        <Image
          src={asset("/images/app-store-badge.svg")}
          alt="Download in de App Store"
          width={140}
          height={42}
          className="h-11 w-auto"
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
