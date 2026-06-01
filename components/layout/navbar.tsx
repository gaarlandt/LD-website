"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { asset } from "@/lib/utils";
import { Button } from "@/components/ui";

const links = [
  { href: "/rassenkeuze", label: "Rassenkeuze hulp" },
  { href: "/puppyagenda", label: "Puppyagenda" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/over-ons", label: "Over ons" },
  { href: "/veelgestelde-vragen", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mobile menu = a modal surface: trap Tab within it and close on Esc (restoring
  // focus to the toggle). Radix isn't used here because the menu is a top-anchored
  // dropdown, not a centred dialog — so the trap is hand-rolled but small.
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const focusable = () =>
      Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    focusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--ld-beige)]/95 backdrop-blur-sm shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20"
        aria-label="Hoofdnavigatie"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200"
          aria-label="Let's Dog — terug naar homepage"
        >
          <Image
            src={asset("/images/logo-black.svg")}
            alt="Let's Dog"
            width={120}
            height={35}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="relative text-[15px] text-[var(--ld-text)]/80 hover:text-[var(--ld-text)] transition-colors duration-200 font-medium after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[var(--ld-green)] after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="secondary" pill asChild>
            <a href="https://app.letsdog.nl" target="_blank" rel="noopener noreferrer">
              Inloggen
            </a>
          </Button>
          <Button variant="brand" pill asChild>
            <Link href="/prijzen">Start vandaag</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          ref={toggleRef}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-[44px] h-[44px] rounded-lg text-[var(--ld-text)] hover:bg-[var(--ld-text)]/10 transition-colors duration-200 cursor-pointer"
          aria-label={open ? "Sluit menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={24} aria-hidden="true" /> : <List size={24} aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          id="mobile-menu"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="md:hidden bg-[var(--ld-beige)] border-t border-[var(--ld-border)] px-6 pb-6 pt-4"
        >
          <ul className="flex flex-col gap-4 mb-6" role="list">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-[17px] font-medium text-[var(--ld-text)] hover:text-[var(--ld-green)] transition-colors duration-200 py-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" pill block asChild>
              <a
                href="https://app.letsdog.nl"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                Inloggen
              </a>
            </Button>
            <Button variant="brand" pill block asChild>
              <Link href="/prijzen" onClick={() => setOpen(false)}>
                Start vandaag
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
