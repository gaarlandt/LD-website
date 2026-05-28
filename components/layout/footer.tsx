import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="bg-[#141414] text-white/70 mt-0">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 mb-12">
          {/* Brand */}
          <div>
            <Image
              src={asset("/images/logo-white.svg")}
              alt="Let's Dog"
              width={120}
              height={35}
              className="h-8 w-auto mb-3"
            />
            <p className="text-sm leading-relaxed text-white/60 max-w-xs">
              Puppytraining die werkt. Gebouwd door gecertificeerde hondengedragstherapeuten.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-sm font-semibold text-white/90 mb-4 uppercase tracking-wider">
              Navigatie
            </p>
            <ul className="space-y-2.5" role="list">
              {[
                { href: "/", label: "Homepage" },
                { href: "/hondenkeuze", label: "Hondenkeuze" },
                { href: "/puppyagenda", label: "Puppyagenda" },
                { href: "/prijzen", label: "Prijzen" },
                { href: "/over-ons", label: "Over ons" },
                { href: "/veelgestelde-vragen", label: "FAQ" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <p className="text-sm font-semibold text-white/90 mb-4 uppercase tracking-wider">
              Begin nu
            </p>
            <p className="text-sm text-white/60 mb-5 leading-relaxed">
              Maak een gratis account aan en begin vandaag nog.
            </p>
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#FFA580] text-[#141414] text-sm font-semibold hover:bg-[#ff9060] transition-colors duration-200 cursor-pointer"
            >
              Maak een gratis account
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Let&apos;s Dog. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <Link
              href="/privacybeleid"
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              Privacybeleid
            </Link>
            <Link
              href="/algemene-voorwaarden"
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              Algemene voorwaarden
            </Link>
            <Link
              href="/ai-gebruiksvoorwaarden"
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              AI-gebruiksvoorwaarden
            </Link>
            <Link
              href="/cookieverklaring"
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              Cookieverklaring
            </Link>
            <Link
              href="/retour"
              className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              Retour
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
