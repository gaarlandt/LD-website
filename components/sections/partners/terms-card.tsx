import { ReactNode } from "react";
import { SectionWrapper } from "@/components/shared/section-wrapper";

const rows: ReactNode[] = [
  <>
    <b className="font-bold">Gratis meedoen</b> — voor ambassadeurs én
    UGC-makers.
  </>,
  <>
    <b className="font-bold">Je eigen code</b>, of een betaalde UGC-opdracht.
  </>,
  <>
    <b className="font-bold">Verdien mee</b> — zonder targets of verplichtingen.
  </>,
  <>
    <b className="font-bold">Persoonlijk contact</b>, geen ingewikkelde
    dashboards.
  </>,
];

// Forest card on a beige section. Plain token-styled div, not <Card>: the design
// wants the xl radius and much roomier padding than .ld-card fixes (KTD6).
export function PartnersTerms() {
  return (
    <SectionWrapper id="voorwaarden" className="bg-[var(--ld-beige)]">
      <div className="max-w-3xl mx-auto rounded-[var(--ld-r-xl)] bg-[var(--ld-forest)] text-[var(--ld-on-forest)] px-8 py-12 lg:px-11 lg:py-12 text-center">
        <h2 className="font-heading font-bold text-3xl mb-6 tracking-tight">
          Wat je eraan hebt
        </h2>
        <p className="text-[17px] leading-relaxed opacity-90 max-w-lg mx-auto mb-8">
          Meedoen is gratis en vrijblijvend. Wat je precies krijgt en hoe de
          samenwerking eruitziet, bespreken we rustig samen — per mail, op maat
          voor jou.
        </p>
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-left max-w-lg mx-auto"
          role="list"
        >
          {rows.map((row, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span
                className="font-bold flex-shrink-0 text-[var(--ld-peach)]"
                aria-hidden="true"
              >
                ✦
              </span>
              <span className="text-[15px] leading-relaxed opacity-90">
                {row}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionWrapper>
  );
}
