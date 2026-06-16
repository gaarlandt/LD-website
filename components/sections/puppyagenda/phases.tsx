import { Container, Eyebrow } from "@/components/ui";
import { PhaseExplorer } from "./phase-explorer";

/**
 * "De vier fases" — intro header (no trailing CTA, per owner direction) above
 * the interactive curriculum explorer.
 */
export function PaPhases() {
  return (
    <section className="border-t border-[var(--ld-border)] bg-white py-20">
      <Container>
        <div className="max-w-[560px]">
          <Eyebrow tone="brand">De eerste 6 fases</Eyebrow>
          <h2 className="mt-3 font-heading text-[clamp(28px,3.2vw,42px)] font-bold leading-[1.1] tracking-tight text-[var(--ld-text)]">
            Van voorbereiding tot puberteit
          </h2>
        </div>
        <div className="mt-10">
          <PhaseExplorer />
        </div>
      </Container>
    </section>
  );
}
