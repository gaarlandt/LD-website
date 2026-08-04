import { Eyebrow } from "@/components/ui";

// The page's only full-bleed section. The lime kicker and the peach tagline pill
// both set colour/size that .ld-eyebrow and .ld-chip already own unlayered, so
// they carry an inline style / plain span rather than a losing utility (KTD6).
export function PartnersMission() {
  return (
    <section
      id="missie"
      className="bg-[var(--ld-forest)] text-[var(--ld-on-forest)] px-6 lg:px-8 py-24 lg:py-28"
    >
      <div className="max-w-2xl mx-auto text-center">
        <Eyebrow
          className="block mb-6"
          style={{ color: "var(--ld-lime)" }}
        >
          Onze missie
        </Eyebrow>
        <h2 className="font-heading font-bold text-3xl md:text-4xl lg:text-[2.9rem] leading-tight tracking-tight mb-6">
          Iedere hond verdient een mens die hem écht begrijpt.
        </h2>
        <p className="text-xl leading-relaxed opacity-90 max-w-xl mx-auto mb-5">
          Wij helpen hondenouders hun hond écht te begrijpen en met vertrouwen de
          juiste keuzes te maken — in iedere levensfase.
        </p>
        <p className="text-base leading-relaxed opacity-70 max-w-lg mx-auto mb-8">
          Betrouwbare kennis, deskundige begeleiding en een betrokken community,
          van pup tot senior, op één vertrouwde plek.
        </p>
        <span className="inline-block rounded-full bg-[var(--ld-peach)] text-[var(--ld-ink)] font-bold text-[17px] px-7 py-3">
          Minder twijfel. Meer genieten van je hond.
        </span>
      </div>
    </section>
  );
}
