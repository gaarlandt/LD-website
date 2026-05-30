import { pageMetadata } from "@/lib/seo";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Calendar, Video, BookOpen, CheckSquare } from "lucide-react";
import { PuppyPhases } from "@/components/sections/puppy-phases";

export const metadata = pageMetadata({
  title: "Puppyagenda — Let's Dog",
  description:
    "Alles wat je moet doen, lezen en bekijken voor en tijdens de puppyfase. Gestructureerd week voor week.",
  path: "/puppyagenda/",
});

const features = [
  { icon: Calendar, text: "Week-voor-week structuur" },
  { icon: Video, text: "Videolessen per fase" },
  { icon: BookOpen, text: "Leesmateriaal op maat" },
  { icon: CheckSquare, text: "Checklists die je bijhoudt" },
];

export default function Puppyagenda() {
  return (
    <>
      {/* Hero */}
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Puppyagenda</p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight max-w-2xl mb-4">
            Alles wat je moet doen, lezen en bekijken. Per week.
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            Geen losse tips of willekeurige adviezen. Een helder pad van voor de komst van je pup tot het einde van de puppyfase.
          </p>
        </div>
      </div>

      {/* Feature highlights */}
      <SectionWrapper className="bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center text-center gap-3 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/80 hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#75876D] flex items-center justify-center">
                <Icon size={20} className="text-white" strokeWidth={1.75} />
              </div>
              <span className="text-[15px] font-medium text-[#141414]">{text}</span>
            </div>
          ))}
        </div>

        {/* Phases with sticky scroll */}
        <PuppyPhases />
      </SectionWrapper>

      {/* Image + CTA */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <OptimizedImage
              src="/images/beagle.jpeg"
              alt="Puppy speelt buiten"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="font-heading font-bold text-3xl text-[#141414] mb-4 leading-tight">
              De volledige agenda staat klaar in de web app.
            </h2>
            <p className="text-[#141414]/60 text-lg mb-8 leading-relaxed">
              Maak een account en bekijk de preview. Upgrade naar volledig voor toegang tot alle weken, videolessen en audio-lessen.
            </p>
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#75876D] text-white text-[16px] font-semibold hover:bg-[#65775D] transition-all duration-200 cursor-pointer"
            >
              Bekijk de agenda in de app
            </a>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
