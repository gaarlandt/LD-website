"use client";

import { useState } from "react";
import { Check, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { Card, CardTitle, CardFooter, Badge, Eyebrow } from "@/components/ui";
import { PlanCTA } from "./plan-cta";
import { PricingViewTracker } from "./pricing-view-tracker";
import { tiers } from "./pricing-data";

type Period = "monthly" | "yearly";

const flex = tiers.find((t) => t.key === "flex")!;
const early = tiers.find((t) => t.key === "early")!;

// Every secondary figure is derived from priceValue so the displayed numbers
// can never drift from the headline price (plan KTD1/KTD2). At €19,99 monthly
// vs €59 first-year annual: €239,88/yr, €180,88 "meer", €4,92 p/m, save 75%.
const monthlyPerYear = flex.priceValue * 12;
const meerPerJaar = monthlyPerYear - early.priceValue;
const perMonthEq = early.priceValue / 12;
const savingsPct = Math.round(((monthlyPerYear - early.priceValue) / monthlyPerYear) * 100);

// EUR, Dutch style: comma decimal, € prefix. Whole euros drop cents (€59),
// fractional keep two (€239,88); `cents` forces two decimals (€99,00).
function formatEUR(value: number, opts?: { cents?: boolean }): string {
  const useCents = opts?.cents ?? !Number.isInteger(value);
  return `€${value.toFixed(useCents ? 2 : 0).replace(".", ",")}`;
}

const PERIOD_LABEL: Record<Period, string> = { monthly: "Maandelijks", yearly: "Jaarlijks" };
const savingsLabel = `Bespaar ${savingsPct}%`;
const yearlySub = `Dat is maar ${formatEUR(perMonthEq, { cents: true })} per maand · Daarna ${formatEUR(early.listPriceValue ?? 99)}/jaar`;
const monthlySub = `= ${formatEUR(monthlyPerYear)} per jaar`;

export function PricingToggleCard() {
  // Default to Jaarlijks — the best-value, "Meest gekozen" plan (plan KTD3).
  const [period, setPeriod] = useState<Period>("yearly");
  const isYearly = period === "yearly";
  const tier = isYearly ? early : flex;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <PricingViewTracker />

      {/* Billing-period toggle — white pill works on both the green homepage
          section and the beige /prijzen hero. */}
      <div className="flex justify-center mb-7">
        <div
          role="group"
          aria-label="Kies betaalperiode"
          className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5"
        >
          {(["monthly", "yearly"] as Period[]).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--ld-green)] text-[var(--ld-on-green)]"
                    : "text-[var(--ld-text-muted)] hover:text-[var(--ld-text)]"
                }`}
              >
                {PERIOD_LABEL[p]}
                {p === "yearly" && (
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      active
                        ? "bg-[var(--ld-peach)] text-[var(--ld-text)]"
                        : "bg-[var(--ld-peach)]/20 text-[var(--ld-text)]"
                    }`}
                  >
                    {savingsLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active plan card — `featured` (lift + accent ring) follows the
          highlighted yearly plan. */}
      <Card featured={tier.highlighted} className="relative flex flex-col">
        {isYearly && early.topBadge && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge tone="peach" className="font-bold uppercase tracking-wide shadow-md whitespace-nowrap">
              {early.topBadge}
            </Badge>
          </div>
        )}

        <div className="mb-3 flex items-start justify-between gap-3">
          <CardTitle>{`${tier.name} — ${PERIOD_LABEL[period]}`}</CardTitle>
          <Eyebrow className="mt-1 text-[var(--ld-text-subtle)]">{tier.cornerBadge}</Eyebrow>
        </div>

        <p className="mb-7 min-h-[3.5rem] text-[15px] leading-relaxed text-[var(--ld-text-muted)]">
          {tier.description}
        </p>

        {/* Price */}
        <div className="mb-2 flex items-end gap-2">
          {isYearly && early.listPriceValue != null && (
            <span className="mb-2 font-heading text-2xl leading-none text-[var(--ld-text-subtle)] line-through">
              <span className="sr-only">Oude prijs: </span>
              {formatEUR(early.listPriceValue, { cents: true })}
            </span>
          )}
          <span
            className={`font-heading text-[3.25rem] font-bold leading-none ${
              tier.highlighted ? "text-[var(--ld-peach)]" : "text-[var(--ld-text)]"
            }`}
          >
            {tier.priceMain}
          </span>
          <span className="mb-2 text-[15px] text-[var(--ld-text-muted)]">{tier.priceUnit}</span>
        </div>

        {/* Derived sub-line (single string expression — no JSX whitespace risk) */}
        <p className="mb-7 min-h-[1.25rem] text-sm text-[var(--ld-text-muted)]">
          {isYearly ? yearlySub : monthlySub}
        </p>

        {/* Features */}
        <ul className="mb-8 flex-grow space-y-3">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                  tier.highlighted ? "bg-[var(--ld-peach)]/20" : "bg-[var(--ld-green)]/15"
                }`}
              >
                <Check
                  size={12}
                  weight="bold"
                  className={tier.highlighted ? "text-[var(--ld-peach)]" : "text-[var(--ld-green)]"}
                />
              </span>
              <span className="text-[15px] text-[var(--ld-text)]/85">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA — reuses PlanCTA: peach for the highlighted (yearly) plan,
            secondary for monthly; fires begin_checkout with the active tier's
            productId / priceValue / billingPeriod. */}
        <PlanCTA tier={tier} />

        {/* Monthly → annual nudge */}
        {!isYearly && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--ld-green)]/10 px-4 py-3 text-center text-sm text-[var(--ld-text-muted)]">
            <TrendUp size={16} weight="bold" className="flex-shrink-0 text-[var(--ld-green)]" />
            <span>
              Je betaalt{" "}
              <strong className="text-[var(--ld-text)]">{formatEUR(meerPerJaar)}</strong>{" "}
              meer per jaar, kies Jaarlijks
            </span>
          </div>
        )}

        <CardFooter className="text-center text-[11px] font-bold uppercase tracking-widest text-[var(--ld-text-subtle)]">
          {tier.footerNote}
        </CardFooter>
      </Card>
    </div>
  );
}
