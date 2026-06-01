import { Check, ShieldCheck, Wallet, ArrowsClockwise, Star } from "@phosphor-icons/react/dist/ssr";
import { Card, CardTitle, CardFooter, Badge, Button, Eyebrow } from "@/components/ui";

export type Tier = {
  key: "flex" | "early" | "consult";
  name: string;
  cornerBadge: string;
  description: string;
  priceMain: string;
  priceUnit: string;
  priceSub: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaStyle: "neutral" | "peach" | "dark";
  footerNote: string;
  highlighted?: boolean;
  topBadge?: string;
};

export const tiers: Tier[] = [
  {
    key: "flex",
    name: "Flexibel",
    cornerBadge: "Flexibel",
    description: "Maandelijks opzegbaar — geen jaarcontract, geen verplichting.",
    priceMain: "€12,99",
    priceUnit: "/maand",
    priceSub: "",
    features: [
      "Volledige puppycursus",
      "Alle video's & checklists",
      "Let's Dog Community",
    ],
    ctaLabel: "Start Maandelijks",
    ctaHref: "https://maartend8.sg-host.com/checkout/?add-to-cart=1978&quantity=1",
    ctaStyle: "neutral",
    footerNote: "Geen geld-terug-garantie · opzegbaar per maand",
  },
  {
    key: "early",
    name: "Early Member",
    cornerBadge: "Best deal",
    description: "Volledige toegang — Early Member prijs zolang we lanceren.",
    priceMain: "€59",
    priceUnit: "/eerste jaar",
    priceSub: "Daarna €99/jaar · slechts €4,92 p/m",
    features: [
      "Volledige puppycursus",
      "Alle video's & checklists",
      "Let's Dog Community",
      "Early Member status",
    ],
    ctaLabel: "Claim Early Member Prijs",
    ctaHref: "https://maartend8.sg-host.com/checkout/?add-to-cart=592&quantity=1",
    ctaStyle: "peach",
    footerNote: "7 dagen geld-terug-garantie · eerste jaar €59",
    highlighted: true,
    topBadge: "Meest gekozen",
  },
  {
    key: "consult",
    name: "Jaar + Consult",
    cornerBadge: "Premium",
    description: "Hetzelfde jaarplan + een 1-op-1 consult met een trainer.",
    priceMain: "€79",
    priceUnit: "/eerste jaar",
    priceSub: "Daarna €119/jaar",
    features: [
      "Volledige puppycursus",
      "Alle video's & checklists",
      "Let's Dog Community",
      "1× Online Consult (t.w.v. €39)",
      "Direct 1-op-1 advies van een trainer",
    ],
    ctaLabel: "Kies Jaar + Consult",
    ctaHref: "https://app.letsdog.nl",
    ctaStyle: "dark",
    footerNote: "7 dagen geld-terug-garantie · totale waarde €138",
  },
];

const trustItems = [
  { icon: ShieldCheck, label: "Veilig betalen via Mollie" },
  { icon: Wallet, label: "Geen verborgen kosten" },
  { icon: ArrowsClockwise, label: "Opzegbaar in accountinstellingen" },
];

function PricingCard({ tier }: { tier: Tier }) {
  const checkWrap = tier.highlighted ? "bg-[#FFA580]/20" : "bg-[#75876D]/15";
  const checkColor = tier.highlighted ? "text-[#FFA580]" : "text-[#75876D]";
  const priceColor = tier.highlighted ? "text-[#FFA580]" : "text-[#141414]";

  return (
    <Card featured={tier.highlighted} className="relative flex flex-col">
      {tier.topBadge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge tone="peach" className="font-bold uppercase tracking-wide shadow-md whitespace-nowrap">
            {tier.topBadge}
          </Badge>
        </div>
      )}

      {/* Header: name + corner badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <CardTitle>{tier.name}</CardTitle>
        <Eyebrow className="text-[#141414]/45 mt-1">{tier.cornerBadge}</Eyebrow>
      </div>

      <p className="text-[#141414]/60 text-[15px] leading-relaxed mb-7 min-h-[3.5rem]">
        {tier.description}
      </p>

      {/* Price */}
      <div className="mb-3">
        <div className="flex items-end gap-1.5">
          <span className={`font-heading font-bold text-[3.25rem] leading-none ${priceColor}`}>
            {tier.priceMain}
          </span>
          <span className="text-[#141414]/60 text-[15px] mb-2">{tier.priceUnit}</span>
        </div>
      </div>
      <p className="text-[#141414]/55 text-sm mb-7 min-h-[1.25rem]">{tier.priceSub}</p>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-grow">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${checkWrap}`}
            >
              <Check size={12} weight="bold" className={checkColor} />
            </span>
            <span className="text-[15px] text-[#141414]/85">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA — brand-compliant variants (recommended = primary/ink, rest = secondary).
          The old peach button used an accent as a button background, which the brand
          guardrails forbid; the design system has no peach button by design. */}
      <Button asChild variant={tier.highlighted ? "primary" : "secondary"} block pill>
        <a href={tier.ctaHref} target="_blank" rel="noopener noreferrer">
          {tier.ctaLabel}
        </a>
      </Button>

      <CardFooter className="text-center text-[11px] font-bold uppercase tracking-widest text-[#141414]/40">
        {tier.footerNote}
      </CardFooter>
    </Card>
  );
}

export function Pricing() {
  return (
    <section
      className="relative bg-[#75876D] py-24 lg:py-32 px-6 lg:px-8 overflow-hidden"
      id="prijzen"
      aria-label="Prijzen"
    >
      {/* Subtle radial gradient highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#85977D_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <Eyebrow className="block text-white/70 mb-5">Lidmaatschap</Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl lg:text-5xl text-white leading-tight mb-5 tracking-tight">
            Kies hoe je wilt starten
            <br />
            met Let&apos;s Dog
          </h2>
          <p className="text-white/75 text-lg max-w-2xl mx-auto leading-relaxed">
            Krijg direct toegang tot de volledige puppycursus, praktische video&apos;s, checklists en de Let&apos;s Dog-community. Alles stap voor stap, zodat je weet wat je pup nodig heeft in elke fase.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-7 mb-16 lg:mt-10 items-start">
          {tiers.map((tier) => (
            <PricingCard key={tier.key} tier={tier} />
          ))}
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-4xl mx-auto">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-3 text-white/85">
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon size={16} />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>

        {/* Social proof rating */}
        <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
          <Star size={14} weight="fill" className="text-[#FFA580]" />
          <span>4,8 — meer dan 500 hondenouders gingen je voor.</span>
        </div>
      </div>
    </section>
  );
}
