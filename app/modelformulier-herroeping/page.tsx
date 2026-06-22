import { pageMetadata } from "@/lib/seo";
import { LegalPageLayout } from "@/components/shared/legal-page-layout";
import { loadLegalContent } from "@/lib/content";

const { data, content } = loadLegalContent("modelformulier-herroeping");

export const metadata = pageMetadata({
  title: `${data.title} — Let's dog`,
  description: data.description,
  path: "/modelformulier-herroeping/",
});

export default function Page() {
  return <LegalPageLayout data={data} content={content} />;
}
