import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { Container, Eyebrow } from "@/components/ui";
import { AppStoreComingSoon } from "@/components/layout/app-store-coming-soon";
import { CookieSettingsLink } from "@/components/layout/cookie-settings-link";

// Canonical order (matches components/layout/navbar.tsx + CLAUDE.md), bracketed
// by the two footer-only links: Homepage first, FAQ last. FAQ left the top nav
// on 2026-08-03 to free that slot for Partners, so this is now its only
// navigation entry — don't drop it.
const navLinks = [
  { href: "/", label: "Homepage" },
  { href: "/rassenkeuze", label: "Rassenkeuze hulp" },
  { href: "/puppycursus", label: "Puppycursus" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/over-ons", label: "Over ons" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
  { href: "/veelgestelde-vragen", label: "FAQ" },
];

const beleidLinks = [
  { href: "/privacybeleid", label: "Privacybeleid" },
  { href: "/algemene-voorwaarden", label: "Algemene voorwaarden" },
  { href: "/ai-gebruiksvoorwaarden", label: "AI-gebruiksvoorwaarden" },
  { href: "/cookieverklaring", label: "Cookieverklaring" },
  { href: "/retour", label: "Retour- en herroepingsbeleid" },
  { href: "/modelformulier-herroeping", label: "Modelformulier herroeping" },
  { href: "/veiligheidsdisclaimer", label: "Veiligheidsdisclaimer" },
];

export function Footer() {
  return (
    // rounded-t-[2.5rem] (40px) has no radius token — kept as a documented exception so the
    // light→dark footer transition (with -mt-10) keeps its generous curve.
    <footer className="bg-[var(--ld-forest)] text-[var(--ld-on-forest)]/70 -mt-10 rounded-t-[2.5rem] relative">
      <Container className="py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr] gap-10 lg:gap-12 mb-12">
          {/* Brand */}
          <div>
            <Image
              src={asset("/images/logo-white.svg")}
              alt="Let's dog"
              width={120}
              height={35}
              className="h-7 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed text-[var(--ld-on-forest)]/60 max-w-xs">
              Rust en vertrouwen met je pup. Gebouwd door gecertificeerde hondengedragstherapeuten.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://www.instagram.com/letsdogworld/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Let's dog op Instagram"
                className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[var(--ld-on-forest)]/15 bg-[var(--ld-on-forest)]/[0.04] text-[var(--ld-on-forest)]/60 hover:bg-[var(--ld-on-forest)]/10 hover:text-[var(--ld-on-forest)] transition-colors duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@letsdogworld6"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Let's dog op TikTok"
                className="flex items-center justify-center w-12 h-12 rounded-2xl border border-[var(--ld-on-forest)]/15 bg-[var(--ld-on-forest)]/[0.04] text-[var(--ld-on-forest)]/60 hover:bg-[var(--ld-on-forest)]/10 hover:text-[var(--ld-on-forest)] transition-colors duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-2-.54z" />
                </svg>
              </a>
            </div>

            {/* App badges — NO LONGER LINKS since the 2026-08-12 platform cutover:
                both render through AppStoreComingSoon, because the listings they
                pointed at belong to the retired environment (see that component).
                Both official badges are kept untouched, but they don't render at equal
                visual size at the same CSS height: Apple's artwork fills its SVG canvas,
                while Google's PNG bakes in a symmetric ~33% transparent clear-space margin
                (its mandated clear space), so at a shared height Google's visible pill is
                ~33% shorter. Compensate by rendering Google's canvas ~1.49x taller (250/168)
                so its visible pill matches Apple's. Apple = h-11 (2.75rem) → Google = 4.09rem.
                Use rem (not px) so it tracks the site's fluid root font-size (85%<->100%,
                see app/globals.css) in lockstep with Apple's rem-based h-11. items-center
                keeps them aligned (Google's clear-space margin is symmetric). */}
            <div className="mt-8">
              <Eyebrow tone="onGreen" className="block mb-4">
                Download de app
              </Eyebrow>
              <div className="flex items-center gap-3">
                <AppStoreComingSoon
                  src="/images/google-play-badge.png"
                  alt="Ontdek het op Google Play"
                  width={646}
                  height={250}
                  imageClassName="h-[4.09rem] w-auto"
                  ariaLabel="Google Play — binnenkort beschikbaar"
                />
                <AppStoreComingSoon
                  src="/images/app-store-badge.svg"
                  alt="Download in de App Store"
                  width={140}
                  height={42}
                  imageClassName="h-11 w-auto"
                  ariaLabel="App Store — binnenkort beschikbaar"
                />
              </div>
            </div>
          </div>

          {/* Navigatie */}
          <div>
            <Eyebrow tone="onGreen" className="block mb-5">
              Navigatie
            </Eyebrow>
            <ul className="space-y-3" role="list">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-0.5 text-sm text-[var(--ld-on-forest)]/60 hover:text-[var(--ld-on-forest)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Beleid */}
          <div>
            <Eyebrow tone="onGreen" className="block mb-5">
              Beleid
            </Eyebrow>
            <ul className="space-y-3" role="list">
              {beleidLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-0.5 text-sm text-[var(--ld-on-forest)]/60 hover:text-[var(--ld-on-forest)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* Not a page: reopens Cookiebot's own dialog. Renders only once
                  Cookiebot is actually present — see the component. */}
              <CookieSettingsLink />
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--ld-on-forest)]/10 pt-6">
          <p className="text-xs text-[var(--ld-on-forest)]/40">
            © {new Date().getFullYear()}{" "}Let&apos;s dog. Alle rechten voorbehouden.
          </p>
        </div>
      </Container>
    </footer>
  );
}
