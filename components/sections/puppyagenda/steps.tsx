import {
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree,
} from "@phosphor-icons/react/dist/ssr";
import { Container, Eyebrow } from "@/components/ui";

const steps = [
  {
    Icon: NumberCircleOne,
    title: "Kies je startpunt",
    body: "Vóór de komst of midden in de puppyfase, de agenda begint waar jij bent.",
  },
  {
    Icon: NumberCircleTwo,
    title: "Werk je week af",
    body: "Korte video’s, leesstof en audio. Vink af wat je hebt gedaan.",
  },
  {
    Icon: NumberCircleThree,
    title: "Zie je voortgang groeien",
    body: "Elke afgeronde les telt mee. Je ziet rustig hoe ver je al bent.",
  },
];

/** "Zo werkt het" — three numbered steps on white. */
export function PaSteps() {
  return (
    <section className="border-t border-[var(--ld-border)] bg-white py-16">
      <Container>
        <Eyebrow tone="brand">Zo werkt het</Eyebrow>
        <div className="mt-7 grid grid-cols-1 gap-7 md:grid-cols-3">
          {steps.map(({ Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <Icon size={34} className="shrink-0 text-[var(--ld-green)]" aria-hidden />
              <div>
                <h3 className="font-heading text-xl font-bold text-[var(--ld-text)]">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.55] text-[var(--ld-text-muted)]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
