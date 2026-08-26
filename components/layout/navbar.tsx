"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { asset } from "@/lib/utils";
import { Button } from "@/components/ui";

const links = [
  { href: "/rassenkeuze", label: "Rassenkeuze hulp" },
  { href: "/puppycursus", label: "Puppycursus" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/over-ons", label: "Over ons" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // Only the homepage opens on the photo hero — every other page opens on a
  // plain beige section, where the default dark icon/logo already reads fine.
  const whiteHeader = pathname === "/" && !scrolled;
  // De verkoop-CTA wijst naar /prijzen. Staat de bezoeker daar al, dan doet de knop
  // zichtbaar niets — dat leverde klachten op. Weglaten in plaats van uitschakelen: een
  // disabled CTA in een navigatiebalk is nog verwarrender dan een die verdwijnt.
  // `trailingSlash: true` staat aan, dus beide vormen afvangen.
  // Op mobiel is dit óók de schakelaar voor de ENE pil rechtsboven: overal de verkoop-CTA,
  // op /prijzen de Login-pil. Het menu draagt Login dan niet nog eens — zie beide plekken.
  const opPrijzen = pathname === "/prijzen" || pathname === "/prijzen/";

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
        {/* Logo — order-2 + ml-2 nudges it right of the hamburger on mobile only.
            Two marks: mobile swaps color with the header state (the mobile hero
            is a full-width photo); desktop always stays dark (the desktop hero
            only covers the right 55%, left side is solid green — see hero.tsx —
            so the existing dark mark already reads fine there, unchanged). */}
        <Link
          href="/"
          className="order-2 md:order-none ml-2 md:ml-0 flex-shrink-0 hover:opacity-80 transition-opacity duration-200"
          aria-label="Let's dog — terug naar homepage"
        >
          <Image
            src={asset(whiteHeader ? "/images/logo-white.svg" : "/images/logo-black.svg")}
            alt="Let's dog"
            width={120}
            height={35}
            className={`md:hidden h-8 w-auto ${whiteHeader ? "drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" : ""}`}
            priority
          />
          <Image
            src={asset("/images/logo-black.svg")}
            alt="Let's dog"
            width={120}
            height={35}
            className="hidden md:block h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="relative text-[15px] text-[var(--ld-text)] transition-colors duration-200 font-medium after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[var(--ld-green)] after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="secondary" pill asChild>
            <a href="https://mijn.letsdog.nl" target="_blank" rel="noopener noreferrer">
              Inloggen
            </a>
          </Button>
          {!opPrijzen && (
            <Button variant="peach" pill asChild>
              <Link href="/prijzen">Start gratis proef</Link>
            </Button>
          )}
        </div>

        {/* Mobile menu button — order-1 pins it to the far left on mobile */}
        <button
          ref={toggleRef}
          onClick={() => setOpen((v) => !v)}
          className={`order-1 md:hidden inline-flex items-center justify-center w-[44px] h-[44px] rounded-lg transition-colors duration-200 cursor-pointer ${
            whiteHeader
              ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] hover:bg-white/10"
              : "text-[var(--ld-text)] hover:bg-[var(--ld-text)]/10"
          }`}
          aria-label={open ? "Sluit menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={24} aria-hidden="true" /> : <List size={24} aria-hidden="true" />}
        </button>

        {/* Mobile spacer — absorbs the free space so the header pill pins right */}
        <div className="order-3 flex-1 md:hidden" aria-hidden="true" />

        {/* Mobile header action — precies ÉÉN pil, en welke dat is hangt van de pagina af:
            overal de verkoop-CTA, op /prijzen (waar die knop naar de huidige pagina zou
            wijzen) de Login-pil. Het menu draagt Login dan niet nog eens.

            De peach-vulling is DEKKEND en flipt daarom niet mee met `scrolled`. Dat is het
            punt en geen slordigheid: de vorige doorzichtige pil leende zijn contrast van de
            foto eronder en haalde daardoor 1,36 tot 3,13:1, gemeten over zeven pagina's
            (T-72). Ink op peach is een vast getal — 9,6:1 — ongeacht wat erachter zit.

            De Login-variant hieronder mag wél de lichte vulling houden: /prijzen opent niet
            op een foto (alleen de homepage doet dat, zie `whiteHeader`), dus daar is de
            ondergrond altijd beige en het contrast dus even deterministisch. */}
        {opPrijzen ? (
          <a
            href="https://mijn.letsdog.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="order-4 md:hidden inline-flex items-center justify-center rounded-full border border-[var(--ld-text)]/[0.14] bg-[var(--ld-text)]/[0.07] px-[15px] py-2 text-[12.5px] font-semibold text-[var(--ld-text)] transition-colors duration-200"
          >
            Login
          </a>
        ) : (
          <Link
            href="/prijzen"
            // Navbar hangt in de root-layout, dus client-navigatie reset `open` NIET. Zonder
            // deze regel landt een bezoeker die het menu opent en dan deze knop tikt op
            // /prijzen mét het aria-modal menu nog open — en daar is het leeg, want de
            // Login-knop erin hangt aan !opPrijzen. Gereproduceerd voor het is gerepareerd.
            onClick={() => setOpen(false)}
            className="order-4 md:hidden inline-flex items-center justify-center rounded-full border border-transparent bg-[var(--ld-peach)] px-[15px] py-2 text-[12.5px] font-semibold text-[var(--ld-ink)] transition-colors duration-200 hover:bg-[var(--ld-peach-deep)]"
          >
            Start gratis proef
          </Link>
        )}
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
          {/* Login staat hier alleen wanneer de pil in de kop de verkoop-CTA toont; op
              /prijzen staat Login al in die pil en zou dit een tweede zijn. */}
          {!opPrijzen && (
            <Button variant="ghost" pill block asChild>
              <a
                href="https://mijn.letsdog.nl"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                Login
              </a>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
