import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { GreenHeroBand } from "@/components/shared/green-hero-band";
import type { LegalContentData } from "@/lib/content";

interface LegalPageLayoutProps {
  data: LegalContentData;
  content: string;
  children?: ReactNode;
}

export function LegalPageLayout({ data, content, children }: LegalPageLayoutProps) {
  const eyebrow = data.eyebrow ?? "Juridisch";

  return (
    <>
      <GreenHeroBand eyebrow={eyebrow} title={data.title} lead={data.lead} />

      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="font-heading font-bold text-2xl text-[var(--ld-text)] mt-8 first:mt-0 mb-4">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-heading font-semibold text-[var(--ld-text)] mt-6 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-[var(--ld-text-muted)] text-[16px] leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="mt-4 mb-4 space-y-2 list-none">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-[var(--ld-text-muted)] text-[15px]">
                  <span className="text-[var(--ld-green)] mt-1">•</span>
                  <span>{children}</span>
                </li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-[var(--ld-green)] underline hover:text-[var(--ld-green-ink)]"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-[var(--ld-text)]">
                  {children}
                </strong>
              ),
              // Literal identifiers — cookie names, header names. Without an
              // override these render as an unstyled browser-default <code>,
              // which drops to a monospace face the brand doesn't carry and
              // reads as a rendering bug. The cookie declaration names a dozen
              // cookies this way, so it earns a style rather than backtick-free
              // prose that can't distinguish `m` the cookie from m the word.
              code: ({ children }) => (
                <code className="rounded bg-[var(--ld-beige)] px-1.5 py-0.5 text-[0.9em] text-[var(--ld-text)]">
                  {children}
                </code>
              ),
              // The card keeps its padding fixed; only the table scrolls inside it.
              // Below ~320px a three-column prose table cannot compress further, so
              // without this the whole PAGE scrolls sideways — a WCAG 1.4.10 failure
              // measured on /cookieverklaring/ (553px wide at a 320px viewport) and
              // /toegankelijkheid/ (369px). 1.4.10 explicitly exempts content that
              // needs two-dimensional layout, and a data table is the canonical case,
              // so scrolling the table in its own box is the sanctioned answer rather
              // than a dodge. `min-w` stops the other failure mode: at 375px the third
              // column had squeezed to 75px, about two words per line. `tabIndex` is
              // required, not decorative — a scrollable region that only a mouse can
              // reach fails 2.1.1.
              table: ({ children }) => (
                <div className="bg-[var(--ld-beige)] rounded-[var(--ld-r-md)] p-6 my-4">
                  <div className="overflow-x-auto" tabIndex={0}>
                    <table className="w-full min-w-[32rem] text-[15px] border-collapse">
                      {children}
                    </table>
                  </div>
                </div>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => (
                // GFM only emits a header row (inside <thead>), so every <th>
                // is a column header — scope="col" is unambiguously correct
                // and gives screen readers explicit row/column association.
                <th scope="col" className="font-semibold text-[var(--ld-text)] text-left py-2 pr-4 align-top">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="text-[var(--ld-text-muted)] py-2 pr-4 align-top">
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {children}
        </div>
      </SectionWrapper>
    </>
  );
}
