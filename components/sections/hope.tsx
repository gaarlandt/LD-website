import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Button, Eyebrow } from "@/components/ui";
import { CheckCircle, VideoCamera, BookOpen, DeviceMobile, Users } from "@phosphor-icons/react/dist/ssr";

const outcomes = [
  {
    icon: CheckCircle,
    title: "Jij weet elke dag wat je doet.",
    description:
      "Rust en houvast in plaats van twijfel — een aanpak die stap voor stap met je pup meegroeit.",
  },
  {
    icon: VideoCamera,
    title: "Echte uitleg van gecertificeerde trainers.",
    description:
      "Waarom gedrag gebeurt en hoe je het aanpakt. Geen quickfixes, wel echte resultaten.",
  },
  {
    icon: DeviceMobile,
    title: "Leer overal, ook onderweg.",
    description:
      "De video tijdens de wandeling, de audioles in de auto. Op je telefoon, waar je ook bent.",
  },
  {
    icon: Users,
    title: "Een community die je begrijpt.",
    description:
      "Praat met andere puppy-eigenaren die hetzelfde meemaken. Geen oordeel, wel herkenning en steun.",
  },
];

export function Hope() {
  return (
    <SectionWrapper className="bg-white" id="wat-je-krijgt">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: image — clickable link to puppyagenda page */}
        <Link
          href="/puppyagenda"
          aria-label="Puppyagenda voor elke week"
          className="relative order-2 lg:order-1 block group cursor-pointer"
        >
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] transition-transform duration-300 motion-safe:group-hover:scale-[1.01]">
            <OptimizedImage
              src="/images/hope.jpeg"
              alt="Hondeneigenaar geniet thuis met zijn hond"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {/* Floating callout — repeats the link's aria-label, so hide it from AT */}
          <div
            className="absolute -bottom-5 right-4 lg:-right-5 bg-[var(--ld-lime)] rounded-2xl p-4 lg:p-5 shadow-[var(--ld-sh-3)] max-w-[180px] lg:max-w-[200px]"
            aria-hidden="true"
          >
            <BookOpen size={20} className="text-[var(--ld-green)] mb-2" />
            <p className="text-sm font-semibold text-[var(--ld-text)] leading-snug">
              Puppyagenda voor elke week
            </p>
          </div>
        </Link>

        {/* Right: outcomes */}
        <div className="order-1 lg:order-2">
          <Eyebrow tone="brand" className="block mb-4">
            Wat je krijgt
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-5">
            Zo ziet je leven eruit
            <br />
            met Let&apos;s Dog.
          </h2>
          <p className="text-[var(--ld-text-muted)] text-lg mb-10 leading-relaxed">
            Geen tegenstrijdige adviezen meer. Eén welzijnsgerichte aanpak, stap voor stap, op jouw tempo.
          </p>

          <div className="space-y-7">
            {outcomes.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--ld-beige)] flex items-center justify-center mt-0.5">
                  <Icon size={18} className="text-[var(--ld-green)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--ld-text)] mb-1">{title}</h3>
                  <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Button variant="brand" pill asChild>
              <Link href="/prijzen">Start vandaag</Link>
            </Button>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
