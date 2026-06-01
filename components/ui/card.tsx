import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card — full spec. Built on the .ld-card token classes (ld-components.css).
 * Tones: elevated (default) · flat · outline · brand (green) · forest · accent · beige.
 * `featured` adds the highlighted treatment (lift + accent ring) for the
 * "recommended" tier. Compose with CardMedia / CardTitle / CardBody / CardFooter.
 */
const cardVariants = cva('ld-card', {
  variants: {
    variant: {
      elevated: 'ld-card--elevated',
      flat: 'ld-card--flat',
      outline: 'ld-card--outline',
      brand: 'ld-card--green',
      forest: 'ld-card--forest',
      accent: 'ld-card--accent',
      beige: 'ld-card--beige',
      plain: '',
    },
    hover: { true: 'ld-card--hover' },
    featured: { true: 'ld-card--featured' },
  },
  defaultVariants: { variant: 'elevated' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, featured, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, hover, featured }), className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardMedia = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('ld-card__media', className)} {...props} />
);
CardMedia.displayName = 'CardMedia';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn('ld-card__title', className)} {...props} />
);
CardTitle.displayName = 'CardTitle';

export const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('ld-card__body', className)} {...props} />
);
CardBody.displayName = 'CardBody';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('ld-card__footer', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';

export { cardVariants };
