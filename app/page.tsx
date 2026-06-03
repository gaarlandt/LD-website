import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Hope } from "@/components/sections/hope";
import { PuppyAgendaTeaser } from "@/components/sections/puppy-agenda-teaser";
import { Trust } from "@/components/sections/trust";
import { Pricing } from "@/components/sections/pricing";
import { FinalCta } from "@/components/sections/final-cta";
import { RassenkeuzeStrip } from "@/components/sections/rassenkeuze-strip";

export const metadata = pageMetadata({
  title: "Let's Dog — Rust en vertrouwen met je pup",
  description:
    "Nieuwe pup in huis en even de kluts kwijt? Let's Dog geeft je week voor week een plan, videolessen van gecertificeerde trainers en een community die je begrijpt.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Hope />
      <PuppyAgendaTeaser />
      <Trust />
      <Pricing />
      <FinalCta />
      <RassenkeuzeStrip />
    </>
  );
}
