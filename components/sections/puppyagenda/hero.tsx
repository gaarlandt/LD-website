import { MapPin } from "@phosphor-icons/react/dist/ssr";
import { Badge, Container } from "@/components/ui";
import { BrowserFrame } from "@/components/shared/browser-frame";
import { SHOTS } from "./curriculum";

/**
 * Hero — beige split. Per owner direction the hero carries NO CTA (the global
 * navbar's "Start vandaag" is the above-the-fold action); the single page CTA
 * lives in the closing band. Top padding clears the fixed navbar.
 */
export function PaHero() {
  return (
    <section className="bg-[var(--ld-beige)] pt-28 pb-[76px] lg:pt-32">
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <h1 className="font-heading text-[clamp(38px,4.6vw,60px)] font-bold leading-[1.08] tracking-tight text-[var(--ld-text)]">
            Alles wat je moet doen,{" "}
            <span className="text-[var(--ld-green)]">per week</span>{" "}
            klaargezet.
          </h1>
          <p className="mt-5 max-w-[440px] text-[19px] leading-[1.6] text-[var(--ld-text-muted)]">
            Open de app en je weet meteen wat er deze week telt. Video, leesstof en audio, afgevinkt zodra je
            klaar bent.
          </p>
        </div>

        <div className="relative">
          <BrowserFrame
            src={SHOTS.agenda.src}
            alt={SHOTS.agenda.alt}
            width={SHOTS.agenda.width}
            height={SHOTS.agenda.height}
            sizes="(max-width: 1024px) 90vw, 620px"
            priority
          />
          <Badge
            tone="blue"
            className="absolute right-2 top-10 shadow-[var(--ld-sh-2)] lg:-right-2.5 lg:top-16"
          >
            <MapPin size={14} weight="fill" aria-hidden />
            Je bent in week 8
          </Badge>
        </div>
      </Container>
    </section>
  );
}
