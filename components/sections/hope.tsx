import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Eyebrow } from "@/components/ui";
import { CheckCircle, VideoCamera, DeviceMobile, Users } from "@phosphor-icons/react/dist/ssr";

const outcomes = [
  {
    icon: CheckCircle,
    title: "Jij weet elke dag wat je doet.",
    description:
      "Rust en houvast, in plaats van twijfel. De training en aanpak die stap voor stap met je pup meegroeit.",
  },
  {
    icon: VideoCamera,
    title: "Duidelijke uitleg van gecertificeerde trainers.",
    description:
      "Let's dog kijkt naar de oorzaken van gedrag en leert je hoe je ermee om moet gaan. Geen quickfixes, maar echte resultaten.",
  },
  {
    icon: DeviceMobile,
    title: "Leer met het hele gezin.",
    description:
      "Bekijk samen de video's zodat iedereen op dezelfde wijze traint en opvoedt.",
  },
  {
    icon: Users,
    title: "Een community waar je echt wat aan hebt.",
    description:
      "Praat met andere puppy-eigenaren, trainers en gedragstherapeuten. Geen oordeel, wel erkenning en steun.",
  },
];

export function Hope() {
  return (
    <SectionWrapper className="bg-white" id="wat-je-krijgt">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: image — clickable link to puppyagenda page */}
        <Link
          href="/puppycursus"
          aria-label="Bekijk de puppycursus"
          className="relative order-1 block group cursor-pointer"
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
        </Link>

        {/* Right: outcomes */}
        <div className="order-2">
          <Eyebrow tone="brand" className="block mb-4">
            Wat je krijgt
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-5">
            Zo ziet je leven eruit
            <br />
            met Let&apos;s dog.
          </h2>
          <p className="text-[var(--ld-text-muted)] text-lg mb-10 leading-relaxed">
            Geen tegenstrijdige adviezen meer. Gerichte adviezen en training, die je rust, duidelijkheid en vertrouwen geeft. Stap voor stap.
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
        </div>
      </div>
    </SectionWrapper>
  );
}
