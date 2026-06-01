import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Button, Eyebrow } from "@/components/ui";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export function BreedSelector() {
  return (
    <SectionWrapper className="bg-white" id="rassenkeuze">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text */}
        <div>
          <Eyebrow tone="brand" className="block mb-4">
            Rassenkeuze hulp
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] mb-6 leading-tight">
            Welk ras past bij jou?
          </h2>
          <p className="text-[var(--ld-text-muted)] text-[16px] leading-relaxed mb-4">
            Niet elk ras past bij elke eigenaar. Onze gratis rassenkeuze hulp stelt je 10 korte vragen over je levensstijl, woonruimte en ervaring — en geeft je een persoonlijk rasadvies.
          </p>
          <p className="text-[var(--ld-text-muted)] text-[16px] leading-relaxed mb-8">
            Wetenschappelijk onderbouwd en ontwikkeld met gecertificeerde gedragstherapeuten.
          </p>
          <Button variant="brand" pill asChild>
            <Link href="/rassenkeuze">
              Doe de gratis test
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>

        {/* Image */}
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
          <OptimizedImage
            src="/images/dalmatian.jpeg"
            alt="Dalmatiër — ontdek welk ras bij je past"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
