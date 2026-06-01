import * as React from 'react';
import { cn } from '@/lib/utils';

/** Layout primitives — thin wrappers over the .ld-* layout helpers. */
export const Container = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('ld-container', className)} {...props} />
);
Container.displayName = 'Container';

export const Stack = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { lg?: boolean }>(
  ({ className, lg, ...props }, ref) => (
    <div ref={ref} className={cn(lg ? 'ld-stack-lg' : 'ld-stack', className)} {...props} />
  )
);
Stack.displayName = 'Stack';

export const Row = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('ld-row', className)} {...props} />
);
Row.displayName = 'Row';

export const Grid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('ld-grid', className)} {...props} />
);
Grid.displayName = 'Grid';
