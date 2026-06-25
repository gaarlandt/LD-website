import fs from "node:fs";
import path from "node:path";
import { load } from "js-yaml";

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

// Leading YAML front-matter delimited by `---` lines: group 1 = YAML, group 2 = body.
// Tolerates CRLF endings; files without front-matter pass through unchanged as body.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function loadLegalContent(slug: string): LegalContent {
  const filePath = path.join(process.cwd(), "content", `${slug}.md`);
  // Build-time guard: each legal page calls this at its module scope, so the read
  // runs during `next build`. A missing or renamed content/<slug>.md otherwise
  // fails with a bare ENOENT that names neither the slug nor which page is wired
  // to the dead file. Rethrow with the slug + expected path so it self-diagnoses.
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `loadLegalContent: could not read legal content for slug "${slug}" — expected file at ${filePath}. ` +
        `Ensure content/${slug}.md exists and was not renamed or removed.`,
      { cause: err },
    );
  }
  return parseFrontMatter(raw);
}

// Pure front-matter split (no fs) — exported for direct unit testing. Strips a
// leading UTF-8 BOM (U+FEFF) so the delimiter still matches, splits the leading
// `---`-delimited YAML, tolerates CRLF; input without front-matter passes through
// unchanged as the body with empty data.
export function parseFrontMatter(raw: string): LegalContent {
  const file = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const match = FRONTMATTER_RE.exec(file);
  const data = (match ? (load(match[1]) ?? {}) : {}) as LegalContentData;
  const content = match ? match[2] : file;
  return { data, content };
}
