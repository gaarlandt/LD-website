import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Badge } from "@/components/ui";
import { PartnersSectionHead } from "./section-head";

// Both cards are plain token-styled divs, not <Card>: the design wants the xl
// radius and roomier padding, and .ld-card sets both itself — unlayered, so a
// Tailwind override on <Card> would silently lose the cascade (KTD6).
export function PartnersWays() {
  return (
    <SectionWrapper id="manieren" className="bg-[var(--ld-beige)]">
      <PartnersSectionHead label="Twee manieren" title="Zo kun je samenwerken">
        Kies wat bij je past — of doe allebei. In beide gevallen begint het met
        één mailtje.
      </PartnersSectionHead>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          id="ambassadeur"
          className="flex flex-col rounded-[var(--ld-r-xl)] bg-[var(--ld-green)] text-[var(--ld-on-green)] p-8 lg:p-10"
        >
          <Badge tone="peach" className="self-start mb-5">
            Ambassadeur
          </Badge>
          <h3 className="font-heading font-bold text-2xl mb-3 leading-snug">
            Deel je eigen code
          </h3>
          <p className="text-[17px] leading-relaxed opacity-95">
            Jij hebt een community die je vertrouwt. Deel je persoonlijke
            Let&apos;s dog-code, inspireer je volgers en verdien mee voor
            iedereen die aanhaakt.
          </p>
          <div className="mt-auto pt-6 text-[15px] font-bold text-[var(--ld-lime)]">
            Voor makers met een eigen publiek
          </div>
        </div>

        <div
          id="ugc"
          className="flex flex-col rounded-[var(--ld-r-xl)] bg-[var(--ld-beige)] border border-[var(--ld-border)] text-[var(--ld-text)] p-8 lg:p-10"
        >
          <Badge tone="peach" className="self-start mb-5">
            UGC
          </Badge>
          <h3 className="font-heading font-bold text-2xl mb-3 leading-snug">
            Maak content die wij inzetten
          </h3>
          <p className="text-[17px] leading-relaxed text-[var(--ld-text-muted)]">
            Jij maakt graag content. Film echte, eerlijke hondenmomenten die wij
            inzetten in onze eigen kanalen en campagnes — tegen een vergoeding
            die we samen afspreken.
          </p>
          <div className="mt-auto pt-6 text-[15px] font-bold text-[var(--ld-green-ink)]">
            Voor makers die graag filmen
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
