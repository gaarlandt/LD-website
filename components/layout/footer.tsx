import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="bg-[#162A0E] text-white/70 -mt-10 rounded-t-[2.5rem] relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-8">
          {/* Brand */}
          <div>
            <Image
              src={asset("/images/logo-white.svg")}
              alt="Let's Dog"
              width={120}
              height={35}
              className="h-7 w-auto mb-3"
            />
            <p className="text-sm leading-relaxed text-white/60 max-w-xs">
              Puppytraining die werkt. Gebouwd door gecertificeerde hondengedragstherapeuten.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://www.instagram.com/letsdogworld/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Let's Dog op Instagram"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@letsdogworld6"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Let's Dog op TikTok"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-2-.54z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links — two columns */}
          <div>
            <p className="text-sm font-semibold text-white/90 mb-4 uppercase tracking-wider">
              Navigatie
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5" role="list">
              {[
                { href: "/", label: "Homepage" },
                { href: "/rassenkeuze", label: "Rassenkeuze hulp" },
                { href: "/puppyagenda", label: "Puppyagenda" },
                { href: "/prijzen", label: "Prijzen" },
                { href: "/over-ons", label: "Over ons" },
                { href: "/veelgestelde-vragen", label: "FAQ" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-1 text-sm text-white/60 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()}{" "}Let&apos;s Dog. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <Link
              href="/privacybeleid"
              className="inline-block py-1.5 text-xs text-white/60 hover:text-white transition-colors duration-200"
            >
              Privacybeleid
            </Link>
            <Link
              href="/algemene-voorwaarden"
              className="inline-block py-1.5 text-xs text-white/60 hover:text-white transition-colors duration-200"
            >
              Algemene voorwaarden
            </Link>
            <Link
              href="/ai-gebruiksvoorwaarden"
              className="inline-block py-1.5 text-xs text-white/60 hover:text-white transition-colors duration-200"
            >
              AI-gebruiksvoorwaarden
            </Link>
            <Link
              href="/cookieverklaring"
              className="inline-block py-1.5 text-xs text-white/60 hover:text-white transition-colors duration-200"
            >
              Cookieverklaring
            </Link>
            <Link
              href="/retour"
              className="inline-block py-1.5 text-xs text-white/60 hover:text-white transition-colors duration-200"
            >
              Retour
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
