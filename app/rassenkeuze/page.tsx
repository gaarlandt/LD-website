import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Button, Card, Badge, Eyebrow } from "@/components/ui";
import { ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata = pageMetadata({
  title: "Rassenkeuze hulp — Welk ras past bij jou? | Let's Dog",
  description:
    "Beantwoord 10 korte vragen en ontdek welk hondenras het beste bij jouw levensstijl past. Gratis, wetenschappelijk onderbouwd rasadvies.",
  path: "/rassenkeuze/",
});

const steps = [
  {
    number: "1",
    title: "Beantwoord 10 korte vragen",
    description:
      "Over je woonruimte, beweging, ervaring en wat je zoekt in een hond.",
  },
  {
    number: "2",
    title: "Wij matchen op gedrag & leefstijl",
    description:
      "Wetenschappelijk onderbouwd, ontwikkeld met gecertificeerde gedragstherapeuten.",
  },
  {
    number: "3",
    title: "Ontvang je persoonlijke rasadvies",
    description:
      "Direct in beeld — gratis en vrijblijvend. Geen account nodig.",
  },
];

const exploreCards = [
  {
    eyebrow: "Gids",
    title: "Puppyagenda",
    description:
      "Wat je week voor week doet als de pup er eenmaal is — stap voor stap.",
    href: "/puppyagenda",
  },
  {
    eyebrow: "Aanpak",
    title: "Over ons",
    description:
      "Hoe we welzijnsgericht trainen, en wie de gedragstherapeuten achter Let's Dog zijn.",
    href: "/over-ons",
  },
  {
    eyebrow: "Later",
    title: "Prijzen",
    description:
      "Geen haast. Kijk gerust rond wat een lidmaatschap inhoudt — voor straks.",
    href: "/prijzen",
  },
];

export default function Rassenkeuze() {
  return (
    <>
      {/* Hero — beige split (kept inline per KTD8) */}
      <section className="relative bg-[var(--ld-beige)] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[var(--ld-text)] leading-[1.05] tracking-tight mb-7">
              Welk ras past <span className="text-[var(--ld-peach)]">écht</span> bij jou?
            </h1>
            <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed mb-8 max-w-lg">
              Beantwoord 10 korte vragen over je leefstijl, woonruimte en ervaring. Je krijgt direct een persoonlijk rasadvies — gratis en vrijblijvend.
            </p>

            <Button variant="brand" pill asChild>
              <a href="#quiz">
                Start de rassenkeuze hulp
                <ArrowRight size={16} />
              </a>
            </Button>

            {/* Pills */}
            <div className="flex flex-wrap gap-3 mt-7">
              <Badge>
                <span className="w-2 h-2 rounded-full bg-[var(--ld-green)] flex-shrink-0" aria-hidden="true" />
                Gratis &amp; vrijblijvend
              </Badge>
              <Badge>
                <span className="w-2 h-2 rounded-full bg-[var(--ld-peach)] flex-shrink-0" aria-hidden="true" />
                ± 2 minuten
              </Badge>
            </div>
          </div>

          {/* Image column */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[5/6] bg-[var(--ld-beige-deep)]">
              <OptimizedImage
                src="/images/rassenkeuze.jpeg"
                alt="Hond buiten in het gras — ontdek welk ras bij je past"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ld-text)]/30 via-transparent to-transparent" />
            </div>

            {/* Floating "Persoonlijk rasadvies" badge */}
            <div className="absolute bottom-6 left-6">
              <Badge tone="peach" className="font-bold shadow-[var(--ld-sh-3)] whitespace-nowrap">
                <Sparkle size={15} />
                Persoonlijk rasadvies
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Van vraag naar advies in drie stappen */}
      <SectionWrapper className="bg-white">
        <div className="text-center mb-14">
          <Eyebrow tone="brand" className="block mb-4">
            Zo werkt het
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight">
            Van vraag naar advies in drie stappen
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ number, title, description }) => (
            <Card key={number} hover>
              <div className="w-10 h-10 rounded-full bg-[var(--ld-beige)] flex items-center justify-center font-heading font-bold text-[var(--ld-green)] mb-5">
                {number}
              </div>
              <h3 className="font-heading font-bold text-xl text-[var(--ld-text)] mb-3">
                {title}
              </h3>
              <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* Doe de test — live keuzehulp iframe */}
      <SectionWrapper className="bg-[var(--ld-beige)]" id="quiz">
        <div className="text-center mb-10">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] mb-3">
            Doe de test
          </h2>
          <p className="text-[var(--ld-text-muted)] text-lg">
            Hieronder laadt de rassenkeuze hulp.
          </p>
        </div>

        <div className="rounded-[var(--ld-r-lg)] overflow-hidden border border-[var(--ld-border)] bg-white shadow-[var(--ld-sh-3)]">
          <iframe
            src="https://keuzehulp.letsdog.nl"
            title="Let's Dog Rassenkeuze hulp — rasadvies quiz"
            className="w-full min-h-[700px] border-0"
            loading="lazy"
            allow="clipboard-write"
          />
        </div>

        <p className="text-center text-sm text-[var(--ld-text-subtle)] mt-6">
          Laadt de rassenkeuze hulp niet?{" "}
          <a
            href="https://keuzehulp.letsdog.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--ld-green)] underline hover:text-[var(--ld-green-ink)]"
          >
            Open in een nieuw tabblad
          </a>
        </p>
      </SectionWrapper>

      {/* Nog geen hond? Kijk gerust rond */}
      <SectionWrapper className="bg-[var(--ld-lime)]/40">
        <div className="text-center mb-12 max-w-xl mx-auto">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-4">
            Nog geen hond?
            <br />
            Kijk gerust rond
          </h2>
          <p className="text-[var(--ld-text-muted)] text-lg">
            Deze test is helemaal gratis. Wil je meer weten over wat daarna komt?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exploreCards.map(({ eyebrow, title, description, href }) => (
            <Link key={href} href={href} className="group block h-full">
              <Card hover className="flex flex-col h-full">
                <Eyebrow tone="brand" className="block mb-3">
                  {eyebrow}
                </Eyebrow>
                <h3 className="font-heading font-bold text-xl text-[var(--ld-text)] mb-2">
                  {title}
                </h3>
                <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed mb-5 flex-grow">
                  {description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-[var(--ld-green)] font-semibold text-sm group-hover:gap-2.5 transition-all">
                  Bekijken
                  <ArrowRight size={15} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
