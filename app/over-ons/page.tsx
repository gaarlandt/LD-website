import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { JsonLd } from "@/components/shared/json-ld";
import { personLd } from "@/lib/structured-data";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { ShieldCheck, Heart, BookOpen, Search, Award } from "lucide-react";

export const metadata = pageMetadata({
  title: "Over ons — Let's Dog",
  description:
    "Leer Elien kennen — gecertificeerde hondengedragstherapeut en oprichtster van Let's Dog. Welzijnsgericht, wetenschappelijk onderbouwd.",
  path: "/over-ons/",
});

const methodCards = [
  {
    icon: ShieldCheck,
    title: "Geen fysieke correcties — nooit",
    description:
      "We werken uitsluitend met positieve bekrachtiging. Straf en dwang zijn geen onderdeel van onze methode, punt.",
  },
  {
    icon: Heart,
    title: "Welzijn van hond én eigenaar centraal",
    description:
      "Een goede band met je hond begint bij jouw welzijn. We begeleiden eigenaar én hond — niet de een zonder de ander.",
  },
  {
    icon: BookOpen,
    title: "Wetenschappelijk onderbouwd",
    description:
      "Onze aanpak is gebaseerd op actueel gedragsonderzoek en de principes van leertheorie — geen mythen, geen buikgevoel.",
  },
  {
    icon: Search,
    title: "Toegankelijk voor elk ras",
    description:
      "De methode werkt voor elke hond, ongeacht ras of grootte. We houden wél rekening met individuele verschillen.",
  },
];

const certs = [
  {
    name: "NVGH-lid",
    desc: "Nederlandse Vereniging voor Gedragshulpverleners Honden — de beroepsvereniging voor gedragsprofessionals.",
  },
  {
    name: "Raad van Beheer",
    desc: "Erkend opleider puppycursussen door de Raad van Beheer — de officiële stamboekhouder voor rashonden in Nederland.",
  },
];

export default function OverOns() {
  return (
    <>
      <JsonLd data={personLd()} />

      {/* Hero — beige split */}
      <section className="relative bg-[#EFE8E4] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[#141414] leading-[1.05] tracking-tight mb-7">
              Expertise én empathie.{" "}
              <span className="text-[#FFA580]">Niet één van de twee.</span>
            </h1>
            <p className="text-[#141414]/70 text-lg leading-relaxed mb-8 max-w-lg">
              Let&apos;s Dog is opgericht door Elien, gecertificeerd
              hondengedragstherapeut. Na honderden eigenaren te hebben begeleid
              bouwde ze een methode die aansluit bij hoe honden écht leren —
              zonder dwang, zonder schuldgevoel.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/prijzen"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#75876D] text-white font-semibold text-[16px] hover:bg-[#65775D] transition-colors duration-200"
              >
                Start vandaag
              </Link>
              <a
                href="#verhaal"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-[#75876D] text-[#162A0E] font-semibold text-[16px] hover:bg-[#75876D]/10 transition-colors duration-200"
              >
                Lees haar verhaal
              </a>
            </div>

            {/* Cert badges */}
            <div className="flex flex-wrap gap-3">
              {[
                { dot: "#75876D", label: "Gecertificeerd gedragstherapeut" },
                { dot: "#FFA580", label: "NVGH-erkend" },
                { dot: "#75876D", label: "Geen dwang — nooit" },
              ].map(({ dot, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#141414] text-sm font-semibold"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dot }}
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Image column */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[5/6] bg-[#E8DDD6]">
              <OptimizedImage
                src="/images/elien.jpeg"
                alt="Elien, oprichtster van Let's Dog"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/20 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-6 left-6">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFA580] text-[#141414] text-sm font-bold shadow-lg whitespace-nowrap">
                Elien · oprichtster
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Mijn verhaal */}
      <SectionWrapper id="verhaal" className="bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
            Mijn verhaal
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] leading-tight mb-8">
            Ik heb gezien wat er mis kan gaan.{" "}
            <span className="text-[#141414]/60">Dat hoeft niet.</span>
          </h2>
          <div className="space-y-5 text-[#141414]/70 text-[16px] leading-relaxed mb-10">
            <p>
              Als gecertificeerde hondengedragstherapeut heb ik honderden
              eigenaren begeleid — van wanhopige beginners tot mensen wier pup
              al maanden problemen vertoonde. Eén ding zag ik steeds terug: ze
              hadden niet het juiste hulpmiddel op het juiste moment.
            </p>
            <p>
              Let&apos;s Dog is gebouwd op wat ik in de praktijk heb geleerd.
              Structuur, duidelijkheid, en een methode die aansluit bij hoe
              honden écht leren — zonder dwang, zonder schuldgevoel.
            </p>
          </div>
          {/* Pull-quote */}
          <blockquote className="border-l-4 border-[#FFA580] pl-6 py-2">
            <p className="font-heading font-bold text-2xl md:text-3xl text-[#141414] leading-snug italic">
              &ldquo;Je pup leert niet sneller als jij harder je best doet. Hij
              leert sneller als jij begrijpt wat hij nodig heeft.&rdquo;
            </p>
          </blockquote>
        </div>
      </SectionWrapper>

      {/* Onze methode */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
            Onze methode
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] leading-tight mb-4">
            Waar Let&apos;s Dog op gebouwd is
          </h2>
          <p className="text-[#141414]/60 text-lg max-w-xl mx-auto">
            Vier principes die bij alles wat we maken het uitgangspunt zijn —
            van de puppyagenda tot het persoonlijke advies.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {methodCards.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/80 hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all duration-300 group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#DFF0C3] flex items-center justify-center mb-5 group-hover:bg-[#75876D]/20 transition-colors duration-200">
                <Icon size={20} className="text-[#75876D]" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#141414] mb-3 leading-snug">
                {title}
              </h3>
              <p className="text-[#141414]/65 text-[15px] leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Certifications */}
      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
              Certificeringen
            </p>
            <h2 className="font-heading font-bold text-3xl text-[#141414] mb-3">
              Erkend. Wetenschappelijk. Betrouwbaar.
            </h2>
            <p className="text-[#141414]/60 text-[16px]">
              Let&apos;s Dog is opgezet door een erkend professional en
              aangesloten bij de toonaangevende Nederlandse instanties.
            </p>
          </div>
          <div className="space-y-4 mb-10">
            {certs.map(({ name, desc }) => (
              <div
                key={name}
                className="flex items-start gap-5 bg-[#EFE8E4]/60 rounded-2xl p-6 border border-[#141414]/8"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <Award size={22} className="text-[#75876D]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-heading font-bold text-lg text-[#141414] mb-1">
                    {name}
                  </p>
                  <p className="text-[#141414]/60 text-[15px] leading-relaxed">
                    {desc}
                  </p>
                </div>
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
        </div>
      </SectionWrapper>

      {/* Closing CTA — ends light (R2) */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-10 md:p-14 text-center border border-[#141414]/8 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-[#141414]/60 text-lg mb-8 max-w-md mx-auto">
            Meld je aan en start direct met de puppyagenda, videolessen en de
            community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/prijzen"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#75876D] text-white text-[16px] font-bold hover:bg-[#65775D] transition-colors duration-200"
            >
              Start vandaag
            </Link>
            <a
              href="https://app.letsdog.nl/consult/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-[#75876D] text-[#162A0E] text-[16px] font-semibold hover:bg-[#75876D]/10 transition-colors duration-200"
            >
              Plan een consult
            </a>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
