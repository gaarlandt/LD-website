import { ReactNode } from "react";
import { Eyebrow } from "@/components/ui";

/** The mockup's repeated centred section header: kicker, heading, optional lead. */
export function PartnersSectionHead({
  label,
  title,
  children,
}: {
  label: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      <Eyebrow tone="brand" className="block mb-4">
        {label}
      </Eyebrow>
      <h2 className="font-heading font-bold text-3xl md:text-4xl text-[var(--ld-text)] leading-tight mb-4">
        {title}
      </h2>
      {children ? (
        <p className="text-[var(--ld-text-muted)] text-lg leading-relaxed">
          {children}
        </p>
      ) : null}
    </div>
  );
}
