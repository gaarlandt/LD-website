import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import { GreenHeroBand } from "@/components/shared/green-hero-band";

export const metadata: Metadata = {
  // Next already emits <meta name="robots" content="noindex"> for the
  // not-found route, so we only set the title here.
  title: "Pagina niet gevonden — Let's Dog",
};

const quickLinks = [
  { href: "/", label: "Homepage" },
  { href: "/puppyagenda", label: "Puppycursus" },
  { href: "/rassenkeuze", label: "Rassenkeuze hulp" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/veelgestelde-vragen", label: "Veelgestelde vragen" },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  return (
    <>
      {/* Green hero band */}
      <GreenHeroBand
        eyebrow="Foutmelding 404"
        title="Deze pagina is van het pad afgedwaald."
        titleClassName="max-w-xl"
      />

      {/* Beige body with a way forward */}
      <section className="bg-[var(--ld-beige)] px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed mb-10">
            De pagina die je zocht bestaat niet (meer) of is verplaatst. Geen
            zorgen — hieronder vind je snel je weg terug.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {quickLinks.map((l) => (
              <Button key={l.href} variant="secondary" pill asChild>
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </div>

          <Button variant="brand" pill asChild>
            <Link href="/">
              Terug naar de homepage
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
