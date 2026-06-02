import { Container, Eyebrow } from "@/components/ui";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { BrowserFrame } from "@/components/shared/browser-frame";
import { LESSON_TYPES, SHOTS, type LessonType } from "./curriculum";
import { TypeDot } from "./type-dot";

/** "Altijd overzicht" — voortgang screenshot + onboarding tooltip + legend. */
export function PaProgress() {
  return (
    <section className="bg-[var(--ld-beige)] py-[84px]">
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — voortgang frame with the cleaned tooltip overlay */}
        <div className="relative">
          <BrowserFrame
            src={SHOTS.voortgang.src}
            alt={SHOTS.voortgang.alt}
            width={SHOTS.voortgang.width}
            height={SHOTS.voortgang.height}
            sizes="(max-width: 1024px) 90vw, 600px"
          />
          {/* Cleaned tooltip — corners clipped via overflow+radius. Shown from lg
              up, where the negative offset lands in the column gap (no overflow). */}
          <div className="absolute -bottom-7 -right-6 hidden w-[230px] overflow-hidden rounded-[14px] border border-[var(--ld-border)] shadow-[var(--ld-sh-3)] lg:block">
            <OptimizedImage
              src={SHOTS.tooltip.src}
              alt={SHOTS.tooltip.alt}
              width={SHOTS.tooltip.width}
              height={SHOTS.tooltip.height}
              sizes="230px"
              className="block h-auto w-full"
            />
          </div>
        </div>

        {/* Right — copy + 2×2 lesson-type legend */}
        <div>
          <Eyebrow tone="brand">Altijd overzicht</Eyebrow>
          <h2 className="mt-3 font-heading text-[clamp(28px,3.2vw,42px)] font-bold leading-[1.1] tracking-tight text-[var(--ld-text)]">
            Zie precies waar je staat
          </h2>
          <p className="mt-4 max-w-[440px] text-[17px] leading-[1.65] text-[var(--ld-text-muted)]">
            Een rustig dashboard met je week, je XP en je totale voortgang. En elke les heeft een kleur, zodat je
            in één oogopslag ziet wat het is.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {Object.entries(LESSON_TYPES).map(([key, t]) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-[12px] border border-[var(--ld-border)] bg-white px-3.5 py-3"
              >
                <TypeDot type={key as LessonType} size={30} />
                <span className="text-[14.5px] font-semibold text-[var(--ld-text)]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
