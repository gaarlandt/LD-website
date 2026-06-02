import Link from "next/link";
import { Button, Container } from "@/components/ui";

/**
 * Closing CTA — green band. The page's single call to action: "Bekijk de
 * abonnementen" → /prijzen (owner direction: exactly one CTA on the page).
 */
export function PaClosingCta() {
  return (
    <section className="bg-[var(--ld-green)] py-[76px]">
      <Container className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="max-w-[560px]">
          <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.1] tracking-tight text-white">
            Begin vandaag met je puppyagenda
          </h2>
          <p className="mt-3.5 text-[18px] leading-[1.6] text-white/90">
            Maak een gratis account en bekijk de preview. Upgrade voor toegang tot alle weken, videolessen en
            audio-lessen.
          </p>
        </div>
        <Button variant="onGreen" asChild>
          <Link href="/prijzen">Bekijk de abonnementen</Link>
        </Button>
      </Container>
    </section>
  );
}
