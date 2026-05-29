import type { Metadata } from "next";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { ArrowRight, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Rassenkeuze hulp — Welk ras past bij jou? | Let's Dog",
  description:
    "Beantwoord 10 korte vragen en ontdek welk hondenras het beste bij jouw levensstijl past. Gratis, wetenschappelijk onderbouwd rasadvies.",
};

export default function Rassenkeuze() {
  return (
    <>
      {/* Short green hero */}
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Rassenkeuze hulp
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight max-w-xl">
            Welk ras past bij jou?
          </h1>
        </div>
      </div>

      {/* Content + Image side by side */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-[#141414]/70 text-[16px] leading-relaxed mb-4">
              Beantwoord 10 korte vragen over je levensstijl, woonruimte en ervaring. Je krijgt direct een persoonlijk rasadvies — gratis en vrijblijvend.
            </p>
            <p className="text-[#141414]/70 text-[16px] leading-relaxed mb-8">
              Wetenschappelijk onderbouwd en ontwikkeld met gecertificeerde gedragstherapeuten.
            </p>
            <a
              href="#quiz"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#75876D] text-white font-semibold text-[16px] hover:bg-[#65775D] transition-all duration-200"
            >
              Start de rassenkeuze hulp
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src={asset("/images/puppy-harness.jpeg")}
              alt="Puppy met tuigje — klaar voor een nieuw avontuur"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </SectionWrapper>

      {/* Iframe */}
      <SectionWrapper className="bg-white" id="quiz">
        <div className="rounded-2xl overflow-hidden border border-[#141414]/10 bg-[#EFE8E4]">
          <iframe
            src="https://keuzehulp.letsdog.nl"
            title="Let's Dog Rassenkeuze hulp — rasadvies quiz"
            className="w-full min-h-[700px] border-0"
            loading="lazy"
            allow="clipboard-write"
          />
        </div>

        <p className="text-center text-sm text-[#141414]/50 mt-6">
          Laadt de rassenkeuze hulp niet?{" "}
          <a
            href="https://keuzehulp.letsdog.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#75876D] underline hover:text-[#65775D]"
          >
            Open in een nieuw tabblad
          </a>
        </p>
      </SectionWrapper>

      {/* Bottom CTA */}
      <SectionWrapper className="bg-[#162A0E] text-center">
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">
          Klaar om te beginnen?
        </h2>
        <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
          Maak een gratis account en begin met je puppytraining — inclusief dagelijkse agenda en videolessen.
        </p>
        <a
          href="https://app.letsdog.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#FFA580] text-[#141414] text-[16px] font-bold hover:bg-[#ff9060] transition-all duration-200 cursor-pointer"
        >
          Maak een gratis account
          <ExternalLink size={16} strokeWidth={2} />
        </a>
      </SectionWrapper>
    </>
  );
}
