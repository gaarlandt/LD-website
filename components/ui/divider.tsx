import * as React from 'react';
import { cn } from '@/lib/utils';

export const Divider = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
  ({ className, ...props }, ref) => <hr ref={ref} className={cn('ld-divider', className)} {...props} />
);
Divider.displayName = 'Divider';
