import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Slim secondary "P.S." band after the final CTA — a soft-blue cross-sell to the
 * free breed selector for visitors who don't have a pup yet. Kept deliberately
 * light (soft-blue accent, small) so it never competes with the core sell.
 */
export function RassenkeuzeStrip() {
  return (
    <section id="rassenkeuze" className="bg-white px-6 lg:px-8 py-16 lg:py-20" aria-label="Rassenkeuze hulp">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl bg-[var(--ld-accent-soft)] border border-[var(--ld-blue)]/40 px-6 py-7 lg:px-9">
          <div>
            <h2 className="font-heading font-bold text-xl md:text-2xl text-[var(--ld-text)] mb-1 leading-snug">
              Nog geen pup? Of twijfel je over het ras?
            </h2>
            <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
              Doe de gratis rassenkeuze hulp — 10 vragen, wetenschappelijk onderbouwd.
            </p>
          </div>
          <Button variant="brand" pill asChild className="flex-shrink-0">
            <Link href="/rassenkeuze">
              Doe de gratis test
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
