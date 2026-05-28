import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface LegalContentData {
  title: string;
  description: string;
  eyebrow?: string;
  lead?: string;
  signature_form?: boolean;
}

export interface LegalContent {
  data: LegalContentData;
  content: string;
}

export function loadLegalContent(slug: string): LegalContent {
  const filePath = path.join(process.cwd(), "content", `${slug}.md`);
  const file = fs.readFileSync(filePath, "utf8");
  const parsed = matter(file);
  return {
    data: parsed.data as LegalContentData,
    content: parsed.content,
  };
}
