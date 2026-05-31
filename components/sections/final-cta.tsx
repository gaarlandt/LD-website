import Link from "next/link";

export function FinalCta() {
  return (
    <section
      className="relative bg-[#EFE8E4] overflow-hidden py-24 lg:py-32 px-6 lg:px-8"
      aria-label="Begin nu met Let's Dog"
    >
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <p className="text-sm font-semibold text-[#75876D] uppercase tracking-widest mb-5">
          Begin vandaag
        </p>
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-[#141414] leading-tight mb-6 tracking-tight">
          Je pup wacht niet.
          <br />
          Jij hoeft ook niet.
        </h2>
        <p className="text-[#141414]/60 text-lg leading-relaxed mb-10 max-w-md mx-auto">
          Meld je aan en start direct. De puppyagenda, je eerste videoles en de community staan voor je klaar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/prijzen"
            className="inline-flex items-center px-8 py-4 rounded-full bg-[#FFA580] text-[#141414] text-[16px] font-bold hover:bg-[#ff9060] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
          >
            Start vandaag
          </Link>
          <p className="text-[#141414]/50 text-sm">
            Opzegbaar in de app
          </p>
        </div>

        {/* Risk reduction */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            "Gecertificeerde trainers",
            "Welzijnsgericht",
            "Veilig via Mollie",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-[#141414]/55">
              <div className="w-1 h-1 rounded-full bg-[#75876D]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
