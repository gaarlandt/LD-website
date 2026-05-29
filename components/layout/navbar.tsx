"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { Menu, X } from "lucide-react";

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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#EFE8E4]/95 backdrop-blur-sm shadow-sm"
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
                className="relative text-[15px] text-[#141414]/80 hover:text-[#141414] transition-colors duration-200 font-medium after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-[#75876D] after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://app.letsdog.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-5 py-2.5 rounded-full border border-[#141414]/30 bg-white/40 backdrop-blur-sm text-[#141414] text-[15px] font-medium hover:bg-white hover:border-[#141414] transition-colors duration-200 cursor-pointer"
          >
            Inloggen
          </a>
          <a
            href="https://app.letsdog.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#75876D] text-white text-[15px] font-medium hover:bg-[#65775D] transition-colors duration-200 cursor-pointer"
          >
            Start gratis
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg text-[#141414] hover:bg-[#141414]/10 transition-colors duration-200 cursor-pointer"
          aria-label={open ? "Sluit menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          id="mobile-menu"
          className="md:hidden bg-[#EFE8E4] border-t border-[#141414]/10 px-6 pb-6 pt-4"
        >
          <ul className="flex flex-col gap-4 mb-6" role="list">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-[17px] font-medium text-[#141414] hover:text-[#75876D] transition-colors duration-200 py-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-5 py-3 rounded-full border border-[#141414]/30 bg-white text-[#141414] font-medium text-[16px] hover:border-[#141414] transition-colors duration-200 cursor-pointer"
            >
              Inloggen
            </a>
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-5 py-3 rounded-full bg-[#75876D] text-white font-medium text-[16px] hover:bg-[#65775D] transition-colors duration-200 cursor-pointer"
            >
              Start gratis
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
