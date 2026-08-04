export type PartnerFaq = { q: string; a: string };

// Single source for BOTH the visible accordion (faq.tsx) and the FAQPage
// JSON-LD (app/partners/page.tsx). Keep these in sync: Google penalises FAQ
// structured data that doesn't mirror the visible Q/A text — the same contract
// app/veelgestelde-vragen/faq-data.ts carries.
export const partnersFaqs: PartnerFaq[] = [
  {
    q: "Wie kan meedoen?",
    a: "Creators die op een authentieke manier over honden praten en een betrokken volgersgroep hebben. Grootte is minder belangrijk dan echtheid we kijken vooral of jouw content en Let's dog bij elkaar passen.",
  },
  {
    q: "Wat kost het mij?",
    a: "Niets. Meedoen is volledig kosteloos of je nu ambassadeur of UGC-maker bent. Je betaalt nergens voor. Wat je precies krijgt en hoe de samenwerking eruitziet, spreken we samen af.",
  },
  {
    q: "Hoe zit het met de vergoeding?",
    a: "Je verdient mee voor elke aanmelding via jouw code. De precieze afspraken maken we persoonlijk per mail, zodat het past bij jou. Uitbetalen doen we aan het eind van elke maand, zonder ingewikkeld dashboard.",
  },
  {
    q: "Ik heb geen grote following, maar maak wel graag content. Kan ik meedoen?",
    a: "Zeker. Naast ambassadeurs werken we ook met makers die vooral goede content maken. Die content zetten wij in op onze eigen kanalen en in campagnes. Groot bereik is dan niet nodig het gaat om echte, eerlijke beelden. Laat het weten in je mail.",
  },
  {
    q: "Zit ik ergens aan vast?",
    a: "Nee. Er zijn geen targets, geen minimale posts en geen looptijd. Je werkt met Let's dog samen wanneer en hoe het bij je past.",
  },
];
