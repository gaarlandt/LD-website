import { ReactNode } from "react";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { PartnersSectionHead } from "./section-head";

const steps: { num: string; title: string; body: ReactNode }[] = [
  {
    num: "1",
    title: "Meld je gratis aan",
    body: (
      <>
        Stuur een e-mail naar{" "}
        <span className="font-bold text-[var(--ld-green-ink)]">
          creators@letsdog.nl
        </span>{" "}
        en vertel kort iets over jezelf en je hond. We nemen persoonlijk contact
        met je op om te bespreken wat bij je past.
      </>
    ),
  },
  {
    num: "2",
    title: "We bespreken wat past",
    body: (
      <>
        In een persoonlijk gesprek kijken we welke samenwerking bij je past: je
        eigen code delen, content maken, of allebei. Je krijgt gratis toegang tot
        het hele platform.
      </>
    ),
  },
  {
    num: "3",
    title: "Aan de slag & verdien mee",
    body: (
      <>
        Je gaat aan de slag op de manier die bij je past en verdient mee. De
        vergoeding regelen we aan het eind van elke maand, persoonlijk en zonder
        gedoe.
      </>
    ),
  },
];

// Step cards are plain token-styled divs, not <Card>: the design wants the xl
// radius, which .ld-card fixes at --ld-r-lg (KTD6).
export function PartnersSteps() {
  return (
    <SectionWrapper id="hoe" className="bg-white">
      <PartnersSectionHead label="Hoe het werkt" title="In drie stappen op weg">
        Geen ingewikkelde tools of dashboards. Jij mailt, we regelen de rest
        samen.
      </PartnersSectionHead>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map(({ num, title, body }) => (
          <div
            key={num}
            className="rounded-[var(--ld-r-xl)] bg-[var(--ld-paper)] border border-[var(--ld-border)] shadow-[var(--ld-sh-2)] p-8 lg:p-9"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--ld-green-soft)] text-[var(--ld-green-ink)] flex items-center justify-center font-heading font-bold text-lg mb-5">
              {num}
            </div>
            <h3 className="font-heading font-bold text-xl text-[var(--ld-text)] mb-3 leading-snug">
              {title}
            </h3>
            <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
              {body}
            </p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
