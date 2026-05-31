import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  // Next already emits <meta name="robots" content="noindex"> for the
  // not-found route, so we only set the title here.
  title: "Pagina niet gevonden — Let's Dog",
};

const quickLinks = [
  { href: "/", label: "Homepage" },
  { href: "/puppyagenda", label: "Puppyagenda" },
  { href: "/rassenkeuze", label: "Rassenkeuze hulp" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/veelgestelde-vragen", label: "Veelgestelde vragen" },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  return (
    <>
      {/* Green hero band */}
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Foutmelding 404
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight max-w-xl">
            Deze pagina is van het pad afgedwaald.
          </h1>
        </div>
      </div>

      {/* Beige body with a way forward */}
      <section className="bg-[#EFE8E4] px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[#141414]/70 text-lg leading-relaxed mb-10">
            De pagina die je zocht bestaat niet (meer) of is verplaatst. Geen
            zorgen — hieronder vind je snel je weg terug.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-white text-[#141414] text-[15px] font-medium hover:bg-[#75876D] hover:text-white transition-colors duration-200"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#75876D] text-white text-[16px] font-semibold hover:bg-[#65775D] transition-all duration-200"
          >
            Terug naar de homepage
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </section>
    </>
  );
}
