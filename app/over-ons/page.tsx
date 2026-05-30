import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { CheckCircle2, Award } from "lucide-react";

export const metadata = pageMetadata({
  title: "Over ons — Let's Dog",
  description:
    "Leer Elien kennen — gecertificeerde hondengedragstherapeut en oprichtster van Let's Dog. Welzijnsgericht, wetenschappelijk onderbouwd.",
  path: "/over-ons/",
});

const values = [
  "Geen fysieke correcties — nooit",
  "Welzijn van hond én eigenaar staat centraal",
  "Wetenschappelijk onderbouwde methodes",
  "Toegankelijk voor elke eigenaar, elk ras",
];

const certs = [
  { name: "NVGH", desc: "Nederlandse Vereniging voor Gedragshulpverleners Honden" },
  { name: "Raad van Beheer", desc: "Erkend opleider puppycursussen" },
];

export default function OverOns() {
  return (
    <>
      {/* Hero */}
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Over ons</p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight max-w-xl">
            Expertise én empathie. Niet één van de twee.
          </h1>
        </div>
      </div>

      {/* Elien */}
      <SectionWrapper className="bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
            <Image
              src={asset("/images/elien.jpeg")}
              alt="Elien met een puppy"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
              Elien — oprichtster
            </p>
            <h2 className="font-heading font-bold text-3xl text-[#141414] mb-6 leading-tight">
              Ik heb gezien wat er mis kan gaan. Dat hoeft niet.
            </h2>
            <div className="space-y-4 text-[#141414]/70 text-[16px] leading-relaxed">
              <p>
                Als gecertificeerde hondengedragstherapeut heb ik honderden eigenaren begeleid — van wanhopige beginners tot mensen wier pup al maanden problemen vertoonde. Eén ding zag ik steeds terug: ze hadden niet het juiste hulpmiddel op het juiste moment.
              </p>
              <p>
                Let&apos;s Dog is gebouwd op wat ik in de praktijk heb geleerd. Structuur, duidelijkheid, en een methode die aansluit bij hoe honden écht leren — zonder dwang, zonder schuldgevoel.
              </p>
              <p>
                Je pup leert niet sneller als jij harder je best doet. Hij leert sneller als jij begrijpt wat hij nodig heeft.
              </p>
            </div>

            {/* Values */}
            <div className="mt-8 space-y-3">
              {values.map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-[#75876D] flex-shrink-0" strokeWidth={2} />
                  <span className="text-[15px] text-[#141414]/80">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Certifications */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">Certificeringen</p>
          <h2 className="font-heading font-bold text-3xl text-[#141414]">Erkend. Wetenschappelijk. Betrouwbaar.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
          {certs.map(({ name, desc }) => (
            <div key={name} className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/80 hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all duration-300 text-center">
              <Award size={32} className="text-[#75876D] mx-auto mb-4" strokeWidth={1.5} />
              <p className="font-heading font-bold text-xl text-[#141414] mb-2">{name}</p>
              <p className="text-[#141414]/55 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Image
            src={asset("/images/NVGH Logo.jpeg")}
            alt="NVGH en Raad van Beheer certificeringslogo's"
            width={400}
            height={120}
            className="max-w-xs md:max-w-sm h-auto"
          />
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper className="bg-[#162A0E] text-center">
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">
          Klaar om te beginnen?
        </h2>
        <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
          Meld je aan en start vandaag nog met de puppyagenda en videolessen.
        </p>
        <a
          href="https://app.letsdog.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-8 py-4 rounded-full bg-[#FFA580] text-[#141414] text-[16px] font-bold hover:bg-[#ff9060] transition-all duration-200 cursor-pointer"
        >
          Start vandaag
        </a>
      </SectionWrapper>
    </>
  );
}
