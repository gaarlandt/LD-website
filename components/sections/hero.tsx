import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { Button, Eyebrow } from "@/components/ui";

export function Hero() {
  return (
    <section
      className="relative bg-[var(--ld-green)] flex flex-col lg:flex-row lg:items-center lg:min-h-[100dvh] overflow-hidden"
      aria-label="Hero"
    >
      {/* Mobile: visible image at top */}
      <div className="relative w-full aspect-[16/10] lg:hidden">
        <OptimizedImage
          src="/images/hero.jpeg"
          alt="Twee vrouwen lachen met hun honden"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ld-green)]/60 via-transparent to-[var(--ld-green)]" />
      </div>

      {/* Desktop: absolute right-half background */}
      <div className="absolute inset-0 left-[45%] hidden lg:block">
        <OptimizedImage
          src="/images/hero.jpeg"
          alt="Twee vrouwen lachen met hun honden"
          fill
          priority
          sizes="55vw"
          className="object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ld-green)] via-[var(--ld-green)]/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full pt-6 pb-12 lg:pt-40 lg:pb-32">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <Eyebrow tone="onGreen" className="flex items-center gap-3 mb-10">
            <span className="h-px w-8 bg-[var(--ld-on-green)]/60 inline-block" />
            Welzijnsgerichte puppytraining
          </Eyebrow>

          {/* H1 */}
          <h1 className="font-heading font-bold text-5xl md:text-7xl lg:text-[length:var(--ld-fs-80)] text-[var(--ld-on-green)] leading-[1.02] tracking-tight mb-10">
            Jouw pup begrijpen.
            <br />
            <span className="text-[var(--ld-lime)]">Samen groeien.</span>
          </h1>

          {/* Subtext — empathie eerst */}
          <p className="text-lg lg:text-2xl text-[var(--ld-on-green)]/85 leading-relaxed mb-12 max-w-xl">
            Nieuwe pup thuis. Blij, en totaal de kluts kwijt. Wij geven je een dagelijks plan, zodat jij weet wat je doet en je pup weet wat hij kan verwachten.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="peach" pill asChild>
              <Link href="/prijzen">Start vandaag</Link>
            </Button>
            <p className="text-sm text-[var(--ld-on-green)]/60">Opzegbaar in de app</p>
          </div>

          {/* Trust nudge */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["/images/community.jpeg", "/images/training.jpeg", "/images/about.jpeg"].map(
                (src, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[var(--ld-green)] overflow-hidden bg-[var(--ld-lime)]"
                  >
                    <OptimizedImage
                      src={src}
                      alt=""
                      width={32}
                      height={32}
                      sizes="32px"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )
              )}
            </div>
            <p className="text-sm text-[var(--ld-on-green)]/70">
              Al meer dan <strong className="text-[var(--ld-on-green)]">500 puppy&apos;s</strong> op weg geholpen
            </p>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--ld-beige)] to-transparent" />
    </section>
  );
}
