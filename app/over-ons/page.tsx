import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/utils";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { JsonLd } from "@/components/shared/json-ld";
import { personLd } from "@/lib/structured-data";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { Button, Card, Badge, Eyebrow } from "@/components/ui";
import { ShieldCheck, BookOpen, MagnifyingGlass, Certificate } from "@phosphor-icons/react/dist/ssr";

export const metadata = pageMetadata({
  title: "Over ons — Let's dog",
  description:
    "Leer Elien kennen — gecertificeerde hondengedragstherapeut en oprichtster van Let's dog. Welzijnsgericht, wetenschappelijk onderbouwd.",
  path: "/over-ons/",
});

const methodCards = [
  {
    icon: ShieldCheck,
    title: "Geen fysieke correcties, nooit",
    description:
      "We werken uitsluitend met positieve bekrachtiging. Straf en dwang zijn geen onderdeel van onze aanpak.",
  },
  {
    icon: BookOpen,
    title: "Wetenschappelijk onderbouwd",
    description:
      "Onze aanpak is gebaseerd op de laatste wetenschappelijke inzichten en technieken.",
  },
  {
    icon: MagnifyingGlass,
    title: "Toegankelijk voor elk ras",
    description:
      "De methode werkt voor elke hond, ongeacht ras of grootte.",
  },
];

const certs = [
  {
    name: "NVGH-lid",
    desc: "Lid van Nederlandse Vereniging van Gedragstherapeuten voor Honden.",
  },
  {
    name: "Raad van Beheer",
    desc: "Lid van Raad van Beheer - kwaliteitskeurmerk voor instructeurs.",
  },
];

const heroBadges = [
  { dotClass: "bg-[var(--ld-green)]", label: "Gecertificeerd gedragstherapeut" },
  { dotClass: "bg-[var(--ld-peach)]", label: "NVGH-erkend" },
];

export default function OverOns() {
  return (
    <>
      <JsonLd data={personLd()} />

      {/* Hero — beige split (kept inline per KTD8) */}
      <section className="relative bg-[var(--ld-beige)] pt-32 pb-20 lg:pb-24 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-[3.75rem] text-[var(--ld-text)] leading-[1.05] tracking-tight mb-7">
              Expertise én empathie.{" "}
              <span className="text-[var(--ld-peach)]">Niet één van de twee.</span>
            </h1>
            <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed mb-8 max-w-lg">
              Let&apos;s dog is opgericht door Elien, gecertificeerd
              hondengedragstherapeut. Na honderden eigenaren te hebben begeleid
              bouwde ze een methode die aansluit bij hoe honden écht leren,
              zonder dwang, op basis van vertrouwen.
            </p>

            {/* Cert badges */}
            <div className="flex flex-wrap gap-3">
              {heroBadges.map(({ dotClass, label }) => (
                <Badge key={label}>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
                    aria-hidden="true"
                  />
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Image column */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-[5/6] bg-[var(--ld-beige-deep)]">
              <OptimizedImage
                src="/images/elien.jpeg"
                alt="Elien, oprichtster van Let's dog"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ld-text)]/20 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-6 left-6">
              <Badge tone="peach" className="font-bold shadow-[var(--ld-sh-3)] whitespace-nowrap">
                Elien · oprichtster
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Mijn verhaal */}
      <SectionWrapper id="verhaal" className="bg-white">
        <div className="max-w-3xl mx-auto">
          <Eyebrow tone="brand" className="block mb-4">
            Mijn verhaal
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-8">
            Ik heb gezien wat er mis kan gaan.{" "}
            <span className="text-[var(--ld-text-muted)]">Dat hoeft niet.</span>
          </h2>
          <div className="space-y-5 text-[var(--ld-text-muted)] text-[16px] leading-relaxed mb-10">
            <p>
              Als gecertificeerde hondengedragstherapeut heb ik honderden
              eigenaren begeleid, van wanhopige beginners tot mensen wier pup
              al maanden problemen vertoonde. Eén ding zag ik steeds terug: ze
              hadden niet het juiste hulpmiddel op het juiste moment.
            </p>
            <p>
              Let&apos;s dog is gebouwd op wat ik in de praktijk heb geleerd.
              Structuur, duidelijkheid, en een methode die aansluit bij hoe
              honden écht leren, zonder dwang, op basis van vertrouwen.
            </p>
          </div>
          {/* Pull-quote */}
          <blockquote className="border-l-4 border-[var(--ld-peach)] pl-6 py-2">
            <p className="font-heading font-bold text-2xl md:text-3xl text-[var(--ld-text)] leading-snug italic">
              &ldquo;Je pup leert niet sneller als jij harder je best doet. Hij
              leert sneller als jij begrijpt wat hij nodig heeft.&rdquo;
            </p>
          </blockquote>
        </div>
      </SectionWrapper>

      {/* Onze methode */}
      <SectionWrapper className="bg-[var(--ld-beige)]">
        <div className="text-center mb-14">
          <Eyebrow tone="brand" className="block mb-4">
            Onze methode
          </Eyebrow>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-4">
            Waar Let&apos;s dog op gebouwd is
          </h2>
          <p className="text-[var(--ld-text-muted)] text-lg max-w-xl mx-auto">
            Drie principes die bij alles wat we maken het uitgangspunt zijn.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {methodCards.map(({ icon: Icon, title, description }) => (
            <Card key={title} hover>
              <div className="w-11 h-11 rounded-xl bg-[var(--ld-lime)] flex items-center justify-center mb-5">
                <Icon size={20} className="text-[var(--ld-green)]" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[var(--ld-text)] mb-3 leading-snug">
                {title}
              </h3>
              <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* Certifications */}
      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <Eyebrow tone="brand" className="block mb-4">
              Certificeringen
            </Eyebrow>
            <h2 className="font-heading font-bold text-3xl text-[var(--ld-text)] mb-3">
              Erkend. Wetenschappelijk. Betrouwbaar.
            </h2>
            <p className="text-[var(--ld-text-muted)] text-[16px]">
              Let&apos;s dog is opgezet door een erkend professional en
              aangesloten bij de toonaangevende Nederlandse instanties.
            </p>
          </div>
          <div className="space-y-4 mb-10">
            {certs.map(({ name, desc }) => (
              <Card key={name} variant="beige" className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-[var(--ld-sh-1)]">
                  <Certificate size={22} className="text-[var(--ld-green)]" />
                </div>
                <div>
                  <p className="font-heading font-bold text-lg text-[var(--ld-text)] mb-1">
                    {name}
                  </p>
                  <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
                    {desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex justify-center">
            <Image
              src={asset("/images/NVGH Logo.jpeg")}
              alt="NVGH en Raad van Beheer certificeringslogo's"
              width={400}
              height={120}
              className="w-full max-w-[416px] md:max-w-[499px] h-auto"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* Closing CTA — ends light (R2) */}
      <SectionWrapper className="bg-[var(--ld-beige)]">
        <Card className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-[var(--ld-text-muted)] text-lg mb-8 max-w-md mx-auto">
            Meld je aan en start direct met de puppyagenda, videolessen en de
            community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="brand" pill asChild>
              <Link href="/prijzen">Start vandaag</Link>
            </Button>
            <Button variant="ghost" pill asChild>
              <a
                href="https://app.letsdog.nl/consult/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Plan een consult
              </a>
            </Button>
          </div>
        </Card>
      </SectionWrapper>
    </>
  );
}
