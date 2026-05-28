import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionWrapper } from "@/components/shared/section-wrapper";
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
      <div className="bg-[#75876D] pt-32 pb-14 min-h-[220px] flex items-end px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            {eyebrow}
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-white leading-tight">
            {data.title}
          </h1>
          {data.lead && (
            <p className="text-white/70 text-lg mt-4 max-w-lg">{data.lead}</p>
          )}
        </div>
      </div>

      <SectionWrapper className="bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="font-heading font-bold text-2xl text-[#141414] mt-8 first:mt-0 mb-4">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-semibold text-[#141414] mt-6 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-[#141414]/70 text-[16px] leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="mt-4 mb-4 space-y-2 list-none">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-[#141414]/70 text-[15px]">
                  <span className="text-[#75876D] mt-1">•</span>
                  <span>{children}</span>
                </li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-[#75876D] underline hover:text-[#65775D]"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-[#141414]">
                  {children}
                </strong>
              ),
              table: ({ children }) => (
                <div className="bg-[#EFE8E4] rounded-xl p-6 my-4">
                  <table className="w-full text-[15px] border-collapse">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => (
                <th className="font-semibold text-[#141414] text-left py-2 pr-4 align-top">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="text-[#141414]/70 py-2 pr-4 align-top">
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
