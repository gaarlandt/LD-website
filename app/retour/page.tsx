import type { Metadata } from "next";
import { SectionWrapper } from "@/components/shared/section-wrapper";

export const metadata: Metadata = {
  title: "Retour- en annuleringsbeleid — Let's Dog",
  description:
    "Hoe je een product retourneert of een aankoop annuleert bij Let's Dog. Termijnen, voorwaarden en het retourproces.",
};

type Section = {
  title: string;
  content: string;
  items?: string[];
  contact?: boolean;
};

const sections: Section[] = [
  {
    title: "1. Herroepingsrecht voor fysieke producten",
    content:
      "Klanten hebben 14 dagen bedenktijd na ontvangst van fysieke producten, mits deze ongebruikt en in originele staat blijven.",
  },
  {
    title: "2. Digitale producten",
    content:
      "Bij de aankoop van digitale cursussen vervalt het herroepingsrecht zodra de klant toegang krijgt tot de content.",
  },
  {
    title: "3. Retourprocedure",
    content:
      "Neem contact op via support@letsdog.nl en start de retour binnen 14 dagen. De kosten van het retour zenden zijn voor de klant.",
  },
  {
    title: "4. Uitzonderingen",
    content:
      "Producten op maat, geopend diervoer en al bekeken digitale modules kunnen niet worden geretourneerd.",
  },
  {
    title: "5. Terugbetaling",
    content:
      "Na goedkeuring wordt het volledige aankoopbedrag binnen 14 dagen teruggestort op de oorspronkelijke betaalmethode.",
  },
  {
    title: "6. Klachtenprocedure",
    content:
      "Ontevreden klanten kunnen contact opnemen via support@letsdog.nl over een retour. Wij reageren binnen 5 werkdagen.",
  },
  {
    title: "Contact",
    content:
      "Vragen over een retour of annulering? Neem contact met ons op.",
    contact: true,
  },
];

export default function Retour() {
  return (
    <>
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Juridisch
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight">
            Retour- en annuleringsbeleid
          </h1>
        </div>
      </div>

      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          {sections.map(({ title, content, items, contact }) => (
            <div key={title}>
              <h2 className="font-heading font-bold text-2xl text-[#141414] mb-4">
                {title}
              </h2>
              <p className="text-[#141414]/70 text-[16px] leading-relaxed">
                {content}
              </p>
              {items && (
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[#141414]/70 text-[15px]"
                    >
                      <span className="text-[#75876D] mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {contact && (
                <div className="mt-4 space-y-1 text-[#141414]/70 text-[15px]">
                  <p>
                    E-mail:{" "}
                    <a href="mailto:support@letsdog.nl" className="text-[#75876D] underline">
                      support@letsdog.nl
                    </a>
                  </p>
                  <p>
                    Algemeen:{" "}
                    <a href="mailto:mail@letsdog.nl" className="text-[#75876D] underline">
                      mail@letsdog.nl
                    </a>
                  </p>
                  <p>
                    Telefoon:{" "}
                    <a href="tel:0857444161" className="text-[#75876D] underline">
                      085 744 4161
                    </a>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
