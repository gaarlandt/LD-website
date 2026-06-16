import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Card, Eyebrow } from "@/components/ui";
import { MagnifyingGlass, Moon, Question } from "@phosphor-icons/react/dist/ssr";

const problems = [
  {
    icon: MagnifyingGlass,
    title: "De een zegt dit, de ander dat.",
    description:
      "Iedereen geeft een ander advies en ook online krijg je tien verschillende antwoorden op jouw vragen. Welk advies is betrouwbaar en werkt echt?",
  },
  {
    icon: Moon,
    title: "Je pup bijt alleen maar, blaft enorm of slaapt slecht?",
    description:
      "Je doet zo je best, maar je krijgt het gedrag niet onder controle. Je bent moe en twijfelt aan jezelf en vraagt je af of het wel goed gaat komen.",
  },
  {
    icon: Question,
    title: "Je weet niet of je het goed doet.",
    description:
      "Je twijfelt bij elke stap. Is dit gedrag wel oké? Wat kan ik het beste doen?",
  },
];

export function Problem() {
  return (
    <SectionWrapper className="bg-[var(--ld-green-soft)]" id="herkenning">
      {/* Section label */}
      <Eyebrow tone="brand" className="block mb-4">
        Herkenbaar?
      </Eyebrow>

      <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-4 max-w-xl">
        Een pup is superschattig.
        <br />
        Maar kan ook overweldigend zijn.
      </h2>
      <p className="text-[var(--ld-text-muted)] text-lg mb-14 max-w-xl">
        Heel herkenbaar. Door goede begeleiding wordt het echt weer overzichtelijk en komt er rust.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {problems.map(({ icon: Icon, title, description }) => (
          <Card key={title} hover className="group">
            <div className="w-11 h-11 rounded-xl bg-[var(--ld-lime)] flex items-center justify-center mb-5 group-hover:bg-[var(--ld-green)]/20 transition-colors duration-200">
              <Icon size={20} className="text-[var(--ld-green)]" />
            </div>
            <h3 className="font-heading font-bold text-lg text-[var(--ld-text)] mb-3 leading-snug">
              {title}
            </h3>
            <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
              {description}
            </p>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}
