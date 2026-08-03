import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { faqPageLd } from "@/lib/structured-data";
import { PartnersHero } from "@/components/sections/partners/hero";
import { PartnersTrust } from "@/components/sections/partners/trust-strip";
import { PartnersWays } from "@/components/sections/partners/ways";
import { PartnersSteps } from "@/components/sections/partners/steps";
import { PartnersBenefits } from "@/components/sections/partners/benefits";
import { PartnersMission } from "@/components/sections/partners/mission-band";
import { PartnersTerms } from "@/components/sections/partners/terms-card";
import { PartnersFaq } from "@/components/sections/partners/faq";
import { PartnersClosingCta } from "@/components/sections/partners/closing-cta";
import { partnersFaqs } from "@/components/sections/partners/partners-faq-data";

export const metadata = pageMetadata({
  title: "Partners — Let's dog",
  description:
    "Werk samen met Let's dog als ambassadeur of UGC-maker. Deel je eigen code met je volgers of maak content die wij inzetten — gratis meedoen, persoonlijk contact.",
  path: "/partners/",
});

export default function Partners() {
  return (
    <>
      <JsonLd data={faqPageLd([{ faqs: partnersFaqs }])} />
      <PartnersHero />
      <PartnersTrust />
      <PartnersWays />
      <PartnersSteps />
      <PartnersBenefits />
      <PartnersMission />
      <PartnersTerms />
      <PartnersFaq />
      <PartnersClosingCta />
    </>
  );
}
