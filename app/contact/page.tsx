import { pageMetadata } from "@/lib/seo";
import { CONSULT_AVAILABLE } from "@/lib/feature-flags";
import { ContactContent } from "./contact-content";

export const metadata = pageMetadata({
  title: "Contact — Let's dog",
  // The description follows the flag: a search result that offers a consult the
  // page no longer sells is a promise the site can't keep.
  description: CONSULT_AVAILABLE
    ? "Neem contact op met Let's dog. Mail of bel ons, app via WhatsApp, of boek een consult met een gecertificeerde trainer. We antwoorden binnen 1 werkdag."
    : "Neem contact op met Let's dog. Mail of bel ons, of app via WhatsApp. We antwoorden binnen 1 werkdag.",
  path: "/contact/",
});

export default function Page() {
  return <ContactContent />;
}
