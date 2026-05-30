import { pageMetadata } from "@/lib/seo";
import { LegalPageLayout } from "@/components/shared/legal-page-layout";
import { loadLegalContent } from "@/lib/content";

const { data, content } = loadLegalContent("privacybeleid");

export const metadata = pageMetadata({
  title: `${data.title} — Let's Dog`,
  description: data.description,
  path: "/privacybeleid/",
});

export default function Page() {
  return <LegalPageLayout data={data} content={content} />;
}
