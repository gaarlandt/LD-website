import * as React from 'react';
import { cn } from '@/lib/utils';

export type EyebrowTone = 'default' | 'brand' | 'onGreen';

const eyebrowToneClass: Record<EyebrowTone, string> = {
  default: '',
  brand: 'ld-eyebrow--brand',
  onGreen: 'ld-eyebrow--on-green',
};

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Colour tone, picked to match the surface:
   * - `brand` — brand green, for light surfaces (KTD5).
   * - `onGreen` — white, for green/forest surfaces (BR3).
   * - `default` — muted grey, reserved for low-emphasis contexts.
   */
  tone?: EyebrowTone;
}

/** Small uppercase kicker (caps tracking). Set `tone` to suit the surface:
 *  `brand` on light, `onGreen` on green/forest, `default` (muted) for low emphasis. */
export const Eyebrow = React.forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ className, tone = 'default', ...props }, ref) => (
    <span ref={ref} className={cn('ld-eyebrow', eyebrowToneClass[tone], className)} {...props} />
  )
);
Eyebrow.displayName = 'Eyebrow';
