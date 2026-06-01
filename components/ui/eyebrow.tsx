import * as React from 'react';
import { cn } from '@/lib/utils';

/** Small uppercase kicker. Note: never use an eyebrow in a page's first/hero section. */
export const Eyebrow = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => <span ref={ref} className={cn('ld-eyebrow', className)} {...props} />
);
Eyebrow.displayName = 'Eyebrow';
