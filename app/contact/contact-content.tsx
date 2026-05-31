"use client";

import { useState } from "react";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { ContactFormModal } from "./contact-form-modal";
import { Send, Mail, Phone, ExternalLink, Sparkles, Heart } from "lucide-react";

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
      <section className="bg-[#EFE8E4] pt-32 pb-16 md:pt-40 md:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-[#141414] leading-[1.05] mb-6">
              Neem <span className="text-[#FFA580]">contact</span> op
            </h1>
            <p className="text-lg md:text-xl text-[#141414]/70 leading-relaxed mb-8 max-w-xl">
              Vragen over puppytraining, je lidmaatschap of welk ras bij je past?
              Stel ze gerust — onze gecertificeerde gedragstherapeuten denken graag
              met je mee.
            </p>

            {/* Status pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#162A0E]">
                <span className="w-2 h-2 rounded-full bg-[#75876D]" aria-hidden="true" />
                Antwoord binnen 1 werkdag
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#162A0E]">
                <span className="w-2 h-2 rounded-full bg-[#FFA580]" aria-hidden="true" />
                Persoonlijk contact
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#75876D] px-7 py-3.5 text-white font-semibold hover:bg-[#647558] transition-colors cursor-pointer"
              >
                <Send size={18} strokeWidth={2} />
                Stuur een bericht
              </button>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#75876D] px-7 py-3.5 text-[#162A0E] font-semibold hover:bg-[#75876D]/10 transition-colors"
              >
                <WhatsAppIcon />
                App via WhatsApp
              </a>
            </div>
          </div>

          {/* Hero image — swappable placeholder; drop the mockup photo into
              public/images/ and update the src + run npm run optimize:images */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-sm">
              <OptimizedImage
                src="/images/training.jpeg"
                alt="Hondeneigenaar met pup buiten in het gras"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-[#FFA580] px-4 py-2 text-sm font-semibold text-[#141414] shadow-lg">
              <Heart size={15} strokeWidth={2.5} />
              We helpen je graag verder
            </div>
          </div>
        </div>
      </section>

      {/* Trainer consultation card */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl overflow-hidden shadow-sm grid lg:grid-cols-2">
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#EFE8E4] px-4 py-1.5 mb-5 text-xs font-semibold uppercase tracking-widest text-[#75876D]">
              <Sparkles size={14} strokeWidth={2} />
              Persoonlijk advies
            </span>
            <h2 className="font-heading font-bold text-3xl text-[#141414] mb-4 leading-tight">
              Consult met een gecertificeerde trainer
            </h2>
            <p className="text-[#141414]/70 text-[16px] leading-relaxed mb-4">
              Boek een persoonlijk videogesprek met onze gedragstherapeut. Bespreek
              het gedrag van je hond en krijg een concreet plan van aanpak.
            </p>
            <p className="text-[#141414] font-bold text-2xl mb-6">
              €39,50{" "}
              <span className="text-sm font-normal text-[#141414]/50">incl. BTW</span>
            </p>
            <a
              href="https://app.letsdog.nl/consult/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 self-start px-7 py-3.5 rounded-full bg-[#75876D] text-white font-semibold text-[16px] hover:bg-[#647558] transition-colors cursor-pointer"
            >
              Boek een consult
              <ExternalLink size={16} strokeWidth={2} />
            </a>
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
            <h2 className="font-heading font-bold text-3xl text-[#141414] mb-3">
              Direct bereikbaar
            </h2>
            <p className="text-[#141414]/60 text-[16px]">
              Liever direct contact? Stuur een mailtje, bel ons of app via WhatsApp.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {/* Email */}
            <a
              href="mailto:mail@letsdog.nl"
              className="flex items-start gap-4 bg-white rounded-2xl p-6 border border-[#141414]/8 shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#DFF0C3] flex items-center justify-center">
                <Mail size={19} className="text-[#75876D]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#141414]/50 uppercase tracking-widest mb-1">
                  E-mail
                </p>
                <p className="text-[#141414] font-semibold text-[15px]">mail@letsdog.nl</p>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:0857444161"
              className="flex items-start gap-4 bg-white rounded-2xl p-6 border border-[#141414]/8 shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#DFF0C3] flex items-center justify-center">
                <Phone size={19} className="text-[#75876D]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#141414]/50 uppercase tracking-widest mb-1">
                  Telefoon
                </p>
                <p className="text-[#141414] font-semibold text-[15px]">085 744 4161</p>
              </div>
            </a>

            {/* WhatsApp */}
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 bg-white rounded-2xl p-6 border border-[#141414]/8 shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#DFF0C3] flex items-center justify-center">
                <WhatsAppIcon className="w-[19px] h-[19px] text-[#75876D]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#141414]/50 uppercase tracking-widest mb-1">
                  WhatsApp
                </p>
                <p className="text-[#141414] font-semibold text-[15px]">
                  Start een chat — direct antwoord
                </p>
              </div>
            </a>
          </div>
        </div>
      </SectionWrapper>

      {/* Contact form modal */}
      <ContactFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
