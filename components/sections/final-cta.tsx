import Link from "next/link";
import { Button, Eyebrow } from "@/components/ui";

export function FinalCta() {
  return (
    <section
      className="relative bg-[var(--ld-green-soft)] overflow-hidden py-24 lg:py-32 px-6 lg:px-8"
      aria-label="Begin nu met Let's dog"
    >
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <Eyebrow tone="brand" className="block mb-5">
          Begin vandaag nog
        </Eyebrow>
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-[var(--ld-text)] leading-tight mb-6 tracking-tight">
          Hoe eerder je begint,
          <br />
          hoe makkelijker het gaat.
        </h2>
        <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed mb-10 max-w-md mx-auto">
          Meld je aan en start direct. De puppyagenda, je eerste videoles en de community staan voor je klaar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="peach" pill asChild>
            <Link href="#prijzen">Start de cursus vandaag</Link>
          </Button>
        </div>

        {/* Risk reduction */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            "Gecertificeerde trainers",
            "Welzijnsgericht",
            "Week voor week",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-[var(--ld-text-muted)]">
              <div className="w-1 h-1 rounded-full bg-[var(--ld-green)]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
