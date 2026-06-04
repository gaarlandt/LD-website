import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Card, Eyebrow } from "@/components/ui";
import { MagnifyingGlass, Moon, Question } from "@phosphor-icons/react/dist/ssr";

const problems = [
  {
    icon: MagnifyingGlass,
    title: "De ene zegt dit, de ander dat.",
    description:
      "Je zoekt online en krijgt tien verschillende antwoorden. Welk advies klopt? Wat past bij jouw hond? Je weet het niet meer.",
  },
  {
    icon: Moon,
    title: "Je pup bijt, blaft of slaapt niet.",
    description:
      "Je doet je best, maar het lukt niet. Je bent moe, twijfelt aan jezelf, en vraagt je af of het ooit beter wordt.",
  },
  {
    icon: Question,
    title: "Je weet niet of je het goed doet.",
    description:
      "Niemand heeft je verteld wat normaal is. Je twijfelt bij élke stap. Is dit gedrag oké? Moet ik ingrijpen? Wanneer?",
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
        Een nieuwe pup is geweldig.
        <br />
        En soms ook gewoon heel zwaar.
      </h2>
      <p className="text-[var(--ld-text-muted)] text-lg mb-14 max-w-xl">
        Je bent niet de enige. Bijna elke puppy-eigenaar herkent dit.
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
