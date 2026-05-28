import Image from "next/image";
import { asset } from "@/lib/utils";

export function FinalCta() {
  return (
    <section
      className="relative bg-[#162A0E] py-20 lg:py-32 px-6 lg:px-8 overflow-hidden"
      aria-label="Begin nu met Let's Dog"
    >
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
        {/* Content */}
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#DFF0C3]">
            <span className="w-3 h-px bg-[#DFF0C3]" />
            Begin vandaag
          </span>

          <h2 className="font-heading font-bold text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.0] tracking-[-0.025em] text-white mt-6 mb-7">
            Je pup wacht niet.<br />
            <span className="text-[#FFA580]">Jij hoeft ook niet.</span>
          </h2>

          <p className="text-white/72 text-[18px] leading-[1.55] max-w-[44ch] mb-10">
            Maak een gratis account. De puppyagenda, je eerste videoles en de community staan voor je klaar.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-4">
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 rounded-full bg-[#FFA580] text-[#141414] text-[16px] font-semibold hover:bg-[#ff9060] transition-colors duration-200 cursor-pointer"
            >
              Maak een gratis account
            </a>
            <p className="text-white/55 text-[14px]">
              Gratis starten. Geen creditcard.
            </p>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden">
          <Image
            src={asset("/images/kid-dog.jpeg")}
            alt="Kind met hun puppy"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
