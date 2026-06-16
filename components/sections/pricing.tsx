import { ShieldCheck, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Eyebrow } from "@/components/ui";
import { PricingToggleCard } from "./pricing-toggle-card";

const trustItems = [
  { icon: ShieldCheck, label: "Veilig betalen via Mollie" },
  { icon: Wallet, label: "Geen verborgen kosten" },
];

// Homepage pricing section. Renders the same interactive toggle card used in
// the /prijzen hero (PricingToggleCard), keeping this section's heading, trust
// bar, and id="prijzen" anchor (deep links + same-site CTA tracking depend on it).
export function Pricing() {
  return (
    <section
      className="relative bg-[var(--ld-green)] py-24 lg:py-32 px-6 lg:px-8 overflow-hidden"
      id="prijzen"
      aria-label="Prijzen"
    >
      {/* Subtle radial gradient highlight (decorative lighter-green wash — intentional one-off) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#85977D_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <Eyebrow tone="onGreen" className="block mb-5">Lidmaatschap</Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl lg:text-5xl text-[var(--ld-on-green)] leading-tight mb-5 tracking-tight">
            Kies hoe je wilt starten
            <br />
            met Let&apos;s dog
          </h2>
          <p className="text-[var(--ld-on-green)]/75 text-lg max-w-2xl mx-auto leading-relaxed">
            Krijg direct toegang tot de volledige puppycursus, praktische video&apos;s, checklists en de Let&apos;s dog-community. Alles stap voor stap, zodat je weet wat je pup nodig heeft in elke fase.
          </p>
        </div>

        {/* Interactive pricing card (Maandelijks ⇄ Jaarlijks) */}
        <PricingToggleCard />

        {/* Trust bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14 max-w-2xl mx-auto">
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
