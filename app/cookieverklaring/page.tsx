import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/shared/legal-page-layout";
import { loadLegalContent } from "@/lib/content";

const { data, content } = loadLegalContent("cookieverklaring");

export const metadata: Metadata = {
  title: `${data.title} — Let's Dog`,
  description: data.description,
};

export default function Page() {
  return <LegalPageLayout data={data} content={content} />;
}
