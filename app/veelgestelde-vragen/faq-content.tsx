import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import {
  Button,
  Badge,
  Eyebrow,
  Card,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui";
import { faqCategories } from "./faq-data";

export function FaqContent() {
  // Filter empty categories, then compute the starting global index for each
  let _offset = 0;
  const categoriesWithOffsets = faqCategories
    .filter((c) => c.faqs.length > 0)
    .map((cat) => {
      const start = _offset;
      _offset += cat.faqs.length;
      return { ...cat, start };
    });

  return (
    <>
      {/* Hero — beige split */}
      <section className="relative bg-[var(--ld-beige)] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[var(--ld-text)] leading-[1.05] tracking-tight mb-7">
              Vragen? Wij hebben de{" "}
              <span className="text-[var(--ld-peach)]">antwoorden.</span>
            </h1>
            <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed mb-8 max-w-lg">
              Alles wat je wilt weten over Let&apos;s Dog — van onze
              trainingsmethode tot je abonnement.
            </p>
            <Button variant="brand" pill asChild>
              <Link href="/contact">Stel je vraag</Link>
            </Button>
          </div>

          {/* Category overview card */}
          <div className="bg-white rounded-[var(--ld-r-lg)] shadow-[var(--ld-sh-2)] border border-[var(--ld-border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--ld-border)]">
              <Eyebrow>Categorieën</Eyebrow>
            </div>
            <div className="p-2">
              {categoriesWithOffsets.map(({ name, slug, faqs }) => (
                <a
                  key={slug}
                  href={`#${slug}`}
                  className="flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-xl hover:bg-[var(--ld-beige)]/60 transition-colors duration-150 group"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--ld-lime)] flex items-center justify-center">
                    <CaretRight
                      size={14}
                      className="text-[var(--ld-green)] group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                  <span className="flex-1 font-medium text-[var(--ld-text)] text-[15px] group-hover:text-[var(--ld-green)] transition-colors">
                    {name}
                  </span>
                  <span className="text-xs font-semibold text-[var(--ld-green)] bg-[var(--ld-beige)] px-2.5 py-1 rounded-full whitespace-nowrap">
                    {faqs.length}{" "}vragen
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ accordion list */}
      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          {categoriesWithOffsets.map(({ name, slug, faqs, start }) => (
            <section key={slug} id={slug} aria-label={name}>
              <div className="mb-6">
                <Badge tone="lime" className="uppercase tracking-widest">
                  {name}
                </Badge>
              </div>
              <Accordion type="single" collapsible>
                {faqs.map(({ q, a }, localIndex) => {
                  const globalNumber = start + localIndex + 1;
                  const number = String(globalNumber).padStart(2, "0");
                  return (
                    <AccordionItem key={q} value={`${slug}-${localIndex}`}>
                      <AccordionTrigger>
                        <span className="flex items-center gap-3 flex-1 min-w-0">
                          <span
                            className="text-sm text-[var(--ld-peach)] tabular-nums w-6 flex-shrink-0"
                            aria-hidden="true"
                          >
                            {number}
                          </span>
                          <span className="flex-1 min-w-0">{q}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>{a}</AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>
          ))}
        </div>
      </SectionWrapper>

      {/* Still have questions — ends light (R2) */}
      <SectionWrapper className="bg-[var(--ld-beige)]">
        <Card className="max-w-2xl mx-auto text-center">
          <h3 className="font-heading font-bold text-xl text-[var(--ld-text)] mb-3">
            Staat je vraag er niet bij?
          </h3>
          <p className="text-[var(--ld-text-muted)] text-[15px] mb-6">
            Stuur ons een bericht. We antwoorden binnen 1{" "}werkdag.
          </p>
          <Button variant="brand" pill asChild>
            <Link href="/contact">Stel je vraag</Link>
          </Button>
        </Card>
      </SectionWrapper>
    </>
  );
}
