import * as React from 'react';
import { cn } from '@/lib/utils';
import { Container } from '@/components/ui/layout';
import { Eyebrow } from '@/components/ui/eyebrow';

export interface GreenHeroBandProps {
  /** Uppercase kicker above the title (white, via Eyebrow tone="onGreen"). */
  eyebrow: React.ReactNode;
  /** Hero heading (National 2, white). */
  title: React.ReactNode;
  /** Optional white sub-lead under the title. */
  lead?: React.ReactNode;
  /** Optional extra classes on the <h1> (e.g. a max-width to control wrapping). */
  titleClassName?: string;
}

/**
 * Shared brand-green hero band used by the legal pages and the 404.
 * Tokenized (--ld-green / --ld-on-green) with an on-green Eyebrow (full white
 * ≈4.7:1), fixing the old `text-white/60` ≈2.1:1 AA failure at the source.
 * Content is constrained by the DS Container (1200px, KTD6).
 */
export function GreenHeroBand({ eyebrow, title, lead, titleClassName }: GreenHeroBandProps) {
  return (
    <div className="bg-[var(--ld-green)] pt-32 pb-14 min-h-[220px] flex items-end">
      <Container className="w-full">
        <Eyebrow tone="onGreen" className="block mb-4">
          {eyebrow}
        </Eyebrow>
        <h1
          className={cn(
            'font-heading font-bold text-4xl md:text-5xl text-[var(--ld-on-green)] leading-tight',
            titleClassName
          )}
        >
          {title}
        </h1>
        {lead ? (
          <p className="text-[var(--ld-on-green)] text-lg mt-4 max-w-lg">{lead}</p>
        ) : null}
      </Container>
    </div>
  );
}
