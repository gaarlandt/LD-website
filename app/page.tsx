import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Hope } from "@/components/sections/hope";
import { BreedSelector } from "@/components/sections/breed-selector";
import { Trust } from "@/components/sections/trust";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Pricing } from "@/components/sections/pricing";
import { FinalCta } from "@/components/sections/final-cta";

export const metadata = pageMetadata({
  title: "Let's Dog — Puppytraining die werkt",
  description:
    "Nieuwe pup thuis en totaal de kluts kwijt? Let's Dog geeft je een dagelijks plan, videolessen van gecertificeerde trainers en een community die je begrijpt.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Hope />
      <BreedSelector />
      <Trust />
      <HowItWorks />
      <Pricing />
      <FinalCta />
    </>
  );
}
