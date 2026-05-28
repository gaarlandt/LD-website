import Image from "next/image";
import { asset } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "Elien is enthousiast, betrokken en kijkt echt naar wat jij en je hond nodig hebben. We voelen ons gesteund en onze puppy leert zichtbaar veel.",
    name: "Silke",
    location: "Huizen",
  },
  {
    quote:
      "Elien begeleidde ons met veel kennis en geduld. Dankzij haar advies maakten we de juiste keuze bij het uitzoeken van het ras, de fokker en de hond. Haar begeleiding in de opvoeding van ons lieve Guus was onmisbaar.",
    name: "Saskia",
    location: "Naarden",
  },
];

export function Trust() {
  return (
    <section
      id="bewijs"
      className="bg-[#EFE8E4] py-20 lg:py-32 px-6 lg:px-8"
    >
      <div className="max-w-[1180px] mx-auto">
        {/* Testimonials */}
        <div className="max-w-[860px] mx-auto">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Wat eigenaren zeggen
          </span>
          <h2 className="font-heading font-bold text-[30px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-[#141414] mt-4 mb-16 lg:mb-20 max-w-[20ch]">
            We bouwen Let&apos;s Dog samen met onze eerste leden.
          </h2>

          <div className="space-y-14 lg:space-y-20">
            {testimonials.map(({ quote, name, location }, i) => (
              <figure key={name}>
                <blockquote className="font-heading font-medium text-[22px] lg:text-[30px] leading-[1.35] tracking-[-0.01em] text-[#141414] max-w-[42ch]">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-[14px]">
                  <span className="w-8 h-px bg-[#75876D]" />
                  <span className="text-[#75876D] font-semibold">
                    {name}, {location}
                  </span>
                </figcaption>
                {i < testimonials.length - 1 && (
                  <div className="mt-14 lg:mt-20 border-t border-[#141414]/8" />
                )}
              </figure>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mt-24 lg:mt-32 pt-16 border-t border-[#141414]/8 max-w-[860px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
                Erkend
              </span>
              <h3 className="font-heading font-bold text-[24px] lg:text-[30px] leading-[1.15] tracking-[-0.015em] text-[#141414] mt-4 mb-4">
                Aangesloten bij NVGH en de Raad van Beheer.
              </h3>
              <p className="text-[#141414]/65 text-[16px] leading-[1.65] max-w-[52ch]">
                Elien is geregistreerd bij de Nederlandse Vereniging voor Gedragshulpverleners Honden en erkend opleider voor puppycursussen door de Raad van Beheer.
              </p>
            </div>
            <div className="relative">
              <Image
                src={asset("/images/NVGH Logo.jpeg")}
                alt="NVGH en Raad van Beheer certificeringslogo's"
                width={220}
                height={90}
                className="w-[180px] lg:w-[220px] h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
