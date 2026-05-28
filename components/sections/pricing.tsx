import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

type Tier = {
  eyebrow: string;
  name: string;
  tagline: string;
  price: { amount: string; cadence: string };
  priceNote: string;
  features: string[];
  cta: { label: string; href: string };
  surface: "cream" | "sage";
};

const tiers: Tier[] = [
  {
    eyebrow: "Flexibel",
    name: "Flexibel",
    tagline: "Maandelijks opzegbaar. Eerst rustig proberen.",
    price: { amount: "12,99", cadence: "per maand" },
    priceNote: "Inclusief btw.",
    features: [
      "Volledige puppycursus",
      "Alle video's en checklists",
      "Toegang tot de community",
    ],
    cta: { label: "Start maandelijks", href: "https://app.letsdog.nl" },
    surface: "cream",
  },
  {
    eyebrow: "Early Member · Best Deal",
    name: "Early Member",
    tagline: "Volledige toegang voor de Early Member prijs.",
    price: { amount: "59", cadence: "voor je eerste jaar" },
    priceNote: "Dat is €4,92 per maand. Daarna €99 per jaar.",
    features: [
      "Volledige puppycursus",
      "Alle video's en checklists",
      "Toegang tot de community",
      "Early Member status",
    ],
    cta: { label: "Claim de Early Member prijs", href: "https://app.letsdog.nl" },
    surface: "sage",
  },
  {
    eyebrow: "Jaar + Consult · Premium",
    name: "Jaar + Consult",
    tagline: "Het jaarplan, plus een 1-op-1 consult.",
    price: { amount: "79", cadence: "voor je eerste jaar" },
    priceNote: "Daarna €119 per jaar.",
    features: [
      "Alles van Early Member",
      "1× online consult (waarde €39)",
      "Persoonlijk advies van een trainer",
    ],
    cta: { label: "Kies Jaar + Consult", href: "https://app.letsdog.nl" },
    surface: "cream",
  },
];

export function Pricing() {
  return (
    <section id="prijzen" className="bg-[#EFE8E4] py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-[640px] mb-14 lg:mb-16">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Prijzen
          </span>
          <h2 className="font-heading font-bold text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-[#141414] mt-4 mb-4">
            Eén juiste aanpak. <span className="text-[#FFA580]">Drie manieren</span> om te starten.
          </h2>
          <p className="text-[#141414]/65 text-[17px] leading-[1.6]">
            Kies het tempo dat bij jullie leven past. Proberen kan altijd, opzeggen ook.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {tiers.map((tier) => {
            const isSage = tier.surface === "sage";
            return (
              <div
                key={tier.name}
                className={
                  isSage
                    ? "relative rounded-[28px] p-7 lg:p-8 flex flex-col bg-[#75876D] text-white lg:scale-[1.02] lg:-translate-y-2 shadow-[0_18px_48px_-20px_rgba(20,42,14,0.45)]"
                    : "relative rounded-[28px] p-7 lg:p-8 flex flex-col bg-[#FAF6F2] border border-[#141414]/8 shadow-[0_8px_28px_-14px_rgba(20,20,20,0.08)]"
                }
              >
                <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] mb-5 ${isSage ? "text-white/75" : "text-[#75876D]"}`}>
                  {tier.eyebrow}
                </div>

                <div className="font-heading font-bold text-[24px] leading-tight tracking-[-0.015em] mb-2">
                  {tier.name}
                </div>

                <p className={`text-[14px] leading-[1.5] mb-6 ${isSage ? "text-white/80" : "text-[#141414]/65"}`}>
                  {tier.tagline}
                </p>

                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <span className={`font-heading text-[22px] mt-1 ${isSage ? "text-white/85" : "text-[#141414]/70"}`}>€</span>
                  <span className="font-heading font-bold text-[48px] leading-none tracking-[-0.02em]">
                    {tier.price.amount}
                  </span>
                </div>
                <p className={`text-[13px] mb-1 ${isSage ? "text-white/80" : "text-[#141414]/70"}`}>
                  {tier.price.cadence}
                </p>
                <p className={`text-[12px] mb-6 ${isSage ? "text-white/60" : "text-[#141414]/50"}`}>
                  {tier.priceNote}
                </p>

                <ul className="space-y-2.5 mb-7 flex-grow">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${isSage ? "bg-white/15" : "bg-[#DFF0C3]"}`}>
                        <Check size={10} className={isSage ? "text-white" : "text-[#75876D]"} strokeWidth={3} />
                      </span>
                      <span className={`text-[14px] leading-[1.5] ${isSage ? "text-white/90" : "text-[#141414]/80"}`}>
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
                      ? "block w-full text-center py-3 rounded-full bg-[#FFA580] text-[#141414] font-semibold text-[14px] hover:bg-[#ff9060] transition-colors duration-200 cursor-pointer"
                      : "block w-full text-center py-3 rounded-full bg-[#141414] text-white font-semibold text-[14px] hover:bg-[#162A0E] transition-colors duration-200 cursor-pointer"
                  }
                >
                  {tier.cta.label}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px] text-[#141414]/55">
          <Link
            href="/prijzen"
            className="inline-flex items-center gap-2 text-[#75876D] font-semibold group"
          >
            <span className="border-b-2 border-[#75876D] pb-0.5">Vergelijk de drie plannen</span>
            <ArrowRight size={16} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>Veilig betalen via Mollie</span>
        </div>
      </div>
    </section>
  );
}
