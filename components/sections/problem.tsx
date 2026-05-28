const problems = [
  {
    headline: "De ene zegt dit, de ander dat.",
    body:
      "Je zoekt online en krijgt tien verschillende antwoorden. Welk advies klopt? Wat past bij jouw hond? Je weet het niet meer.",
  },
  {
    headline: "Je pup bijt, blaft of slaapt niet.",
    body:
      "Je doet je best, maar het lukt niet. Je bent moe, twijfelt aan jezelf, en vraagt je af of het ooit beter wordt.",
  },
  {
    headline: "Je weet niet of je het goed doet.",
    body:
      "Niemand heeft je verteld wat normaal is. Je twijfelt bij elke stap. Is dit gedrag oké? Moet ik ingrijpen? En zo ja, hoe?",
  },
];

export function Problem() {
  return (
    <section
      id="herkenning"
      className="bg-[#EFE8E4] py-20 lg:py-28 px-6 lg:px-8"
    >
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-[640px] mb-16 lg:mb-20">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Herkenbaar?
          </span>
          <h2 className="font-heading font-bold text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-[#141414] mt-4">
            Een nieuwe pup is geweldig. En soms doodvermoeiend.
          </h2>
        </div>

        <div className="space-y-12 lg:space-y-16">
          {problems.map(({ headline, body }, i) => (
            <div
              key={headline}
              className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-4 lg:gap-12 pb-12 lg:pb-16 border-b border-[#141414]/10 last:border-b-0 last:pb-0"
            >
              <div className="font-heading text-[14px] text-[#75876D] tracking-[0.16em] uppercase font-semibold pt-2">
                Nr. {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <p className="font-heading font-bold text-[26px] lg:text-[36px] leading-[1.15] tracking-[-0.015em] text-[#141414] max-w-[24ch] mb-4">
                  {headline}
                </p>
                <p className="text-[#141414]/65 text-[16px] lg:text-[17px] leading-[1.65] max-w-[58ch]">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
