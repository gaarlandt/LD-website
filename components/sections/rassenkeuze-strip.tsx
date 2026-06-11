import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Secondary "P.S." band after the final CTA — a soft-blue cross-sell to the free
 * breed selector for visitors who don't have a pup yet. Kept light (soft-blue
 * accent) so it never competes with the core sell. Uses the shared `Container`
 * (fixed 1200px) so the card lines up with the footer at every viewport — a
 * rem-based `max-w-*` would shrink under the site's 85% root font-size below
 * 1440px, leaving this discrete card visibly narrower/indented than the footer.
 */
export function RassenkeuzeStrip() {
  return (
    <section id="rassenkeuze" className="bg-white py-16 lg:py-20" aria-label="Rassenkeuze hulp">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl bg-[var(--ld-accent-soft)] border border-[var(--ld-blue)]/40 px-6 py-7 lg:px-9">
          <div>
            <h2 className="font-heading font-bold text-xl md:text-2xl text-[var(--ld-text)] mb-1 leading-snug">
              Nog geen pup? Of twijfel je over het ras?
            </h2>
            <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
              Doe de gratis rassenkeuze hulp, 10 vragen, wetenschappelijk onderbouwd.
            </p>
          </div>
          <Button variant="brand" pill asChild className="flex-shrink-0">
            <Link href="/rassenkeuze">
              Doe de gratis test
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
