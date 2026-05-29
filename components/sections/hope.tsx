import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/utils";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { CheckCircle2, Video, BookOpen, Headphones, Users } from "lucide-react";

const outcomes = [
  {
    icon: CheckCircle2,
    title: "Jij weet elke dag wat je doet.",
    description:
      "De puppyagenda vertelt je precies wat je moet doen, lezen en bekijken — voor en tijdens de puppyfase.",
  },
  {
    icon: Video,
    title: "Videolessen die je écht verder helpen.",
    description:
      "Gecertificeerde trainers leggen uit waarom gedrag gebeurt en hoe je het aanpakt. Geen quickfixes, wel echte resultaten.",
  },
  {
    icon: Headphones,
    title: "Audio-lessen voor onderweg.",
    description:
      "Luister tijdens een wandeling of autorit. Kennis die je meeneemt in het dagelijks leven.",
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
          aria-label="Bekijk de puppyagenda"
          className="relative order-2 lg:order-1 block group cursor-pointer"
        >
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] transition-transform duration-300 group-hover:scale-[1.01]">
            <Image
              src={asset("/images/hope.jpeg")}
              alt="Hondeneigenaar geniet thuis met zijn hond"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-5 right-4 lg:-right-5 bg-[#DFF0C3] rounded-2xl p-4 lg:p-5 shadow-lg max-w-[180px] lg:max-w-[200px] transition-shadow duration-300 group-hover:shadow-xl">
            <BookOpen size={20} className="text-[#75876D] mb-2" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-[#141414] leading-snug">
              Puppyagenda voor elke week
            </p>
          </div>
        </Link>

        {/* Right: outcomes */}
        <div className="order-1 lg:order-2">
          <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
            Wat je krijgt
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] leading-tight mb-5">
            Zo ziet je leven eruit
            <br />
            met Let&apos;s Dog.
          </h2>
          <p className="text-[#141414]/60 text-lg mb-10 leading-relaxed">
            Geen tegenstrijdige adviezen meer. Eén welzijnsgerichte aanpak, stap voor stap, op jouw tempo.
          </p>

          <div className="space-y-7">
            {outcomes.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#EFE8E4] flex items-center justify-center mt-0.5">
                  <Icon size={18} className="text-[#75876D]" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#141414] mb-1">{title}</h3>
                  <p className="text-[#141414]/60 text-[15px] leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#75876D] text-white text-[16px] font-semibold hover:bg-[#65775D] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            >
              Start vandaag
            </a>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
