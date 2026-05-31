"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { faqCategories } from "./faq-data";

function FaqItem({
  q,
  a,
  number,
  buttonId,
  panelId,
}: {
  q: string;
  a: string;
  number: string;
  buttonId: string;
  panelId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#141414]/10">
      <button
        id={buttonId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 py-5 text-left cursor-pointer group"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span
          className="font-heading font-bold text-sm text-[#FFA580] tabular-nums w-6 flex-shrink-0"
          aria-hidden="true"
        >
          {number}
        </span>
        <span className="flex-1 font-medium text-[#141414] text-[16px] group-hover:text-[#75876D] transition-colors duration-200">
          {q}
        </span>
        <ChevronDown
          size={18}
          className={`text-[#75876D] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="pb-5 pl-10"
        >
          <p className="text-[#141414]/65 text-[15px] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function FaqContent() {
  // Filter empty categories, then compute the starting global index for each
  let _offset = 0;
  const categoriesWithOffsets = faqCategories
    .filter((c) => c.faqs.length > 0)
    .map((cat) => {
      const start = _offset;
      _offset += cat.faqs.length;
      return { ...cat, start };
    });

  return (
    <>
      {/* Hero — beige split */}
      <section className="relative bg-[#EFE8E4] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[#141414] leading-[1.05] tracking-tight mb-7">
              Vragen? Wij hebben de{" "}
              <span className="text-[#FFA580]">antwoorden.</span>
            </h1>
            <p className="text-[#141414]/70 text-lg leading-relaxed mb-8 max-w-lg">
              Alles wat je wilt weten over Let&apos;s Dog — van onze
              trainingsmethode tot je abonnement.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#75876D] text-white font-semibold text-[16px] hover:bg-[#65775D] transition-colors duration-200"
            >
              Stel je vraag
            </Link>
          </div>

          {/* Category overview card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#141414]/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#141414]/8">
              <p className="text-xs font-semibold text-[#141414]/50 uppercase tracking-widest">
                Categorieën
              </p>
            </div>
            <div className="p-2">
              {categoriesWithOffsets.map(({ name, slug, faqs }) => (
                <a
                  key={slug}
                  href={`#${slug}`}
                  className="flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-xl hover:bg-[#EFE8E4]/60 transition-colors duration-150 group"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#DFF0C3] flex items-center justify-center">
                    <ChevronRight
                      size={14}
                      className="text-[#75876D] group-hover:translate-x-0.5 transition-transform"
                      strokeWidth={2.5}
                    />
                  </div>
                  <span className="flex-1 font-medium text-[#141414] text-[15px] group-hover:text-[#75876D] transition-colors">
                    {name}
                  </span>
                  <span className="text-xs font-semibold text-[#75876D] bg-[#EFE8E4] px-2.5 py-1 rounded-full whitespace-nowrap">
                    {faqs.length}{" "}vragen
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ accordion list */}
      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          {categoriesWithOffsets.map(({ name, slug, faqs, start }) => (
            <section key={slug} id={slug} aria-label={name}>
              <div className="mb-6">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#DFF0C3] text-[#162A0E] text-xs font-bold uppercase tracking-widest">
                  {name}
                </span>
              </div>
              <div>
                {faqs.map(({ q, a }, localIndex) => {
                  const globalNumber = start + localIndex + 1;
                  const number = String(globalNumber).padStart(2, "0");
                  const buttonId = `${slug}-${localIndex}-btn`;
                  const panelId = `${slug}-${localIndex}-panel`;
                  return (
                    <FaqItem
                      key={q}
                      q={q}
                      a={a}
                      number={number}
                      buttonId={buttonId}
                      panelId={panelId}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </SectionWrapper>

      {/* Still have questions — ends light (R2) */}
      <SectionWrapper className="bg-[#EFE8E4]">
        <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <h3 className="font-heading font-bold text-xl text-[#141414] mb-3">
            Staat je vraag er niet bij?
          </h3>
          <p className="text-[#141414]/60 text-[15px] mb-6">
            Stuur ons een bericht. We antwoorden binnen 1{" "}werkdag.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-6 py-3 rounded-full bg-[#75876D] text-white font-medium text-[15px] hover:bg-[#65775D] transition-colors duration-200 cursor-pointer"
          >
            Stel je vraag
          </Link>
        </div>
      </SectionWrapper>
    </>
  );
}
