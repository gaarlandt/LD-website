import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Button } from "@/components/ui";

// The site's first peach *surface* rather than peach accent. Body text stays
// dark ink, the same rule .ld-btn--peach and .ld-chip--peach already encode.
export function PartnersClosingCta() {
  return (
    <SectionWrapper id="aanmelden" className="bg-[var(--ld-beige)]">
      <div className="max-w-4xl mx-auto rounded-[var(--ld-r-xl)] bg-[var(--ld-peach)] text-[var(--ld-ink)] px-8 py-14 lg:px-10 lg:py-16 text-center">
        <h2 className="font-heading font-bold text-3xl md:text-4xl leading-tight tracking-tight mb-4">
          Klaar om samen te werken?
        </h2>
        <p className="text-lg leading-relaxed max-w-lg mx-auto mb-8">
          Stuur een mail naar creators@letsdog.nl en vertel kort iets over
          jezelf en je hond. We nemen persoonlijk contact met je op.
        </p>
        <Button variant="primary" pill asChild>
          <a href="mailto:creators@letsdog.nl">Meld je gratis aan</a>
        </Button>
      </div>
    </SectionWrapper>
  );
}
