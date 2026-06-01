'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

// Overlay + Portal are composed *inside* DialogContent below — intentionally NOT
// exported standalone, so there is one canonical way to build a dialog
// (<Dialog><DialogContent/></Dialog>) and no chance of a caller double-wrapping in
// their own Portal/Overlay. Re-export them only if a future surface genuinely needs
// custom portal composition.
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('ld-overlay-bg', className)} {...props} />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Render the built-in close (×) button. Default: true. */
  showClose?: boolean;
  /** aria-label for the built-in close button. Default: "Sluiten". */
  closeLabel?: string;
}

/**
 * Dialog panel — portalled, with overlay + built-in close button.
 * Accessibility: Radix requires a labelling <DialogTitle> inside the content.
 * Render one, or wrap a visually-hidden title when the design has no visible
 * heading — otherwise Radix logs an a11y error and aria-labelledby resolves to nothing.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showClose = true, closeLabel = 'Sluiten', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn('ld-dialog', className)} {...props}>
      {children}
      {showClose ? (
        <DialogPrimitive.Close className="ld-x" aria-label={closeLabel}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('ld-dialog__title', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('ld-dialog__desc', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('ld-dialog__foot', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';
