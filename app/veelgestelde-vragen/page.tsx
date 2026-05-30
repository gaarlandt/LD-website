import { pageMetadata } from "@/lib/seo";
import { FaqContent } from "./faq-content";

export const metadata = pageMetadata({
  title: "Veelgestelde vragen — Let's Dog",
  description:
    "Antwoorden op de meestgestelde vragen over Let's Dog — de web app, onze welzijnsgerichte trainingsmethode, het abonnement en betalingen.",
  path: "/veelgestelde-vragen/",
});

export default function Page() {
  return <FaqContent />;
}
