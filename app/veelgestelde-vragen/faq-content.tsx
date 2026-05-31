"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { faqCategories } from "./faq-data";

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

export function FaqContent() {
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
          {faqCategories.map(({ name, faqs }) => (
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
