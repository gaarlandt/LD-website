import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Badge / Chip. Tinted tones carry meaning sparingly — one accent tone per screen. */
const badgeVariants = cva('ld-chip', {
  variants: {
    tone: {
      neutral: '',
      green: 'ld-chip--green',
      peach: 'ld-chip--peach',
      lime: 'ld-chip--lime',
      blue: 'ld-chip--blue',
      solid: 'ld-chip--solid',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, dot, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? <span className="ld-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  )
);
Badge.displayName = 'Badge';
