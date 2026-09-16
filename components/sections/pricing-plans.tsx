import { Check } from "@phosphor-icons/react/dist/ssr";
import { Card, CardTitle, CardFooter, Badge, Eyebrow } from "@/components/ui";
import { PlanCTA } from "./plan-cta";
import { PricingViewTracker } from "./pricing-view-tracker";
import { tiers } from "./pricing-data";

// The two plans, stacked: Jaarlijks on top, Maandelijks below. Rendered by BOTH
// the homepage <Pricing> section and the /prijzen hero.
//
// Until 2026-09-16 this was a Maandelijks/Jaarlijks toggle card (one plan at a
// time, defaulting to Jaarlijks). Jur replaced it with this stack — option B of
// the T-85 mockup — so both prices are on the page at once and nobody has to
// click to find the monthly one. Two consequences worth knowing: there is no
// state left, so this is a plain server component again (the client leaves are
// PlanCTA for the add_to_cart click and PricingViewTracker for view_item_list),
// and the saving that used to sit on the toggle's Jaarlijks button now sits
// beside the yearly price.
const flex = tiers.find((t) => t.key === "flex")!;
const early = tiers.find((t) => t.key === "early")!;

// Every secondary figure is derived from priceValue so the displayed numbers
// can never drift from the headline price (plan KTD1/KTD2). At €14,99 monthly
// vs €59 first-year annual: €179,88/yr, €4,92 p/m, save 67%.
const monthlyPerYear = flex.priceValue * 12;
const perMonthEq = early.priceValue / 12;
const savingsPct = Math.round(((monthlyPerYear - early.priceValue) / monthlyPerYear) * 100);

// EUR, Dutch style: comma decimal, € prefix. Whole euros drop cents (€59),
// fractional keep two (€179,88); `cents` forces two decimals (€119,00).
function formatEUR(value: number, opts?: { cents?: boolean }): string {
  const useCents = opts?.cents ?? !Number.isInteger(value);
  return `€${value.toFixed(useCents ? 2 : 0).replace(".", ",")}`;
}

const savingsLabel = `Bespaar ${savingsPct}%`;
const yearlySub = `Dat is maar ${formatEUR(perMonthEq, { cents: true })} per maand · Daarna ${formatEUR(early.listPriceValue ?? 119)}/jaar`;

export function PricingPlans() {
  return (
    <div className="relative mx-auto grid w-full max-w-md gap-7">
      <PricingViewTracker />

      {/* Jaarlijks — the plan we lead with: the featured ring, the "Meest
          gekozen" badge and the only peach CTA on the screen. */}
      <Card featured className="ld-card--no-lift relative flex flex-col">
        {early.topBadge && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge tone="peach" className="font-bold uppercase tracking-wide shadow-md whitespace-nowrap">
              {early.topBadge}
            </Badge>
          </div>
        )}

        <div className="mb-3 flex items-start justify-between gap-3">
          <CardTitle>{`${early.name} — Jaarlijks`}</CardTitle>
          <Eyebrow className="mt-1 text-[var(--ld-text-subtle)]">{early.cornerBadge}</Eyebrow>
        </div>

        <p className="mb-7 text-[15px] leading-relaxed text-[var(--ld-text-muted)]">
          {early.description}
        </p>

        {/* Price */}
        <div className="mb-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          {early.listPriceValue != null && (
            <span className="mb-2 font-heading text-2xl leading-none text-[var(--ld-text-subtle)] line-through">
              <span className="sr-only">Oude prijs: </span>
              {formatEUR(early.listPriceValue, { cents: true })}
            </span>
          )}
          <span className="font-heading text-[3.25rem] font-bold leading-none text-[var(--ld-peach)]">
            {early.priceMain}
          </span>
          <span className="mb-2 text-[15px] text-[var(--ld-text-muted)]">{early.priceUnit}</span>
          {/* Green, not peach: peach is spent on the CTA and the price, and the
              badge is too small for white-on-brand-green (3,86:1). */}
          <Badge tone="green" className="mb-2 font-bold">
            {savingsLabel}
          </Badge>
        </div>

        <p className="mb-7 text-sm text-[var(--ld-text-muted)]">{yearlySub}</p>

        <ul className="mb-8 flex-grow space-y-3">
          {early.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ld-peach)]/20">
                <Check size={12} weight="bold" className="text-[var(--ld-peach)]" />
              </span>
              <span className="text-[15px] text-[var(--ld-text)]/85">{feature}</span>
            </li>
          ))}
        </ul>

        <PlanCTA tier={early} />

        <CardFooter className="text-center text-balance text-[11px] font-bold uppercase tracking-widest text-[var(--ld-text-subtle)]">
          {early.footerNote}
        </CardFooter>
      </Card>

      {/* Maandelijks — deliberately the quieter block: no feature list (it would
          repeat the card above), the price sits beside the title, and one line
          says what it does and does not include. Plain <h3> rather than
          CardTitle because this title is a size down from the yearly one. */}
      <Card className="flex flex-col">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h3 className="font-heading text-xl font-bold tracking-tight text-[var(--ld-text)]">
            {`${flex.name} — Maandelijks`}
          </h3>
          <div className="flex flex-shrink-0 items-baseline gap-1">
            <span className="font-heading text-3xl font-bold leading-none text-[var(--ld-text)]">
              {flex.priceMain}
            </span>
            <span className="text-sm text-[var(--ld-text-muted)]">{flex.priceUnit}</span>
          </div>
        </div>

        <p className="mb-6 text-[15px] leading-relaxed text-[var(--ld-text-muted)]">
          {flex.description} Dezelfde cursus, zonder de Early Member-status.
        </p>

        <PlanCTA tier={flex} />

        <CardFooter className="text-center text-balance text-[11px] font-bold uppercase tracking-widest text-[var(--ld-text-subtle)]">
          {flex.footerNote}
        </CardFooter>
      </Card>
    </div>
  );
}
