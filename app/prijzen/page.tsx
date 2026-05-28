import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import { asset } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Prijzen · Let's Dog",
  description:
    "Drie manieren om te starten met Let's Dog. Flexibel maandelijks, Early Member jaarplan, of Jaar plus 1-op-1 consult. Betaling via Mollie.",
};

type Tier = {
  eyebrow: string;
  name: string;
  tagline: string;
  price: {
    amount: string;
    cadence: string;
  };
  priceNote: string;
  features: string[];
  cta: { label: string; href: string };
  footnote: string;
  surface: "cream" | "sage";
};

const tiers: Tier[] = [
  {
    eyebrow: "Flexibel",
    name: "Flexibel",
    tagline:
      "Maandelijks opzegbaar. Eerst rustig proberen, zonder verplichting.",
    price: { amount: "12,99", cadence: "per maand" },
    priceNote: "Inclusief btw. Betaling via Mollie.",
    features: [
      "Volledige puppycursus",
      "Alle video's en checklists",
      "Toegang tot de Let's Dog community",
    ],
    cta: { label: "Start maandelijks", href: "https://app.letsdog.nl" },
    footnote: "Maandelijks opzegbaar",
    surface: "cream",
  },
  {
    eyebrow: "Early Member · Best Deal",
    name: "Early Member",
    tagline:
      "Volledige toegang voor de Early Member prijs zolang we lanceren.",
    price: { amount: "59", cadence: "voor je eerste jaar" },
    priceNote:
      "Dat is €4,92 per maand. Daarna €99 per jaar.",
    features: [
      "Volledige puppycursus",
      "Alle video's en checklists",
      "Toegang tot de Let's Dog community",
      "Early Member status (zolang je lid blijft)",
    ],
    cta: { label: "Claim de Early Member prijs", href: "https://app.letsdog.nl" },
    footnote: "Eerste jaar €59. Daarna €99.",
    surface: "sage",
  },
  {
    eyebrow: "Jaar + Consult · Premium",
    name: "Jaar + Consult",
    tagline:
      "Hetzelfde jaarplan, plus een 1-op-1 consult met een trainer.",
    price: { amount: "79", cadence: "voor je eerste jaar" },
    priceNote: "Daarna €119 per jaar.",
    features: [
      "Volledige puppycursus",
      "Alle video's en checklists",
      "Toegang tot de Let's Dog community",
      "1× online consult (waarde €39)",
      "Persoonlijk advies van een gecertificeerde trainer",
    ],
    cta: { label: "Kies Jaar + Consult", href: "https://app.letsdog.nl" },
    footnote: "Totale waarde €138",
    surface: "cream",
  },
];

const trustPills = [
  "Welzijnsgericht",
  "14 dagen rustig proberen",
  "Geen verborgen kosten",
];

const bottomTrust = [
  { title: "Veilig betalen via Mollie", body: "iDEAL, Bancontact, creditcard en meer. Mollie is de Nederlandse standaard." },
  { title: "Geen verborgen kosten", body: "De prijs die je ziet, is de prijs die je betaalt. Inclusief btw." },
  { title: "Opzegbaar wanneer je wilt", body: "Geen lange contracten, geen gedoe. Zelf opzeggen in de web app." },
];

const faqs = [
  {
    q: "Wanneer eindigt de Early Member prijs?",
    a: "We hebben nog geen vaste einddatum. Zodra de prijs naar €99 per jaar gaat, communiceren we dat vooraf via e-mail. Iedereen die nu instapt, houdt €59 voor zijn eerste jaar.",
  },
  {
    q: "Wat is het verschil tussen Flexibel en Early Member?",
    a: "Flexibel betaal je per maand en kun je elke maand opzeggen. Early Member is hetzelfde plan, maar je betaalt vooruit voor een jaar en krijgt de Early Member prijs van €59. Voor wie zeker weet dat hij door wil, is dat de voordeligste optie.",
  },
  {
    q: "Hoe werkt het 1-op-1 consult bij Jaar + Consult?",
    a: "Je plant zelf een online consult van een uur met een van onze gecertificeerde trainers. Je legt vooraf je vraag voor; wij bereiden ons voor. Het consult is geschikt voor één concreet thema, bijvoorbeeld zindelijkheid, alleen-zijn of socialisatie.",
  },
  {
    q: "Via welke betaalmethoden kan ik betalen?",
    a: "Alle betalingen lopen via Mollie. Je kunt betalen met iDEAL, Bancontact, creditcard, Apple Pay en meer.",
  },
  {
    q: "Wat als ik niet tevreden ben?",
    a: "Neem binnen 14 dagen contact op via het contactformulier. Geen tevredenheid, geen kosten. We willen dat je echt geholpen bent.",
  },
];

export default function Prijzen() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#EFE8E4] pt-32 pb-20 lg:pt-40 lg:pb-28 px-6 lg:px-8">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-20 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#75876D]/12 text-[#162A0E] text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span className="w-1 h-1 rounded-full bg-[#75876D]" />
              Prijzen · transparant
            </span>

            <h1 className="font-heading font-bold text-[44px] sm:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em] text-[#141414] mt-6 mb-7">
              Eén juiste aanpak.{" "}
              <span className="text-[#FFA580]">Drie manieren</span>{" "}
              om te starten.
            </h1>

            <p className="text-[#141414]/72 text-[18px] lg:text-[19px] leading-[1.55] max-w-[34ch] mb-9">
              Geen tegenstrijdige tips meer. Kies het tempo dat bij jullie leven past. Proberen kan altijd, opzeggen ook.
            </p>

            <div className="flex flex-wrap gap-2">
              {trustPills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 text-[#141414]/75 text-[13px] font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFA580]" />
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative aspect-[4/5] lg:aspect-[5/6] rounded-[28px] overflow-hidden">
            <Image
              src={asset("/images/hope.jpeg")}
              alt="Hondeneigenaar geniet thuis met zijn hond"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Pricing intro */}
      <section className="bg-[#EFE8E4] pt-8 lg:pt-12 pb-4 px-6 lg:px-8">
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-[640px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
              Lidmaatschap
            </span>
            <h2 className="font-heading font-bold text-[32px] lg:text-[42px] leading-[1.08] tracking-[-0.015em] text-[#141414] mt-4 mb-5">
              Kies hoe je wilt starten met Let&apos;s Dog.
            </h2>
            <p className="text-[#141414]/65 text-[17px] leading-[1.6] max-w-[58ch]">
              Krijg direct toegang tot de volledige puppycursus, praktische video&apos;s, checklists en de Let&apos;s Dog community. Stap voor stap, in elke fase precies wat je pup nodig heeft.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="bg-[#EFE8E4] pt-12 pb-20 lg:pb-28 px-6 lg:px-8">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {tiers.map((tier) => {
            const isSage = tier.surface === "sage";
            return (
              <div
                key={tier.name}
                className={
                  isSage
                    ? "relative rounded-[28px] p-8 lg:p-9 flex flex-col bg-[#75876D] text-white lg:scale-[1.02] lg:-translate-y-2 shadow-[0_18px_48px_-20px_rgba(20,42,14,0.45)]"
                    : "relative rounded-[28px] p-8 lg:p-9 flex flex-col bg-[#FAF6F2] border border-[#141414]/8 shadow-[0_8px_28px_-14px_rgba(20,20,20,0.08)]"
                }
              >
                <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] mb-5 ${isSage ? "text-white/75" : "text-[#75876D]"}`}>
                  {tier.eyebrow}
                </div>

                <div className="font-heading font-bold text-[28px] leading-tight tracking-[-0.015em] mb-3">
                  {tier.name}
                </div>

                <p className={`text-[15px] leading-[1.55] mb-7 ${isSage ? "text-white/80" : "text-[#141414]/65"}`}>
                  {tier.tagline}
                </p>

                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className={`font-heading text-[28px] mt-1 ${isSage ? "text-white/85" : "text-[#141414]/70"}`}>€</span>
                  <span className="font-heading font-bold text-[60px] leading-none tracking-[-0.02em]">
                    {tier.price.amount}
                  </span>
                </div>
                <p className={`text-[14px] mb-1.5 ${isSage ? "text-white/80" : "text-[#141414]/70"}`}>
                  {tier.price.cadence}
                </p>
                <p className={`text-[13px] mb-7 ${isSage ? "text-white/65" : "text-[#141414]/50"}`}>
                  {tier.priceNote}
                </p>

                <ul className="space-y-3 mb-9 flex-grow">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${isSage ? "bg-white/15" : "bg-[#DFF0C3]"}`}>
                        <Check size={12} className={isSage ? "text-white" : "text-[#75876D]"} strokeWidth={3} />
                      </span>
                      <span className={`text-[15px] leading-[1.5] ${isSage ? "text-white/90" : "text-[#141414]/80"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    isSage
                      ? "block w-full text-center py-3.5 rounded-full bg-[#FFA580] text-[#141414] font-semibold text-[15px] hover:bg-[#ff9060] transition-colors duration-200 cursor-pointer"
                      : "block w-full text-center py-3.5 rounded-full bg-[#141414] text-white font-semibold text-[15px] hover:bg-[#162A0E] transition-colors duration-200 cursor-pointer"
                  }
                >
                  {tier.cta.label}
                </a>

                <p className={`text-center text-[11px] mt-5 uppercase tracking-[0.14em] font-medium ${isSage ? "text-white/60" : "text-[#141414]/40"}`}>
                  {tier.footnote}
                </p>
              </div>
            );
          })}
        </div>

        {/* Below-tier reassurance */}
        <p className="text-center text-[14px] text-[#141414]/55 mt-10 max-w-[48ch] mx-auto">
          Niet zeker welke past? Begin met Flexibel. Upgraden naar Early Member of Jaar + Consult kan op elk moment.
        </p>
      </section>

      {/* Bottom trust band */}
      <section className="bg-[#FAF6F2] py-16 lg:py-20 px-6 lg:px-8 border-t border-[#141414]/6">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {bottomTrust.map((item) => (
            <div key={item.title}>
              <p className="font-heading font-bold text-[18px] text-[#141414] mb-2">
                {item.title}
              </p>
              <p className="text-[#141414]/60 text-[15px] leading-[1.6]">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Social proof line */}
        <div className="max-w-[1180px] mx-auto mt-12 pt-10 border-t border-[#141414]/8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[14px] text-[#141414]/65">
          <span className="font-heading font-bold text-[#141414] text-[16px]">4,8</span>
          <span aria-hidden="true">·</span>
          <span>1.240 hondenouders gingen je voor.</span>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#EFE8E4] py-20 lg:py-28 px-6 lg:px-8">
        <div className="max-w-[720px] mx-auto">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Vragen
          </span>
          <h2 className="font-heading font-bold text-[28px] lg:text-[36px] leading-[1.1] tracking-[-0.015em] text-[#141414] mt-4 mb-12">
            Wat eigenaren ons vaak vragen.
          </h2>

          <div className="space-y-8">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-[#141414]/10 pb-8 last:border-b-0 last:pb-0">
                <p className="font-heading font-bold text-[18px] text-[#141414] mb-3 leading-snug">
                  {q}
                </p>
                <p className="text-[#141414]/65 text-[16px] leading-[1.65]">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
