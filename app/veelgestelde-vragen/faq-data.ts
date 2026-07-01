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
        a: "Let's dog is een web app voor puppy-eigenaren. Je vindt er een puppyagenda, videolessen van gecertificeerde trainers, audio-lessen voor onderweg en een community van andere eigenaren. Alles op één plek, stap voor stap opgebouwd.",
      },
      {
        q: "Heb ik een smartphone nodig?",
        a: "Nee. De web app werkt op elke browser, laptop, tablet of telefoon. Je kunt ook inloggen via de mobiele app als je video's in het veld wilt bekijken tijdens een trainingssessie.",
      },
      {
        q: "Wanneer is de app beschikbaar?",
        a: "De web app is nu live op app.letsdog.nl. Meld je aan en begin direct.",
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
        a: "Twee smaken: Flexibel €19,99/maand (maandelijks opzegbaar, niet restitueerbaar) of Early Member €59/eerste jaar (onze launch-prijs, daarna €119,-). Je betaalt pas na 7 dagen, dus de eerste 7 dagen zijn vrijblijvend.",
      },
      {
        q: "Kan ik opzeggen wanneer ik wil?",
        a: "Ja, opzeggen kan altijd via de accountinstellingen in de app. Bij het maandabonnement stopt het abonnement aan het einde van de lopende maand; terugbetaling van die maand is niet mogelijk. Bij een jaarabonnement stopt het abonnement aan het einde van het jaar. Zeg je binnen de eerste 7 dagen op, dan gaat de afschrijving niet door en betaal je niets, en stopt je abonnement na die 7 dagen.",
      },
      {
        q: "Via welke betaalmethoden kan ik betalen?",
        a: "Via Mollie accepteren we iDEAL en de creditcard.",
      },
      {
        q: "Waarom wordt er eerst €0,10 afgeschreven?",
        a: "Om je abonnement automatisch te kunnen verlengen, zetten we via Mollie een doorlopende machtiging op. iDEAL ondersteunt zelf geen automatische incasso, daarom doen we een eenmalige verificatiebetaling van €0,10 om je betaalmethode te activeren. Daarna wordt het abonnementsbedrag automatisch afgeschreven — bij Early Member pas na 7 dagen.",
      },
    ],
  },
  {
    name: "Technisch",
    slug: "technisch",
    faqs: [
      {
        q: "Werkt de app ook offline?",
        a: "De web app vereist een internetverbinding. Voor offline gebruik kun je sommige video's downloaden via de mobiele app (iOS/Android).",
      },
      {
        q: "Hoe beveiligen jullie mijn gegevens?",
        a: "Je gegevens worden veilig opgeslagen en worden nooit gedeeld met derden. Betaalinformatie wordt uitsluitend verwerkt via Mollie en is bij ons nooit zichtbaar.",
      },
    ],
  },
];
