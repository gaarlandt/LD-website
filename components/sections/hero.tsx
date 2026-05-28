import Image from "next/image";
import { asset } from "@/lib/utils";

export function Hero() {
  return (
    <section
      className="relative bg-[#75876D] overflow-hidden"
      aria-label="Hero"
    >
      {/* Mobile image */}
      <div className="relative w-full aspect-[16/11] lg:hidden">
        <Image
          src={asset("/images/hero.jpeg")}
          alt="Twee vrouwen lachen met hun honden"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#75876D]" />
      </div>

      {/* Desktop: image bleeds right */}
      <div className="absolute inset-y-0 right-0 hidden lg:block lg:w-[48%]">
        <Image
          src={asset("/images/hero.jpeg")}
          alt="Twee vrouwen lachen met hun honden"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#75876D] via-[#75876D]/15 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1180px] mx-auto px-6 lg:px-8 pt-10 pb-20 lg:pt-40 lg:pb-28 lg:min-h-[78dvh] lg:flex lg:items-center">
        <div className="max-w-[640px]">
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#DFF0C3]">
            <span className="w-3 h-px bg-[#DFF0C3]" />
            Welzijnsgerichte puppytraining
          </span>

          <h1 className="font-heading font-bold text-[44px] sm:text-[56px] lg:text-[76px] leading-[0.98] tracking-[-0.025em] text-white mt-6 mb-7">
            Jouw pup begrijpen.<br />
            <span className="text-[#DFF0C3]">Samen groeien.</span>
          </h1>

          <p className="text-white/85 text-[18px] lg:text-[20px] leading-[1.55] max-w-[40ch] mb-9">
            Nieuwe pup thuis. Blij, en totaal de kluts kwijt. Wij geven je een dagelijks plan, zodat jij weet wat je doet en je pup weet wat hij kan verwachten.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-6 gap-y-4 mb-12">
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#FFA580] text-[#141414] text-[15px] font-semibold hover:bg-[#ff9060] transition-colors duration-200 cursor-pointer"
            >
              Maak een gratis account
            </a>
            <p className="text-[13px] text-white/60">
              Gratis starten. Geen creditcard.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-8 border-t border-white/15">
            <div className="flex -space-x-2">
              {[asset("/images/community.jpeg"), asset("/images/training.jpeg"), asset("/images/about.jpeg")].map(
                (src, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-[#75876D] overflow-hidden bg-[#DFF0C3]"
                  >
                    <Image
                      src={src}
                      alt=""
                      width={36}
                      height={36}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )
              )}
            </div>
            <p className="text-[14px] text-white/75 leading-snug">
              <strong className="text-white font-semibold">500+ puppy&apos;s</strong>
              {" "}gingen je voor.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
