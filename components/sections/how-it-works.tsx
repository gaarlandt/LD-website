"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { UserPlus, Play, Users } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Maak een account",
    description:
      "Gratis aanmelden met je naam en e-mailadres. Direct toegang tot de web app — geen app store nodig.",
  },
  {
    number: "02",
    icon: Play,
    title: "Kijk je eerste filmpje",
    description:
      "Start met de puppyagenda of duik meteen in de videolessen. Alles is opgebouwd zodat je precies weet waar je begint.",
  },
  {
    number: "03",
    icon: Users,
    title: "Stel je voor in de community",
    description:
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
    <SectionWrapper className="bg-white" id="hoe-het-werkt">
      <div className="text-center mb-16">
        <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-4">
          Zo begin je
        </p>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#141414] leading-tight mb-4">
          In drie stappen aan de slag.
        </h2>
        <p className="text-[#141414]/60 text-lg max-w-md mx-auto">
          Geen gedoe. Geen installatie. Gewoon beginnen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {steps.map(({ number, icon: Icon, title, description }, i) => (
          <div key={title} className="relative flex flex-col">
            {i < steps.length - 1 && (
              <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-[-50%] h-px bg-[#141414]/10" />
            )}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/80 hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-[#75876D] flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-white" strokeWidth={1.75} />
                </div>
                <span className="font-heading font-bold text-4xl text-[#141414]/15">
                  {number}
                </span>
              </div>
              <h3 className="font-heading font-bold text-xl text-[#141414] mb-3">
                {title}
              </h3>
              <p className="text-[#141414]/60 text-[15px] leading-relaxed flex-grow">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Visual: training photo */}
      <div className="rounded-2xl overflow-hidden aspect-[4/3] md:aspect-[21/7] relative">
        <OptimizedImage
          src="/images/training.jpeg"
          alt="Eigenaar traint zijn hond in het park"
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/70 md:from-[#141414]/50 to-transparent flex items-end md:items-center p-6 md:px-10">
          <div className="max-w-sm">
            <p className="font-heading font-bold text-xl md:text-2xl text-white mb-2 md:mb-4 leading-snug">
              De mobile app is er voor onderweg.
            </p>
            <p className="text-white/75 text-sm md:text-[15px] leading-relaxed">
              Bekijk video&apos;s tijdens je wandeling of trainingssessie. De web app is het hart — de app ondersteunt.
            </p>
          </div>
        </div>
      </div>

      {/* App Store badges */}
      <div className="flex items-center justify-center gap-3 mt-8 relative">
        {/* Android (Google Play) — left, live */}
        <a
          href="https://play.google.com/store/apps/details?id=nl.letsdog.app"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          aria-label="Download de Let's Dog app in Google Play"
        >
          <Image
            src={asset("/images/google-play-badge.png")}
            alt="Get it on Google Play"
            width={156}
            height={46}
            className="h-[56px] w-auto"
          />
        </a>
        {/* iOS (App Store) — right, not yet released → toast */}
        <button
          onClick={() => setShowToast(true)}
          className="opacity-90 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          aria-label="Download in de App Store (binnenkort beschikbaar)"
        >
          <Image
            src={asset("/images/app-store-badge.svg")}
            alt="Download on the App Store"
            width={140}
            height={42}
            className="h-[44px] w-auto"
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
    </SectionWrapper>
  );
}
