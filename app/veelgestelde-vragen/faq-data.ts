// FAQ source data — shared between the rendered FAQ page (faq-content.tsx)
// and the FAQPage JSON-LD (page.tsx). Keep these in sync: Google penalises
// FAQ structured data that doesn't mirror the visible Q/A text.

export type FaqEntry = { q: string; a: string };
export type FaqCategory = { name: string; slug: string; faqs: FaqEntry[] };

export const faqCategories: FaqCategory[] = [
  {
    name: "Over de app",
    slug: "over-de-app",
    faqs: [
      {
        q: "Wat is Let's dog precies?",
        a: "Let's dog is een web app voor puppy-eigenaren. Je vindt er een puppyagenda, videolessen van gecertificeerde trainers en audiolessen voor onderweg. Alles op één plek, stap voor stap opgebouwd.",
      },
      {
        q: "Heb ik een smartphone nodig?",
        a: "Nee. Let's dog werkt in elke browser, op je telefoon, tablet of laptop. Je kunt de website op je beginscherm zetten, dan opent hij als een app. Een echte app voor iOS en Android komt later.",
      },
      {
        q: "Wanneer is de app beschikbaar?",
        a: "De web app is live op mijn.letsdog.nl. Meld je aan en begin direct.",
      },
    ],
  },
  {
    name: "Training",
    slug: "training",
    faqs: [
      {
        q: "Werkt de methode voor elk ras?",
        a: "Ja. We werken met welzijnsgerichte methodes die zijn gebaseerd op hoe honden leren, ongeacht ras. Wel is elke hond uniek, en de puppyagenda houdt rekening met individuele verschillen.",
      },
      {
        q: "Mijn pup is al ouder dan 12 weken. Is het te laat?",
        a: "Nee. Het is nooit te laat om te beginnen. De principes achter onze methode werken op elke leeftijd. Sommige dingen gaan makkelijker in de jonge puppyfase, maar veel is ook later nog goed te trainen.",
      },
      {
        q: "Werken jullie met beloningen of straffen?",
        a: "Uitsluitend met beloningen en positieve bekrachtiging. We gebruiken nooit fysieke correcties of straf. Dat is een harde grens.",
      },
    ],
  },
  {
    name: "Abonnement & betaling",
    slug: "abonnement-betaling",
    faqs: [
      {
        q: "Wat kost het abonnement?",
        a: "Twee smaken. Flexibel is €19,99 per maand, maandelijks opzegbaar en zonder proefperiode: je betaalt direct bij het afsluiten. Early Member is €59 voor het eerste jaar (onze launchprijs, daarna €119) en begint met 7 dagen gratis proberen. Zeg je binnen die 7 dagen op, dan betaal je niets.",
      },
      {
        q: "Kan ik opzeggen wanneer ik wil?",
        a: "Ja, opzeggen kan altijd via je account op mijn.letsdog.nl, onder Profiel en dan Abonnement. Bij het maandabonnement stopt het abonnement aan het einde van de lopende maand; terugbetaling van die maand is niet mogelijk. Bij een jaarabonnement stopt het abonnement aan het einde van het jaar. Zeg je binnen de eerste 7 dagen op, dan gaat de afschrijving niet door en betaal je niets, en stopt je abonnement na die 7 dagen.",
      },
      {
        q: "Via welke betaalmethoden kan ik betalen?",
        a: "Betalen gaat via Stripe. Je kunt kiezen uit iDEAL, creditcard en SEPA-incasso. Betaal je met iDEAL, dan geef je bij die betaling meteen een machtiging af waarmee we de verlenging later automatisch incasseren.",
      },
      {
        q: "Waarom zie ik bij het jaarabonnement eerst €0,01 op mijn afschrift?",
        a: "Dat is een controle van je bank, geen betaling. Om de machtiging voor de automatische verlenging te kunnen afgeven, schrijft Stripe eenmalig 1 cent af en boekt die direct weer terug. Op je afschrift zie je dus 1 cent af en 1 cent terug. Daarna gebeurt er tijdens je proefperiode niets: pas na 7 dagen schrijven we het jaarbedrag af. Bij het maandabonnement gebeurt dit niet, daar betaal je meteen het maandbedrag.",
      },
    ],
  },
  {
    name: "Technisch",
    slug: "technisch",
    faqs: [
      {
        q: "Werkt de app ook offline?",
        a: "Nog niet. Je hebt een internetverbinding nodig. Offline lessen bekijken staat op de planning maar is er bij de start niet.",
      },
      {
        q: "Hoe beveiligen jullie mijn gegevens?",
        a: "Je gegevens worden veilig opgeslagen en worden nooit verkocht. Je betaalgegevens gaan rechtstreeks naar onze betaalprovider Stripe en zijn bij ons nooit zichtbaar.",
      },
    ],
  },
];
