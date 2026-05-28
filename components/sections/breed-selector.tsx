import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function BreedSelector() {
  return (
    <section id="hondenkeuze" className="bg-[#EFE8E4] py-20 lg:py-28 px-6 lg:px-8">
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#75876D]">
            Hondenkeuze
          </span>
          <h2 className="font-heading font-bold text-[34px] lg:text-[56px] leading-[1.02] tracking-[-0.025em] text-[#141414] mt-4 mb-7">
            Welk ras past bij jou?
          </h2>
          <p className="text-[#141414]/72 text-[17px] lg:text-[18px] leading-[1.65] max-w-[52ch] mb-5">
            Niet elk ras past bij elke eigenaar. Onze gratis hondenkeuze stelt je acht korte vragen over je levensstijl, woonruimte en ervaring. Daarna krijg je een persoonlijk rasadvies.
          </p>
          <p className="text-[#141414]/55 text-[15px] leading-[1.65] max-w-[52ch] mb-9">
            Ontwikkeld met gecertificeerde gedragstherapeuten. Wetenschappelijk onderbouwd.
          </p>

          <Link
            href="/hondenkeuze"
            className="inline-flex items-center gap-2.5 text-[#75876D] font-semibold text-[16px] group"
          >
            <span className="border-b-2 border-[#75876D] pb-1">Doe de gratis test</span>
            <ArrowRight
              size={18}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* Image - smaller, intentional */}
        <div className="relative aspect-square lg:aspect-[3/4] rounded-[28px] overflow-hidden">
          <Image
            src={asset("/images/dalmatian.jpeg")}
            alt="Dalmatiër, een van de rassen in onze hondenkeuze"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
