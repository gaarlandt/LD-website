import type { Metadata } from "next";
import { SectionWrapper } from "@/components/shared/section-wrapper";

export const metadata: Metadata = {
  title: "IP-overdrachtsverklaring — Let's Dog",
  description:
    "Verklaring waarmee freelancers en partners hun intellectuele eigendomsrechten op geleverde werken overdragen aan Let's Dog B.V.",
};

type Section = {
  title: string;
  content: string;
  items?: string[];
  signature?: boolean;
  contact?: boolean;
};

const sections: Section[] = [
  {
    title: "1. Overdracht",
    content:
      "Freelancer of partner draagt hierbij alle rechten op teksten, video's, ontwerpen of code over aan Let's Dog B.V.",
  },
  {
    title: "2. Vrijwaring",
    content:
      "De overdrager garandeert dat het werk origineel is en vrij van rechten van derden.",
  },
  {
    title: "3. Ondertekening",
    content:
      "Vul onderstaande gegevens in en onderteken om de overdracht te bekrachtigen.",
    signature: true,
  },
  {
    title: "4. Toepassingsgebied",
    content:
      "Deze overdracht geldt voor code, scripts, documenten, foto's, illustraties, trainingsvideo's en AI-data geproduceerd binnen opdracht.",
  },
  {
    title: "5. Vergoeding",
    content:
      "Indien sprake is van overdracht tegen vergoeding wordt dit apart vastgelegd. Zonder aanvullende vergoeding gaat de overdracht alsnog door.",
  },
  {
    title: "6. Looptijd",
    content:
      "Deze verklaring is blijvend geldig en bindend voor alle opgeleverde werken gedurende de duur van de samenwerking.",
  },
  {
    title: "Contact",
    content: "Vragen over deze verklaring? Neem contact met ons op.",
    contact: true,
  },
];

export default function IpOverdrachtsverklaring() {
  return (
    <>
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Juridisch
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight">
            IP-overdrachtsverklaring
          </h1>
        </div>
      </div>

      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <p className="text-[#141414]/70 text-[16px] leading-relaxed -mb-6">
            Ondergetekende verklaart hierbij alle intellectuele eigendomsrechten op de
            geleverde werken over te dragen aan Let&apos;s Dog B.V.
          </p>
          {sections.map(({ title, content, items, signature, contact }) => (
            <div key={title}>
              <h2 className="font-heading font-bold text-2xl text-[#141414] mb-4">
                {title}
              </h2>
              <p className="text-[#141414]/70 text-[16px] leading-relaxed">
                {content}
              </p>
              {items && (
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[#141414]/70 text-[15px]"
                    >
                      <span className="text-[#75876D] mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {signature && (
                <div className="mt-6 space-y-3 text-[#141414]/70 text-[15px]">
                  <p>
                    Naam:{" "}
                    <span className="inline-block min-w-[12rem] border-b border-[#141414]/30 ml-2 align-baseline">&nbsp;</span>
                  </p>
                  <p>
                    Datum:{" "}
                    <span className="inline-block min-w-[12rem] border-b border-[#141414]/30 ml-2 align-baseline">&nbsp;</span>
                  </p>
                  <p>
                    Handtekening:{" "}
                    <span className="inline-block min-w-[12rem] border-b border-[#141414]/30 ml-2 align-baseline">&nbsp;</span>
                  </p>
                </div>
              )}
              {contact && (
                <div className="mt-4 space-y-1 text-[#141414]/70 text-[15px]">
                  <p>
                    E-mail:{" "}
                    <a href="mailto:mail@letsdog.nl" className="text-[#75876D] underline">
                      mail@letsdog.nl
                    </a>
                  </p>
                  <p>
                    Telefoon:{" "}
                    <a href="tel:0857444161" className="text-[#75876D] underline">
                      085 744 4161
                    </a>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
