import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label — rendered as a DS <Label> above the control. */
  label?: React.ReactNode;
  /** id of the control the label points at (sets Label htmlFor). */
  htmlFor?: string;
  /** Helper text below the control (hidden while an error is shown). */
  hint?: React.ReactNode;
  /** Error message — renders in --ld-danger and takes precedence over hint. */
  error?: React.ReactNode;
  /** id for the hint/error node, so the control can reference it via aria-describedby. */
  messageId?: string;
}

/**
 * Field — a vertical label + control + message group (.ld-field).
 * Presentational: wire `aria-invalid` / `aria-describedby` on the control yourself
 * (pass `messageId` here and the same id to the control's `aria-describedby`).
 */
export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ label, htmlFor, hint, error, messageId, className, children, ...props }, ref) => (
    <div ref={ref} className={cn('ld-field', className)} {...props}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {error ? (
        <span id={messageId} role="alert" className="ld-field__error">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="ld-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  )
);
Field.displayName = 'Field';
