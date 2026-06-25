import type { ElementType } from "react";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Card, Eyebrow } from "@/components/ui";
import { Quotes, Medal, Star } from "@phosphor-icons/react/dist/ssr";

// A stat shows a big number, except "Gecertificeerde trainers" — a bare "2"
// reads smaller than the team is, so that cell shows a medal icon instead while
// keeping the same cell height as the numbers.
type Stat = { label: string; value?: string; icon?: ElementType };

const stats: Stat[] = [
  { value: "500+", label: "Puppy's op weg geholpen" },
  { value: "80+", label: "Videolessen beschikbaar" },
  { icon: Medal, label: "Gecertificeerde trainers" },
  { value: "100%", label: "Welzijnsgericht" },
];

const testimonials = [
  {
    quote:
      "Super fijne puppycursus bij Elien en Let’s dog. Ze is enthousiast, betrokken en kijkt echt naar wat jij en je hond nodig hebben. We voelen ons gesteund en onze puppy leert zichtbaar veel. Echt een aanrader!",
    name: "Silke",
    location: "Huizen",
  },
  {
    quote:
      "Elien is een fantastische hondengedragscoach die ons met veel kennis en geduld heeft begeleid. Dankzij Let’s dog en haar advies maakten we de juiste keuze bij het uitzoeken van het ras, de fokker en de hond. Haar begeleiding in de opvoeding van ons lieve Guus was onmisbaar en heeft ons enorm geholpen om met ons gezin Guus op te voeden.",
    name: "Saskia",
    location: "Naarden",
  },
  {
    quote:
      "De puppycursus was, zoals anderen hier ook aangeven, echt helemaal top. Kenny is uitgegroeid tot een vrolijke, lieve en gehoorzame hond, die dankzij Eliens begeleiding en puppycursus zijn weg goed heeft weten te vinden in het leven in Amsterdam.",
    name: "Machteld",
    location: "Amsterdam",
  },
];

const certifications = [
  {
    title: "NVGH",
    subtitle: "Lid van Nederlandse Vereniging van Gedragstherapeuten voor Honden",
  },
  {
    title: "Raad van Beheer",
    subtitle: "Lid van Raad van Beheer - kwaliteitskeurmerk voor instructeurs.",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 mt-2">
      {[...Array(5)].map((_, i) => (
        // #F5C518 = star-gold: a documented off-palette exception — stars read gold by
        // convention, so we keep it rather than recolor to peach (KTD10).
        <Star key={i} size={18} weight="fill" className="text-[#F5C518]" />
      ))}
    </div>
  );
}

export function Trust() {
  return (
    <>
    {/* Stats — white band */}
    <SectionWrapper className="bg-white" id="bewijs">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map(({ value, icon: Icon, label }) => (
          <div key={label} className="text-center">
            {Icon ? (
              <div className="mb-2 flex items-center justify-center">
                <Icon
                  weight="fill"
                  className="h-10 w-10 md:h-12 md:w-12 text-[var(--ld-green)]"
                  aria-hidden="true"
                />
              </div>
            ) : (
              <p className="font-heading font-bold text-4xl md:text-5xl text-[var(--ld-green)] mb-2">
                {value}
              </p>
            )}
            <p className="text-sm text-[var(--ld-text-muted)] leading-snug">{label}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>

    {/* Testimonials — soft-green band */}
    <SectionWrapper className="bg-[var(--ld-green-soft)]">
      {/* Section header */}
      <div className="text-center mb-14">
        <Eyebrow tone="brand" className="block mb-4">
          Wat eigenaren zeggen
        </Eyebrow>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight">
          Echte eigenaren. Echte resultaten.
        </h2>
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map(({ quote, name, location }) => (
          <Card key={name} hover className="flex flex-col">
            <Quotes size={24} className="text-[var(--ld-green)] mb-5 flex-shrink-0" />
            <p className="text-[var(--ld-text)]/80 text-[15px] leading-relaxed flex-grow mb-6">
              &ldquo;{quote}&rdquo;
            </p>
            <div className="pt-4 border-t border-[var(--ld-border)]">
              <p className="font-semibold text-sm text-[var(--ld-green)]">
                {name}, {location}
              </p>
              <Stars />
            </div>
          </Card>
        ))}
      </div>
    </SectionWrapper>

    {/* Certificeringen — white band */}
    <SectionWrapper className="bg-white">
      {/* Certifications */}
      <div className="text-center mb-14">
        <Eyebrow tone="brand" className="block mb-4">
          Certificeringen
        </Eyebrow>
        <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight">
          Erkend. Wetenschappelijk. Betrouwbaar.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
        {certifications.map(({ title, subtitle }) => (
          <Card key={title} hover className="text-center">
            <Medal size={32} className="text-[var(--ld-green)] mx-auto mb-4" />
            <p className="font-heading font-bold text-xl text-[var(--ld-text)] mb-2">
              {title}
            </p>
            <p className="text-sm text-[var(--ld-text-muted)] leading-relaxed">
              {subtitle}
            </p>
          </Card>
        ))}
      </div>

      {/* NVGH Logo */}
      <div className="flex justify-center">
        <OptimizedImage
          src="/images/nvgh-logo.jpeg"
          alt="NVGH en Raad van Beheer certificeringslogo's"
          width={400}
          height={120}
          sizes="(min-width: 768px) 499px, 416px"
          className="w-full max-w-[416px] md:max-w-[499px] h-auto"
        />
      </div>
    </SectionWrapper>
    </>
  );
}
