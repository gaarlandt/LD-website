import { Check, ShieldCheck, Wallet, ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, CardTitle, CardFooter, Badge, Eyebrow } from "@/components/ui";
import { PlanCTA } from "./plan-cta";
import { PricingViewTracker } from "./pricing-view-tracker";

export type Tier = {
  key: "flex" | "early";
  name: string;
  cornerBadge: string;
  description: string;
  priceMain: string;
  priceUnit: string;
  priceSub: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
  highlighted?: boolean;
  topBadge?: string;
  // Analytics (begin_checkout) — kept beside ctaHref so a cutover product-ID
  // swap updates the tracked id in lockstep with the checkout link.
  productId: number;
  priceValue: number;
  billingPeriod: "monthly" | "yearly";
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
    footerNote: "Geen geld-terug-garantie · opzegbaar per maand",
    productId: 1978,
    priceValue: 12.99,
    billingPeriod: "monthly",
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
    footerNote: "7 dagen geld-terug-garantie · eerste jaar €59",
    highlighted: true,
    topBadge: "Meest gekozen",
    productId: 592,
    priceValue: 59,
    billingPeriod: "yearly",
  },
];

const trustItems = [
  { icon: ShieldCheck, label: "Veilig betalen via Mollie" },
  { icon: Wallet, label: "Geen verborgen kosten" },
  { icon: ArrowsClockwise, label: "Opzegbaar in accountinstellingen" },
];

function PricingCard({ tier }: { tier: Tier }) {
  const checkWrap = tier.highlighted ? "bg-[var(--ld-peach)]/20" : "bg-[var(--ld-green)]/15";
  const checkColor = tier.highlighted ? "text-[var(--ld-peach)]" : "text-[var(--ld-green)]";
  const priceColor = tier.highlighted ? "text-[var(--ld-peach)]" : "text-[var(--ld-text)]";

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
        <Eyebrow className="text-[var(--ld-text-subtle)] mt-1">{tier.cornerBadge}</Eyebrow>
      </div>

      <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed mb-7 min-h-[3.5rem]">
        {tier.description}
      </p>

      {/* Price */}
      <div className="mb-3">
        <div className="flex items-end gap-1.5">
          <span className={`font-heading font-bold text-[3.25rem] leading-none ${priceColor}`}>
            {tier.priceMain}
          </span>
          <span className="text-[var(--ld-text-muted)] text-[15px] mb-2">{tier.priceUnit}</span>
        </div>
      </div>
      <p className="text-[var(--ld-text-muted)] text-sm mb-7 min-h-[1.25rem]">{tier.priceSub}</p>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-grow">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${checkWrap}`}
            >
              <Check size={12} weight="bold" className={checkColor} />
            </span>
            <span className="text-[15px] text-[var(--ld-text)]/85">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA — the recommended tier gets the brand's one accent CTA (peach, ink text);
          the others stay secondary so only the recommended action pops. Accent-as-button
          is allowed for the single highest-emphasis action per screen. The button is a
          client leaf (PlanCTA) that fires begin_checkout before navigating. */}
      <PlanCTA tier={tier} />

      <CardFooter className="text-center text-[11px] font-bold uppercase tracking-widest text-[var(--ld-text-subtle)]">
        {tier.footerNote}
      </CardFooter>
    </Card>
  );
}

export function Pricing() {
  return (
    <section
      className="relative bg-[var(--ld-green)] py-24 lg:py-32 px-6 lg:px-8 overflow-hidden"
      id="prijzen"
      aria-label="Prijzen"
    >
      <PricingViewTracker />
      {/* Subtle radial gradient highlight (decorative lighter-green wash — intentional one-off) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#85977D_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <Eyebrow tone="onGreen" className="block mb-5">Lidmaatschap</Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl lg:text-5xl text-[var(--ld-on-green)] leading-tight mb-5 tracking-tight">
            Kies hoe je wilt starten
            <br />
            met Let&apos;s Dog
          </h2>
          <p className="text-[var(--ld-on-green)]/75 text-lg max-w-2xl mx-auto leading-relaxed">
            Krijg direct toegang tot de volledige puppycursus, praktische video&apos;s, checklists en de Let&apos;s Dog-community. Alles stap voor stap, zodat je weet wat je pup nodig heeft in elke fase.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 mb-16 lg:mt-10 items-start max-w-3xl mx-auto">
          {tiers.map((tier) => (
            <PricingCard key={tier.key} tier={tier} />
          ))}
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-4xl mx-auto">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-3 text-[var(--ld-on-green)]/85">
              <span className="w-9 h-9 rounded-full bg-[var(--ld-on-green)]/15 flex items-center justify-center flex-shrink-0">
                <Icon size={16} />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
