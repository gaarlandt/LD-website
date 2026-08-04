import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { Button, Eyebrow } from "@/components/ui";

export function PartnersHero() {
  return (
    // Hero — beige split (kept inline per KTD8)
    <section className="relative bg-[var(--ld-beige)] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text column */}
        <div>
          <Eyebrow tone="brand" className="block mb-5">
            Samenwerken met Let&apos;s dog
          </Eyebrow>
          <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[var(--ld-text)] leading-[1.05] tracking-tight mb-7">
            Deel wat werkt. Help hondenouders verder.
          </h1>
          <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed mb-8 max-w-lg">
            Of je nu je volgers inspireert met je eigen code, of als creator
            content maakt die wij inzetten: hoe meer hondenouders we samen
            bereiken, hoe meer honden een beter leven krijgen. Doe je mee?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="peach" pill asChild>
              <Link href="#manieren">Ambassadeur worden</Link>
            </Button>
            <Button variant="secondary" pill asChild>
              <Link href="#manieren">UGC-maker worden</Link>
            </Button>
          </div>
        </div>

        {/* Image column */}
        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[5/6] bg-[var(--ld-beige-deep)]">
            <OptimizedImage
              src="/images/community.jpeg"
              alt="Hondenouder buiten met twee honden"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ld-text)]/20 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
