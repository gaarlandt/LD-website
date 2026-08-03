import { SectionWrapper } from "@/components/shared/section-wrapper";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui";
import { PartnersSectionHead } from "./section-head";
import { partnersFaqs } from "./partners-faq-data";

// Accordion carries its own "use client" boundary, so this section — and the
// page — stay server components (KTD11).
export function PartnersFaq() {
  return (
    <SectionWrapper id="faq" className="bg-white">
      <PartnersSectionHead
        label="Veelgestelde vragen"
        title="Goed om te weten"
      />
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible defaultValue="partners-faq-0">
          {partnersFaqs.map(({ q, a }, i) => (
            <AccordionItem key={q} value={`partners-faq-${i}`}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionWrapper>
  );
}
