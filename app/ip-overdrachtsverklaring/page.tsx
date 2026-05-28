import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/shared/legal-page-layout";
import { SignatureForm } from "@/components/shared/signature-form";
import { loadLegalContent } from "@/lib/content";

const { data, content } = loadLegalContent("ip-overdrachtsverklaring");

export const metadata: Metadata = {
  title: `${data.title} — Let's Dog`,
  description: data.description,
};

export default function Page() {
  return (
    <LegalPageLayout data={data} content={content}>
      {data.signature_form ? <SignatureForm /> : null}
    </LegalPageLayout>
  );
}
