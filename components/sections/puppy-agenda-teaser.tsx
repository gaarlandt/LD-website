import Link from "next/link";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Card, Eyebrow, Button } from "@/components/ui";
import {
  House,
  SunHorizon,
  PawPrint,
  Plant,
  ListChecks,
  Play,
  Headphones,
  Heartbeat,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

type LessonType = "checklist" | "video" | "audio" | "gezondheid";

// Lesson-type chips. Checklist/video/audio map to brand tokens; "gezondheid"
// uses a documented off-palette health-coral (#C2554B) matching the provided
// health icon — same precedent as the off-palette star-gold in trust.tsx.
const lessonMeta = {
  checklist: { icon: ListChecks, label: "checklist", wrap: "bg-[var(--ld-green)]/15", color: "text-[var(--ld-green)]" },
  video: { icon: Play, label: "video", wrap: "bg-[var(--ld-peach)]/25", color: "text-[var(--ld-peach-deep)]" },
  audio: { icon: Headphones, label: "audio", wrap: "bg-[var(--ld-blue)]/30", color: "text-[var(--ld-accent-ink)]" },
  gezondheid: { icon: Heartbeat, label: "gezondheid", wrap: "bg-[#C2554B]/15", color: "text-[#C2554B]" },
};

const phases: {
  number: string;
  icon: typeof House;
  title: string;
  week: string;
  description: string;
  types: LessonType[];
  lessons: number;
}[] = [
  {
    number: "01",
    icon: House,
    title: "Vóór de komst",
    week: "Week −4 t/m −1",
    description:
      "De voorbereidingsfase, terwijl je pup nog bij de fokker is. Je maakt je huis klaar en weet precies wat je nodig hebt.",
    types: ["checklist", "gezondheid", "video"],
    lessons: 15,
  },
  {
    number: "02",
    icon: SunHorizon,
    title: "De eerste week thuis",
    week: "Week 1",
    description:
      "Je pup komt thuis. Een rustig dagschema, de eerste nachten en de start van zindelijkheids- en benchtraining.",
    types: ["checklist", "audio", "video", "gezondheid"],
    lessons: 8,
  },
  {
    number: "03",
    icon: PawPrint,
    title: "Wennen & socialiseren",
    week: "Week 2 t/m 4",
    description:
      "De eerste socialisatiefase. Je pup ontdekt de wereld, leert de basiscommando’s en wendt stap voor stap aan alleen zijn.",
    types: ["checklist", "video", "audio"],
    lessons: 10,
  },
  {
    number: "04",
    icon: Plant,
    title: "Ontdekken & groeien",
    week: "Week 5 t/m 12",
    description:
      "De ontdekkingsfase. De wereld wordt spannender, je pup wisselt van tanden en leert zelfstandig te zijn — ook als het even tegenzit.",
    types: ["checklist", "gezondheid", "video", "audio"],
    lessons: 20,
  },
];

const legendOrder: LessonType[] = ["checklist", "video", "audio", "gezondheid"];

export function PuppyAgendaTeaser() {
  return (
    <SectionWrapper className="bg-[var(--ld-bg-sunken)]" id="puppyagenda">
      {/* Header: eyebrow + heading + total pill (left), secondary CTA (right) */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <Eyebrow tone="brand" className="block mb-4">
            De puppyagenda
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight">
            Van voorbereiding
            <br />
            tot ontdekkingsfase
          </h2>
          <span className="inline-flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full bg-[var(--ld-green)]/10 text-[var(--ld-green-ink)] text-sm font-semibold">
            <Sparkle size={15} weight="fill" className="text-[var(--ld-green)]" />
            Meer dan 150 lessen
          </span>
        </div>
        <Button variant="secondary" pill asChild>
          <Link href="/puppyagenda">
            Bekijk de hele agenda
            <ArrowRight size={16} />
          </Link>
        </Button>
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {phases.map(({ number, icon: PhaseIcon, title, week, description, types, lessons }) => (
          <Card key={number} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="w-11 h-11 rounded-xl bg-[var(--ld-beige)] flex items-center justify-center">
                <PhaseIcon size={20} className="text-[var(--ld-green)]" />
              </div>
              <span className="font-heading font-bold text-lg text-[var(--ld-text)]/15">{number}</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-[var(--ld-text)] mb-1 leading-snug">{title}</h3>
            <p className="text-sm font-semibold text-[var(--ld-green)] mb-3">{week}</p>
            <p className="text-[var(--ld-text-muted)] text-[14px] leading-relaxed flex-grow pb-4 mb-4 border-b border-[var(--ld-border)]">
              {description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {types.map((t) => {
                  const { icon: TypeIcon, label, wrap, color } = lessonMeta[t];
                  return (
                    <span
                      key={t}
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${wrap}`}
                      title={label}
                    >
                      <TypeIcon size={13} weight="bold" className={color} />
                    </span>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-[var(--ld-text-subtle)]">{lessons} lessen</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-10 text-sm text-[var(--ld-text-muted)]">
        {legendOrder.map((t) => {
          const { icon: TypeIcon, label, wrap, color } = lessonMeta[t];
          return (
            <span key={t} className="inline-flex items-center gap-2">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center ${wrap}`}>
                <TypeIcon size={11} weight="bold" className={color} />
              </span>
              {label}
            </span>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
