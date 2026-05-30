import { pageMetadata } from "@/lib/seo";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { JsonLd } from "@/components/shared/json-ld";
import { productLd } from "@/lib/structured-data";
import { Pricing, tiers } from "@/components/sections/pricing";

export const metadata = pageMetadata({
  title: "Prijzen — Let's Dog",
  description:
    "Drie manieren om te starten met Let's Dog: Flexibel maandelijks, Early Member jaar, of Jaar + Consult. Vanaf €4,92 per maand. Betalen via Mollie.",
  path: "/prijzen/",
});

const heroPills = [
  "Welzijnsgericht",
  "Maandelijks opzegbaar",
];

const faqs = [
  {
    q: "Hoe lang geldt de Early Member-prijs?",
    a: "Zolang we lanceren — er is nog geen vaste einddatum. Wie nu instapt, betaalt €59 voor het eerste jaar. Wanneer we de prijs verhogen naar €99/jaar, communiceren we dat ruim van tevoren.",
  },
  {
    q: "Via welke betaalmethoden kan ik betalen?",
    a: "Betaling verloopt via Mollie. Je kunt betalen met iDEAL, creditcard, Bancontact en meer gangbare methoden.",
  },
  {
    q: "Wat als het toch niet bij jullie past?",
    a: "Je kunt je abonnement op elk moment opzeggen via de accountinstellingen in de app — geen omweg, geen ingewikkelde procedure. Bij een jaarabonnement geldt bovendien 7 dagen geld-terug-garantie: zeg je binnen 7 dagen op, dan krijg je het volledige bedrag automatisch terug. Het maandabonnement is niet restitueerbaar, maar je kunt elke maand opzeggen.",
  },
  {
    q: "Krijg ik mijn geld terug als ik snel opzeg?",
    a: "Bij een jaarabonnement (Early Member of Jaar + Consult): ja, binnen 7 dagen. Je zegt op via de accountinstellingen en wij storten het volledige bedrag automatisch binnen 14 dagen terug. Bij het maandabonnement (Flexibel) is geen restitutie mogelijk — je kunt wel elke maand opzeggen zodat de volgende maand niet wordt afgeschreven.",
  },
];

export default function Prijzen() {
  return (
    <>
      <JsonLd data={productLd(tiers)} />
      {/* Upper hero — beige */}
      <section className="relative bg-[#EFE8E4] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <div className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full bg-[#DFF0C3] text-[#162A0E] text-xs font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#75876D]" />
              Prijzen · Transparant
            </div>

            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[#141414] leading-[1.05] tracking-tight mb-7">
              Eén juiste aanpak.{" "}
              <span className="text-[#FFA580]">Drie manieren</span> om te starten.
            </h1>

            <p className="text-[#141414]/70 text-lg leading-relaxed mb-8 max-w-lg">
              Geen tegenstrijdige tips meer. Kies het tempo dat bij jullie leven past — proberen kan altijd, opzeggen ook.
            </p>

            {/* Pills */}
            <div className="flex flex-wrap gap-3">
              {heroPills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#141414] text-sm font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FFA580]" />
                  {pill}
                </span>
              ))}
            </div>
          </div>

          {/* Image column */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[5/6] bg-[#E8DDD6]">
              <OptimizedImage
                src="/images/hero.jpeg"
                alt="Eigenaar met haar puppy"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/30 via-transparent to-transparent" />
            </div>

            {/* Vanaf €4,92 per maand badge */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#FFA580] text-[#141414] text-sm font-bold shadow-lg whitespace-nowrap">
                Vanaf €4,92 per maand
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Lower section — 3-tier cards on green */}
      <Pricing />

      {/* FAQ */}
      <SectionWrapper className="bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#141414] mb-8 text-center">
            Vragen over prijzen
          </h2>
          <div className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-[#141414]/10 pb-6">
                <p className="font-semibold text-[#141414] mb-2">{q}</p>
                <p className="text-[#141414]/65 text-[15px] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
