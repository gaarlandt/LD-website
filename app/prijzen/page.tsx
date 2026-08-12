import { pageMetadata } from "@/lib/seo";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { JsonLd } from "@/components/shared/json-ld";
import { productLd } from "@/lib/structured-data";
import { tiers } from "@/components/sections/pricing-data";
import { PricingToggleCard } from "@/components/sections/pricing-toggle-card";
import {
  Badge,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui";

export const metadata = pageMetadata({
  title: "Prijzen — Let's dog",
  description:
    "Twee manieren om te starten met Let's dog: Flexibel maandelijks of Early Member jaar. Vanaf €4,92 per maand. Betalen via iDEAL, creditcard of SEPA-incasso.",
  path: "/prijzen/",
});

const heroPills = [
  { dotClass: "bg-[var(--ld-green)]", label: "Welzijnsgericht" },
  { dotClass: "bg-[var(--ld-peach)]", label: "Wekelijkse agenda" },
];

const faqs = [
  {
    q: "Hoe lang geldt de Early Member-prijs?",
    a: "Zolang we lanceren, er is nog geen vaste einddatum. Wie nu instapt, betaalt €59 voor het eerste jaar. Wanneer we de prijs verhogen naar €119/jaar, communiceren we dat ruim van tevoren.",
  },
  {
    q: "Via welke betaalmethoden kan ik betalen?",
    a: "Betalen gaat via Stripe. Je kunt kiezen uit iDEAL, creditcard en SEPA-incasso. Betaal je met iDEAL, dan geef je bij die betaling meteen een machtiging af waarmee we de verlenging later automatisch incasseren.",
  },
  {
    q: "Waarom zie ik bij het jaarabonnement eerst €0,01 op mijn afschrift?",
    a: "Dat is een controle van je bank, geen betaling. Om de machtiging voor de automatische verlenging te kunnen afgeven, schrijft Stripe eenmalig 1 cent af en boekt die direct weer terug. Op je afschrift zie je dus 1 cent af en 1 cent terug. Daarna gebeurt er tijdens je proefperiode niets: pas na 7 dagen schrijven we het jaarbedrag af. Bij het maandabonnement gebeurt dit niet, daar betaal je meteen het maandbedrag.",
  },
  {
    q: "Wat als het toch niet bij jullie past?",
    a: "Je kunt je abonnement op elk moment opzeggen via je account op mijn.letsdog.nl, onder Profiel en dan Abonnement. Bij een jaarabonnement (Early Member) wordt het volledige bedrag pas na 7 dagen afgeschreven: zeg je binnen die 7 dagen op, dan gaat de afschrijving niet door en betaal je niets. Het maandabonnement is niet restitueerbaar, maar je kunt elke maand opzeggen.",
  },
  {
    q: "Krijg ik mijn geld terug als ik snel opzeg?",
    a: "Bij een jaarabonnement (Early Member) wordt het volledige bedrag pas na 7 dagen automatisch afgeschreven. Zeg je binnen die 7 dagen op via je account op mijn.letsdog.nl, onder Profiel en dan Abonnement? Dan gaat die afschrijving niet door: je betaalt dus niets en er valt ook niets terug te storten. Bij het maandabonnement (Flexibel) is geen restitutie mogelijk, je kunt wel elke maand opzeggen zodat er de volgende maand niets wordt afgeschreven.",
  },
];

export default function Prijzen() {
  return (
    <>
      <JsonLd data={productLd(tiers)} />
      {/* Upper hero — beige: text column + interactive pricing card */}
      <section className="relative bg-[#EFE8E4] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[#141414] leading-[1.05] tracking-tight mb-7">
              Eén juiste aanpak.{" "}
              <span className="text-[#FFA580]">Twee manieren</span> om te starten.
            </h1>

            <p className="text-[#141414]/70 text-lg leading-relaxed mb-8 max-w-lg">
              Geen tegenstrijdige tips meer. Kies het tempo dat bij jullie leven past, proberen kan altijd, opzeggen ook.
            </p>

            {/* Pills */}
            <div className="flex flex-wrap gap-3">
              {heroPills.map(({ dotClass, label }) => (
                <Badge key={label} className="font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
                    aria-hidden="true"
                  />
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Pricing card column (replaces the former hero image) */}
          <div className="relative">
            <PricingToggleCard />
          </div>
        </div>
      </section>

      {/* FAQ — soft-green section, visually distinct from the beige hero */}
      <SectionWrapper className="bg-[var(--ld-green-soft)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#141414] mb-8 text-center">
            Vragen over prijzen
          </h2>
          <Accordion type="single" collapsible>
            {faqs.map(({ q, a }, i) => (
              <AccordionItem key={q} value={`faq-${i}`}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SectionWrapper>
    </>
  );
}
