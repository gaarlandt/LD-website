import { GraduationCap, PawPrint, Heart } from "@phosphor-icons/react/dist/ssr";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Card } from "@/components/ui";
import { PartnersSectionHead } from "./section-head";

// Phosphor icons replace the mockup's emoji (KTD4); the tile tints are the
// mockup's. These cards match .ld-card's own padding and radius, so unlike the
// other surfaces on this page they use <Card> (variant flat = no shadow).
const benefits = [
  {
    icon: GraduationCap,
    tile: "var(--ld-green-soft)",
    title: "Echte expertise",
    body: "Alle content komt van gecertificeerde gedragstherapeuten en trainers. Diervriendelijk, wetenschappelijk onderbouwd, nooit betuttelend.",
  },
  {
    icon: PawPrint,
    tile: "var(--ld-blue)",
    title: "Voor elke levensfase",
    body: "Van pup tot senior: per fase weet de hondenouder wat te verwachten, wat te doen en wanneer extra hulp nodig is. Eén plek, geen tegenstrijdig advies.",
  },
  {
    icon: Heart,
    tile: "var(--ld-lime)",
    title: "Fijn om te delen",
    body: "Je volgers krijgen echte waarde en een eerlijke korting. Jij bouwt aan iets wat honden-ouders en honden vooruit helpt, niet aan snelle verkoop.",
  },
];

export function PartnersBenefits() {
  return (
    <SectionWrapper id="voordelen" className="bg-[var(--ld-green-soft)]">
      <PartnersSectionHead
        label="Waarom Let's dog"
        title="Een merk waar je achter kunt staan"
      >
        Je deelt geen product dat je zelf niet zou gebruiken. Let&apos;s dog is
        opgebouwd door gecertificeerde gedragstherapeuten, zonder quick fixes of
        fysieke correcties, maar met positief belonen.
      </PartnersSectionHead>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benefits.map(({ icon: Icon, tile, title, body }) => (
          <Card key={title} variant="flat">
            <div
              className="rounded-2xl flex items-center justify-center mb-5 w-[3.25rem] h-[3.25rem]"
              style={{ background: tile }}
            >
              <Icon size={24} className="text-[var(--ld-green-ink)]" />
            </div>
            <h4 className="font-heading font-bold text-lg text-[var(--ld-text)] mb-2 leading-snug">
              {title}
            </h4>
            <p className="text-[var(--ld-text-muted)] text-[15px] leading-relaxed">
              {body}
            </p>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}
