import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { faqPageLd } from "@/lib/structured-data";
import { FaqContent } from "./faq-content";
import { faqCategories } from "./faq-data";

export const metadata = pageMetadata({
  title: "Veelgestelde vragen — Let's dog",
  description:
    "Antwoorden op de meestgestelde vragen over Let's dog — de web app, onze welzijnsgerichte trainingsmethode, het abonnement en betalingen.",
  path: "/veelgestelde-vragen/",
});

export default function Page() {
  return (
    <>
      <JsonLd data={faqPageLd(faqCategories)} />
      <FaqContent />
    </>
  );
}
