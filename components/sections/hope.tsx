import Image from "next/image";
import { asset } from "@/lib/utils";

const outcomes = [
  {
    title: "Een plan voor elke dag",
    body:
      "De puppyagenda vertelt je precies wat je vandaag doet, leest en bekijkt. Voor de puppy thuis is, en in elke week erna.",
  },
  {
    title: "Videolessen die écht uitleggen",
    body:
      "Gecertificeerde trainers laten zien waarom gedrag gebeurt en hoe je ermee omgaat. Geen quickfixes, wel resultaten die blijven.",
  },
  {
    title: "Audio voor onderweg",
    body:
      "Luister tijdens de wandeling of de autorit. Korte lessen die je meeneemt in het dagelijks leven.",
  },
  {
    title: "Een community die je begrijpt",
    body:
      "Praat met andere puppy-eigenaren die hetzelfde meemaken. Geen oordeel, wel herkenning en steun.",
  },
];

export function Hope() {
  return (
    <section id="wat-je-krijgt" className="bg-[#FAF6F2] py-20 lg:py-32 px-6 lg:px-8">
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-start">
        {/* Image */}
        <div className="relative order-2 lg:order-1 lg:sticky lg:top-32">
          <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden">
            <Image
              src={asset("/images/hope.jpeg")}
              alt="Hondeneigenaar geniet thuis met zijn hond"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Outcomes */}
        <div className="order-1 lg:order-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Wat je krijgt
          </span>
          <h2 className="font-heading font-bold text-[34px] lg:text-[48px] leading-[1.05] tracking-[-0.02em] text-[#141414] mt-4 mb-5">
            Zo ziet je leven eruit met Let&apos;s Dog.
          </h2>
          <p className="text-[#141414]/65 text-[18px] leading-[1.6] max-w-[52ch] mb-12">
            Geen tegenstrijdige adviezen meer. Eén welzijnsgerichte aanpak, stap voor stap, op jouw tempo.
          </p>

          <div className="divide-y divide-[#141414]/10">
            {outcomes.map(({ title, body }) => (
              <div key={title} className="grid grid-cols-[24px_1fr] gap-5 py-7">
                <div className="pt-2">
                  <span className="block w-2 h-2 rounded-full bg-[#75876D]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-[20px] lg:text-[22px] text-[#141414] mb-2 leading-snug tracking-[-0.01em]">
                    {title}
                  </h3>
                  <p className="text-[#141414]/65 text-[15px] lg:text-[16px] leading-[1.65] max-w-[55ch]">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <a
              href="https://app.letsdog.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#75876D] text-white text-[15px] font-semibold hover:bg-[#65775D] transition-colors duration-200 cursor-pointer"
            >
              Maak een gratis account
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
