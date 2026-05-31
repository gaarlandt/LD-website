import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { ArrowRight, Sparkles } from "lucide-react";

export const metadata = pageMetadata({
  title: "Rassenkeuze hulp — Welk ras past bij jou? | Let's Dog",
  description:
    "Beantwoord 10 korte vragen en ontdek welk hondenras het beste bij jouw levensstijl past. Gratis, wetenschappelijk onderbouwd rasadvies.",
  path: "/rassenkeuze/",
});

const steps = [
  {
    number: "1",
    title: "Beantwoord 10 korte vragen",
    description:
      "Over je woonruimte, beweging, ervaring en wat je zoekt in een hond.",
  },
  {
    number: "2",
    title: "Wij matchen op gedrag & leefstijl",
    description:
      "Wetenschappelijk onderbouwd, ontwikkeld met gecertificeerde gedragstherapeuten.",
  },
  {
    number: "3",
    title: "Ontvang je persoonlijke rasadvies",
    description:
      "Direct in beeld — gratis en vrijblijvend. Geen account nodig.",
  },
];

const exploreCards = [
  {
    eyebrow: "Gids",
    title: "Puppyagenda",
    description:
      "Wat je week voor week doet als de pup er eenmaal is — stap voor stap.",
    href: "/puppyagenda",
  },
  {
    eyebrow: "Aanpak",
    title: "Over ons",
    description:
      "Hoe we welzijnsgericht trainen, en wie de gedragstherapeuten achter Let's Dog zijn.",
    href: "/over-ons",
  },
  {
    eyebrow: "Later",
    title: "Prijzen",
    description:
      "Geen haast. Kijk gerust rond wat een lidmaatschap inhoudt — voor straks.",
    href: "/prijzen",
  },
];

export default function Rassenkeuze() {
  return (
    <>
      {/* Hero — beige split */}
      <section className="relative bg-[#EFE8E4] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-5">
              Rassenkeuze hulp
            </p>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[#141414] leading-[1.05] tracking-tight mb-7">
              Welk ras past <span className="text-[#FFA580]">écht</span> bij jou?
            </h1>
            <p className="text-[#141414]/70 text-lg leading-relaxed mb-8 max-w-lg">
              Beantwoord 10 korte vragen over je leefstijl, woonruimte en ervaring. Je krijgt direct een persoonlijk rasadvies — gratis en vrijblijvend.
            </p>

            <a
              href="#quiz"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#75876D] text-white font-semibold text-[16px] hover:bg-[#65775D] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Start de rassenkeuze hulp
              <ArrowRight size={16} strokeWidth={2} />
            </a>

            {/* Pills */}
            <div className="flex flex-wrap gap-3 mt-7">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#141414] text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#75876D]" />
                Gratis &amp; vrijblijvend
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#141414] text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#FFA580]" />
                ± 2 minuten
              </span>
            </div>
          </div>

          {/* Image column */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[5/6] bg-[#E8DDD6]">
              <OptimizedImage
                src="/images/rassenkeuze.jpeg"
                alt="Hond buiten in het gras — ontdek welk ras bij je past"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/30 via-transparent to-transparent" />
            </div>

            {/* Floating "Persoonlijk rasadvies" badge */}
            <div className="absolute bottom-6 left-6">
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#FFA580] text-[#141414] text-sm font-bold shadow-lg whitespace-nowrap">
                <Sparkles size={15} strokeWidth={2} />
                Persoonlijk rasadvies
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Van vraag naar advies in drie stappen */}
      <SectionWrapper className="bg-white">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
            Zo werkt het
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] leading-tight">
            Van vraag naar advies in drie stappen
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ number, title, description }) => (
            <div
              key={number}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            >
              <div className="w-10 h-10 rounded-full bg-[#EFE8E4] flex items-center justify-center font-heading font-bold text-[#75876D] mb-5">
                {number}
              </div>
              <h3 className="font-heading font-bold text-xl text-[#141414] mb-3">
                {title}
              </h3>
              <p className="text-[#141414]/60 text-[15px] leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Doe de test — live keuzehulp iframe */}
      <SectionWrapper className="bg-[#EFE8E4]" id="quiz">
        <div className="text-center mb-10">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] mb-3">
            Doe de test
          </h2>
          <p className="text-[#141414]/60 text-lg">
            Hieronder laadt de rassenkeuze hulp.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#141414]/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
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

      {/* Nog geen hond? Kijk gerust rond */}
      <SectionWrapper className="bg-[#DFF0C3]/40">
        <div className="text-center mb-12 max-w-xl mx-auto">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] leading-tight mb-4">
            Nog geen hond?
            <br />
            Kijk gerust rond
          </h2>
          <p className="text-[#141414]/60 text-lg">
            Deze test is helemaal gratis. Wil je meer weten over wat daarna komt?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exploreCards.map(({ eyebrow, title, description, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col bg-white rounded-2xl p-7 border border-[#141414]/5 shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <p className="text-xs font-bold text-[#75876D] uppercase tracking-widest mb-3">
                {eyebrow}
              </p>
              <h3 className="font-heading font-bold text-xl text-[#141414] mb-2">
                {title}
              </h3>
              <p className="text-[#141414]/60 text-[15px] leading-relaxed mb-5 flex-grow">
                {description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-[#75876D] font-semibold text-sm group-hover:gap-2.5 transition-all">
                Bekijken
                <ArrowRight size={15} strokeWidth={2} />
              </span>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
