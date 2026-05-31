import { pageMetadata } from "@/lib/seo";
import { ContactContent } from "./contact-content";

export const metadata = pageMetadata({
  title: "Contact — Let's Dog",
  description:
    "Neem contact op met Let's Dog. Mail of bel ons, app via WhatsApp, of boek een consult met een gecertificeerde trainer. We antwoorden binnen 1 werkdag.",
  path: "/contact/",
});

export default function Page() {
  return <ContactContent />;
}
