import Image from "next/image";
import { asset } from "@/lib/utils";

export function FinalCta() {
  return (
    <section
      className="relative bg-[#162A0E] overflow-hidden py-24 lg:py-32 px-6 lg:px-8"
      aria-label="Begin nu met Let's Dog"
    >
      {/* Background image */}
      <div className="absolute inset-0 opacity-20">
        <Image
          src={asset("/images/kid-dog.jpeg")}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#162A0E]/60 via-transparent to-[#162A0E]/80" />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <p className="text-sm font-semibold text-[#DFF0C3] uppercase tracking-widest mb-5">
          Begin vandaag
        </p>
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight mb-6 tracking-tight">
          Je pup wacht niet.
          <br />
          Jij hoeft ook niet.
        </h2>
        <p className="text-white/65 text-lg leading-relaxed mb-10 max-w-md mx-auto">
          Maak een gratis account en start direct. De puppyagenda, je eerste videoles en de community staan voor je klaar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://app.letsdog.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 rounded-full bg-[#FFA580] text-[#141414] text-[16px] font-bold hover:bg-[#ff9060] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
          >
            Maak een gratis account
          </a>
          <p className="text-white/40 text-sm">
            7 dagen proberen · opzegbaar in de app
          </p>
        </div>

        {/* Risk reduction */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            "Gecertificeerde trainers",
            "Welzijnsgericht",
            "Veilig via Mollie",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-white/50">
              <div className="w-1 h-1 rounded-full bg-[#75876D]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
