"use client";

import { useState } from "react";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { ContactFormModal } from "./contact-form-modal";
import { Button, Card, Badge, Eyebrow } from "@/components/ui";
import {
  PaperPlaneTilt,
  Envelope,
  Phone,
  ArrowSquareOut,
  Sparkle,
  Heart,
} from "@phosphor-icons/react/dist/ssr";

const WHATSAPP_HREF = `https://wa.me/31648362054?text=${encodeURIComponent(
  "Hoi! Ik heb een vraag over Let's Dog.",
)}`;

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export function ContactContent() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Hero — beige split */}
      <section className="bg-[var(--ld-beige)] pt-32 pb-16 md:pt-40 md:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-[var(--ld-text)] leading-[1.05] mb-6">
              Neem <span className="text-[var(--ld-peach)]">contact</span> op
            </h1>
            <p className="text-lg md:text-xl text-[var(--ld-text-muted)] leading-relaxed mb-8 max-w-xl">
              Vragen over puppytraining, je lidmaatschap of welk ras bij je past?
              Stel ze gerust — onze gecertificeerde gedragstherapeuten denken graag
              met je mee.
            </p>

            {/* Status pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Badge>
                <span className="w-2 h-2 rounded-full bg-[var(--ld-green)] flex-shrink-0" aria-hidden="true" />
                Antwoord binnen 1 werkdag
              </Badge>
              <Badge>
                <span className="w-2 h-2 rounded-full bg-[var(--ld-peach)] flex-shrink-0" aria-hidden="true" />
                Persoonlijk contact
              </Badge>
            </div>

            {/* CTA — single, clean action; left of centre, a touch lower */}
            <div className="mt-8 flex justify-center max-w-md">
              <Button variant="brand" pill onClick={() => setModalOpen(true)}>
                <PaperPlaneTilt size={18} />
                Stuur een bericht
              </Button>
            </div>
          </div>

          {/* Hero image — swappable placeholder; drop the mockup photo into
              public/images/ and update the src + run npm run optimize:images */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-[var(--ld-r-xl)] overflow-hidden shadow-[var(--ld-sh-1)]">
              <OptimizedImage
                src="/images/training.jpeg"
                alt="Hondeneigenaar met pup buiten in het gras"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-4 left-4">
              <Badge tone="peach" className="font-semibold shadow-[var(--ld-sh-3)]">
                <Heart size={15} weight="fill" />
                We helpen je graag verder
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Trainer consultation card */}
      <SectionWrapper className="bg-[var(--ld-beige)]">
        <div className="max-w-5xl mx-auto bg-white rounded-[var(--ld-r-xl)] overflow-hidden shadow-[var(--ld-sh-1)] grid lg:grid-cols-2">
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 self-start mb-5">
              <Sparkle size={14} className="text-[var(--ld-green)]" />
              <Eyebrow tone="brand">Persoonlijk advies</Eyebrow>
            </div>
            <h2 className="font-heading font-bold text-3xl text-[var(--ld-text)] mb-4 leading-tight">
              Consult met een gecertificeerde trainer
            </h2>
            <p className="text-[var(--ld-text-muted)] text-[16px] leading-relaxed mb-4">
              Boek een persoonlijk videogesprek met onze gedragstherapeut. Bespreek
              het gedrag van je hond en krijg een concreet plan van aanpak.
            </p>
            <p className="text-[var(--ld-text)] font-bold text-2xl mb-6">
              €39,50{" "}
              <span className="text-sm font-normal text-[var(--ld-text-subtle)]">incl. BTW</span>
            </p>
            <Button variant="brand" pill asChild className="self-start">
              <a
                href="https://app.letsdog.nl/consult/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Boek een consult
                <ArrowSquareOut size={16} />
              </a>
            </Button>
          </div>

          <div className="relative min-h-[260px] lg:min-h-0">
            <OptimizedImage
              src="/images/problem.jpeg"
              alt="Hond met eigenaar — persoonlijk consult"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* Direct contact — three cards */}
      <SectionWrapper className="bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-3xl text-[var(--ld-text)] mb-3">
              Direct bereikbaar
            </h2>
            <p className="text-[var(--ld-text-muted)] text-[16px]">
              Liever direct contact? Stuur een mailtje, bel ons of app via WhatsApp.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {/* Email */}
            <a href="mailto:mail@letsdog.nl" className="group block h-full">
              <Card hover className="flex items-start gap-4 h-full">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[var(--ld-lime)] flex items-center justify-center">
                  <Envelope size={19} className="text-[var(--ld-green)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--ld-text-subtle)] uppercase tracking-widest mb-1">
                    E-mail
                  </p>
                  <p className="text-[var(--ld-text)] font-semibold text-[15px]">mail@letsdog.nl</p>
                </div>
              </Card>
            </a>

            {/* Phone */}
            <a href="tel:0857444161" className="group block h-full">
              <Card hover className="flex items-start gap-4 h-full">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[var(--ld-lime)] flex items-center justify-center">
                  <Phone size={19} className="text-[var(--ld-green)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--ld-text-subtle)] uppercase tracking-widest mb-1">
                    Telefoon
                  </p>
                  <p className="text-[var(--ld-text)] font-semibold text-[15px]">085 744 4161</p>
                </div>
              </Card>
            </a>

            {/* WhatsApp */}
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full"
            >
              <Card hover className="flex items-start gap-4 h-full">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[var(--ld-lime)] flex items-center justify-center">
                  <WhatsAppIcon className="w-[19px] h-[19px] text-[var(--ld-green)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--ld-text-subtle)] uppercase tracking-widest mb-1">
                    WhatsApp
                  </p>
                  <p className="text-[var(--ld-text)] font-semibold text-[15px]">
                    Start een chat — direct antwoord
                  </p>
                </div>
              </Card>
            </a>
          </div>
        </div>
      </SectionWrapper>

      {/* Contact form modal */}
      <ContactFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
