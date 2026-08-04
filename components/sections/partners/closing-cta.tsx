"use client";

import { useState } from "react";
import { SectionWrapper } from "@/components/shared/section-wrapper";
import { Button } from "@/components/ui";
import { CreatorFormModal } from "./creator-form-modal";

// The one client island on /partners — it owns the modal's open state. Every
// other section stays a server component; the boundary is kept here rather than
// on the page, mirroring how /contact splits its form modal out.
//
// The site's first peach *surface* rather than peach accent. Body text stays
// dark ink, the same rule .ld-btn--peach and .ld-chip--peach already encode.
export function PartnersClosingCta() {
  const [open, setOpen] = useState(false);

  return (
    <SectionWrapper id="aanmelden" className="bg-[var(--ld-beige)]">
      <div className="max-w-4xl mx-auto rounded-[var(--ld-r-xl)] bg-[var(--ld-peach)] text-[var(--ld-ink)] px-8 py-14 lg:px-10 lg:py-16 text-center">
        <h2 className="font-heading font-bold text-3xl md:text-4xl leading-tight tracking-tight mb-4">
          Klaar om samen te werken?
        </h2>
        <p className="text-lg leading-relaxed max-w-lg mx-auto mb-8">
          Vul dit formulier in en we nemen persoonlijk contact met je op.
        </p>
        <Button variant="primary" pill onClick={() => setOpen(true)}>
          Meld je gratis aan
        </Button>
      </div>

      <CreatorFormModal open={open} onClose={() => setOpen(false)} />
    </SectionWrapper>
  );
}
