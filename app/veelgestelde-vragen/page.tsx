"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionWrapper } from "@/components/shared/section-wrapper";

const categories = [
  {
    name: "Over de app",
    faqs: [
      {
        q: "Wat is Let's Dog precies?",
        a: "Let's Dog is een web app voor puppy-eigenaren. Je vindt er een puppyagenda, videolessen van gecertificeerde trainers, audio-lessen voor onderweg en een community van andere eigenaren. Alles op één plek, stap voor stap opgebouwd.",
      },
      {
        q: "Heb ik een smartphone nodig?",
        a: "Nee. De web app werkt op elke browser — laptop, tablet of telefoon. Je kunt ook inloggen via de mobiele app als je video's in het veld wilt bekijken tijdens een trainingssessie.",
      },
      {
        q: "Wanneer is de app beschikbaar?",
        a: "De web app is nu live op app.letsdog.nl. Maak een gratis account en begin direct.",
      },
    ],
  },
  {
    name: "Training",
    faqs: [
      {
        q: "Werkt de methode voor elk ras?",
        a: "Ja. We werken met welzijnsgerichte methodes die zijn gebaseerd op hoe honden leren — ongeacht ras. Wel is elke hond uniek, en de puppyagenda houdt rekening met individuele verschillen.",
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
    faqs: [
      {
        q: "Wat kost het abonnement?",
        a: "Drie smaken: Flexibel €12,99/maand (maandelijks opzegbaar), Early Member €59/eerste jaar (daarna €99 — onze launch-prijs), of Jaar + Consult €79/eerste jaar inclusief een 1-op-1 online consult. Betaling verloopt via Mollie.",
      },
      {
        q: "Kan ik opzeggen wanneer ik wil?",
        a: "Ja. Er is geen minimale looptijd. Je kunt opzeggen wanneer het jou uitkomt.",
      },
      {
        q: "Via welke betaalmethoden kan ik betalen?",
        a: "Via Mollie accepteren we iDEAL, creditcard, Bancontact en meer gangbare methoden.",
      },
      {
        q: "Wat als ik niet tevreden ben?",
        a: "Neem contact op via het contactformulier. We zoeken altijd een oplossing.",
      },
    ],
  },
  {
    name: "Technisch",
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#141414]/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group"
        aria-expanded={open}
      >
        <span className="font-medium text-[#141414] text-[16px] group-hover:text-[#75876D] transition-colors duration-200">
          {q}
        </span>
        <ChevronDown
          size={18}
          className={`text-[#75876D] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-[#141414]/65 text-[15px] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <>
      {/* Hero */}
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">FAQ</p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight max-w-xl">
            Veelgestelde vragen.
          </h1>
        </div>
      </div>

      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="max-w-2xl mx-auto space-y-12">
          {categories.map(({ name, faqs }) => (
            <div key={name}>
              <h2 className="font-heading font-bold text-xl text-[#141414] mb-2 pb-3 border-b border-[#141414]/15">
                {name}
              </h2>
              <div>
                {faqs.map(({ q, a }) => (
                  <FaqItem key={q} q={q} a={a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="max-w-2xl mx-auto mt-16 bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <h3 className="font-heading font-bold text-xl text-[#141414] mb-3">Staat je vraag er niet bij?</h3>
          <p className="text-[#141414]/60 text-[15px] mb-6">Stuur ons een bericht. We antwoorden binnen 1 werkdag.</p>
          <a
            href="/contact"
            className="inline-flex items-center px-6 py-3 rounded-full bg-[#75876D] text-white font-medium text-[15px] hover:bg-[#65775D] transition-colors duration-200 cursor-pointer"
          >
            Stel je vraag
          </a>
        </div>
      </SectionWrapper>
    </>
  );
}
