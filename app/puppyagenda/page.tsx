import { pageMetadata } from "@/lib/seo";
import { PaHero } from "@/components/sections/puppyagenda/hero";
import { PaSteps } from "@/components/sections/puppyagenda/steps";
import { PaProgress } from "@/components/sections/puppyagenda/progress";
import { PaPhases } from "@/components/sections/puppyagenda/phases";
import { PaClosingCta } from "@/components/sections/puppyagenda/closing-cta";

export const metadata = pageMetadata({
  title: "Puppyagenda — Let's Dog",
  description:
    "Alles wat je moet doen, lezen en bekijken — week voor week klaargezet. Video, leesstof en audio, afgevinkt zodra je klaar bent.",
  path: "/puppyagenda/",
});

export default function PuppyagendaPage() {
  return (
    <>
      <PaHero />
      <PaSteps />
      <PaProgress />
      <PaPhases />
      <PaClosingCta />
    </>
  );
}
