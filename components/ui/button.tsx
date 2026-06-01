import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button — built on the .ld-btn token classes (components.css).
 * Primary is INK, never green. On a green surface use variant="onGreen".
 * Accent-as-background (variant="peach", ink text) is allowed for the single
 * highest-emphasis CTA per screen — use sparingly, never for routine buttons.
 */
const buttonVariants = cva('ld-btn', {
  variants: {
    variant: {
      primary: 'ld-btn--primary',
      brand: 'ld-btn--brand',
      accent: 'ld-btn--accent',
      peach: 'ld-btn--peach',
      secondary: 'ld-btn--secondary',
      ghost: 'ld-btn--ghost',
      onGreen: 'ld-btn--on-green',
      link: 'ld-btn--link',
    },
    size: { sm: 'ld-btn--sm', md: '', lg: 'ld-btn--lg' },
    pill: { true: 'ld-btn--pill' },
    block: { true: 'ld-btn--block' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pill, block, asChild, loading, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, pill, block }), className);
    // asChild → Radix Slot, which requires exactly ONE element child. Don't inject
    // the spinner sibling (and don't set `disabled` on a non-button element).
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} aria-busy={loading || undefined} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <span className="ld-btn__spinner" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
