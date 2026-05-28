"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { asset } from "@/lib/utils";

const steps = [
  {
    label: "Een",
    title: "Maak een account",
    body:
      "Gratis aanmelden met je naam en e-mailadres. Direct toegang tot de web app, zonder app store.",
  },
  {
    label: "Twee",
    title: "Kijk je eerste les",
    body:
      "Start met de puppyagenda of duik meteen in de videolessen. Alles is opgebouwd zodat je weet waar je begint.",
  },
  {
    label: "Drie",
    title: "Stel je voor",
    body:
      "Vertel wie jij en je pup zijn. Maak kennis met andere eigenaren die hetzelfde meemaken. Je staat er niet alleen voor.",
  },
];

export function HowItWorks() {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <section id="hoe-het-werkt" className="bg-[#FAF6F2] py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-[620px] mb-16 lg:mb-20">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Zo begin je
          </span>
          <h2 className="font-heading font-bold text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-[#141414] mt-4 mb-4">
            In drie stappen aan de slag.
          </h2>
          <p className="text-[#141414]/65 text-[17px] leading-[1.6]">
            Geen installatie, geen gedoe. Vanavond nog beginnen kan.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12 mb-20 lg:mb-24">
          {steps.map(({ label, title, body }) => (
            <div key={title} className="relative">
              <div className="flex items-center gap-3 mb-5">
                <span className="font-heading text-[14px] uppercase tracking-[0.18em] font-semibold text-[#75876D]">
                  {label}
                </span>
                <span className="flex-grow h-px bg-[#141414]/15" />
              </div>
              <h3 className="font-heading font-bold text-[24px] lg:text-[28px] text-[#141414] mb-3 leading-tight tracking-[-0.015em]">
                {title}
              </h3>
              <p className="text-[#141414]/65 text-[15px] lg:text-[16px] leading-[1.65] max-w-[36ch]">
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile app cross-sell */}
        <div className="rounded-[28px] overflow-hidden aspect-[4/3] md:aspect-[21/8] relative">
          <Image
            src={asset("/images/training.jpeg")}
            alt="Eigenaar traint zijn hond in het park"
            fill
            sizes="100vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#162A0E]/85 via-[#162A0E]/55 to-transparent flex items-end md:items-center p-7 md:px-12 lg:px-16">
            <div className="max-w-[420px]">
              <p className="font-heading font-bold text-[22px] md:text-[28px] text-white mb-3 md:mb-4 leading-tight tracking-[-0.015em]">
                De mobile app is er voor onderweg.
              </p>
              <p className="text-white/80 text-[14px] md:text-[15px] leading-[1.6]">
                Bekijk video&apos;s tijdens je wandeling of trainingssessie. De web app is het hart, de mobile app ondersteunt.
              </p>
            </div>
          </div>
        </div>

        {/* App Store badges */}
        <div className="flex items-center justify-center gap-3 mt-8 relative">
          <button
            onClick={() => setShowToast(true)}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            aria-label="Download in de App Store (binnenkort beschikbaar)"
          >
            <Image
              src={asset("/images/app-store-badge.svg")}
              alt="Download on the App Store"
              width={140}
              height={42}
              className="h-[42px] w-auto"
            />
          </button>
          <button
            onClick={() => setShowToast(true)}
            className="opacity-70 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            aria-label="Download in Google Play (binnenkort beschikbaar)"
          >
            <Image
              src={asset("/images/google-play-badge.png")}
              alt="Get it on Google Play"
              width={156}
              height={46}
              className="h-[42px] w-auto"
            />
          </button>

          {/* Toast */}
          <div
            className={`absolute -top-12 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-[#141414] text-white text-sm font-medium rounded-full shadow-lg transition-all duration-300 whitespace-nowrap ${
              showToast
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
            role="status"
            aria-live="polite"
          >
            Binnenkort beschikbaar
          </div>
        </div>
      </div>
    </section>
  );
}
