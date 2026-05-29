import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/utils";

export function Hero() {
  return (
    <section
      className="relative bg-[#75876D] flex flex-col lg:flex-row lg:items-center lg:min-h-[100dvh] overflow-hidden"
      aria-label="Hero"
    >
      {/* Mobile: visible image at top */}
      <div className="relative w-full aspect-[16/10] lg:hidden">
        <Image
          src={asset("/images/hero.jpeg")}
          alt="Twee vrouwen lachen met hun honden"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#75876D]/60 via-transparent to-[#75876D]" />
      </div>

      {/* Desktop: absolute right-half background */}
      <div className="absolute inset-0 left-[45%] hidden lg:block">
        <Image
          src={asset("/images/hero.jpeg")}
          alt="Twee vrouwen lachen met hun honden"
          fill
          priority
          sizes="55vw"
          className="object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#75876D] via-[#75876D]/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full pt-6 pb-12 lg:pt-40 lg:pb-32">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <p className="flex items-center gap-3 text-sm md:text-base font-medium text-white/80 mb-10 uppercase tracking-widest">
            <span className="h-px w-8 bg-white/60 inline-block" />
            Welzijnsgerichte puppytraining
          </p>

          {/* H1 */}
          <h1 className="font-heading font-bold text-5xl md:text-7xl lg:text-[6rem] text-white leading-[1.02] tracking-tight mb-10">
            Jouw pup begrijpen.
            <br />
            <span className="text-[#DFF0C3]">Samen groeien.</span>
          </h1>

          {/* Subtext — empathie eerst */}
          <p className="text-lg lg:text-2xl text-white/85 leading-relaxed mb-12 max-w-xl">
            Nieuwe pup thuis. Blij, en totaal de kluts kwijt. Wij geven je een dagelijks plan, zodat jij weet wat je doet en je pup weet wat hij kan verwachten.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/prijzen"
              className="inline-flex items-center px-8 py-4 rounded-full bg-[#FFA580] text-[#141414] text-[17px] font-semibold hover:bg-[#ff9060] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
            >
              Start vandaag
            </Link>
            <p className="text-sm text-white/60">
              Opzegbaar in de app
            </p>
          </div>

          {/* Trust nudge */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[asset("/images/community.jpeg"), asset("/images/training.jpeg"), asset("/images/about.jpeg")].map(
                (src, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[#75876D] overflow-hidden bg-[#DFF0C3]"
                  >
                    <Image
                      src={src}
                      alt=""
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )
              )}
            </div>
            <p className="text-sm text-white/70">
              Al meer dan <strong className="text-white">500 puppy&apos;s</strong> op weg geholpen
            </p>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#EFE8E4] to-transparent" />
    </section>
  );
}
