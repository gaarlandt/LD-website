"use client";

import { useEffect, useRef, useState } from "react";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { CheckSquare } from "@phosphor-icons/react/dist/ssr";

const phases = [
  {
    phase: "Vóór de komst",
    weeks: "Week −4 t/m −1",
    image: "/images/puppy-harness.jpeg",
    items: [
      "Wat heb je nodig? De complete boodschappenlijst",
      "Hoe bereid je je huis voor?",
      "Eerste nacht: wat te verwachten",
      "Videoles: De voorbereiding",
    ],
  },
  {
    phase: "De eerste weken",
    weeks: "Week 1 t/m 4",
    image: "/images/training.jpeg",
    items: [
      "Socialisatie: wat, wanneer en hoe",
      "Slaaptraining stap voor stap",
      "Basiscommando\u2019s: zitten, blijf, hier",
      "Videoles: Bijten voorkomen",
      "Audio-les: Structuur thuis",
    ],
  },
  {
    phase: "Groei en grenzen",
    weeks: "Week 5 t/m 12",
    image: "/images/beagle.jpeg",
    items: [
      "Puberteit: wat verandert er?",
      "Loslaten en vertrouwen opbouwen",
      "Losse riem lopen",
      "Videoles: Puberteit overleven",
      "Audio-les: Waarom je pup nu terugvalt",
    ],
  },
];

export function PuppyPhases() {
  const [activeIndex, setActiveIndex] = useState(0);
  const phaseRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    phaseRefs.current.forEach((ref, index) => {
      if (!ref) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        { threshold: 0.5, rootMargin: "-30% 0px -30% 0px" }
      );
      observer.observe(ref);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-10">
      {/* Left: one block visible at a time on desktop */}
      <div className="space-y-8 lg:space-y-0 max-w-lg lg:mx-auto">
        {phases.map(({ phase, weeks, items, image }, i) => (
          <div
            key={phase}
            ref={(el) => { phaseRefs.current[i] = el; }}
            className="lg:min-h-[60vh] lg:flex lg:items-center"
          >
            <div
              className={`w-full bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-500 lg:transition-all lg:duration-500 ${
                i === activeIndex
                  ? "lg:opacity-100 lg:translate-y-0 lg:scale-100"
                  : "lg:opacity-30 lg:translate-y-0 lg:scale-[0.97]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h3 className="font-heading font-bold text-xl text-[#141414]">
                  {phase}
                </h3>
                <span className="inline-flex px-3 py-1 bg-[#75876D]/15 text-[#75876D] text-sm font-medium rounded-full">
                  {weeks}
                </span>
              </div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckSquare
                      size={16}
                      className="text-[#75876D] flex-shrink-0 mt-0.5"
                    />
                    <span className="text-[15px] text-[#141414]/70">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile: show image inline below each phase */}
            <div className="lg:hidden mt-4 rounded-2xl overflow-hidden aspect-[4/3] relative">
              <OptimizedImage
                src={image}
                alt={`${phase} — afbeelding`}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Right: sticky image (desktop only) */}
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <div className="rounded-2xl overflow-hidden aspect-[3/4] relative">
            {phases.map(({ phase, image }, i) => (
              <OptimizedImage
                key={phase}
                src={image}
                alt={`${phase} — afbeelding`}
                fill
                sizes="320px"
                className={`object-cover transition-opacity duration-500 ${
                  i === activeIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
