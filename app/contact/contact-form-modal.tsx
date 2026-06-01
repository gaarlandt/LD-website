"use client";

import { useState } from "react";
import { PaperPlaneTilt, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Field,
  Input,
  Textarea,
  Button,
} from "@/components/ui";
import { trackEvent } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY = { name: "", email: "", message: "", company: "" };

export function ContactFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");

  // Radix Dialog owns focus-trap, scroll-lock, Esc-to-close and focus-restore —
  // so the hand-rolled effects/refs the Framer-Motion version needed are gone.
  // onOpenChange(false) fires for the × button, the overlay click and Esc alike.
  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose();
    // Reset transient state after the close transition, so a re-open is clean.
    window.setTimeout(() => {
      setStatus("idle");
      setErrors({});
    }, 250);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vul je naam in.";
    if (!form.email.trim() || !form.email.includes("@"))
      e.email = "Vul een geldig e-mailadres in.";
    if (!form.message.trim()) e.message = "Schrijf een bericht.";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      document.getElementById(`cf-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("send failed");
      trackEvent("contact_form_submitted");
      setForm(EMPTY);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {status === "success" ? (
          <div className="text-center py-8">
            <CheckCircle
              size={44}
              weight="fill"
              className="text-[var(--ld-green)] mx-auto mb-4"
            />
            <DialogTitle>Bericht ontvangen.</DialogTitle>
            <DialogDescription className="mb-6">
              We antwoorden binnen 1 werkdag. Alvast bedankt voor je bericht.
            </DialogDescription>
            <Button variant="brand" pill onClick={() => handleOpenChange(false)}>
              Sluiten
            </Button>
          </div>
        ) : (
          <>
            <DialogTitle>Stuur een bericht</DialogTitle>
            <DialogDescription className="mb-6">
              Vul het formulier in — we antwoorden binnen 1 werkdag.
            </DialogDescription>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Honeypot — visually hidden + removed from tab + AT */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="cf-company">Bedrijf (niet invullen)</label>
                <input
                  id="cf-company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>

              {/* Name */}
              <Field
                label={
                  <>
                    Naam{" "}
                    <span className="text-[var(--ld-green)]" aria-hidden="true">
                      *
                    </span>
                  </>
                }
                htmlFor="cf-name"
                error={errors.name}
                messageId="cf-name-error"
              >
                <Input
                  id="cf-name"
                  type="text"
                  autoComplete="name"
                  disabled={status === "submitting"}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Je naam"
                  aria-required="true"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "cf-name-error" : undefined}
                />
              </Field>

              {/* Email */}
              <Field
                label={
                  <>
                    E-mailadres{" "}
                    <span className="text-[var(--ld-green)]" aria-hidden="true">
                      *
                    </span>
                  </>
                }
                htmlFor="cf-email"
                error={errors.email}
                messageId="cf-email-error"
              >
                <Input
                  id="cf-email"
                  type="email"
                  autoComplete="email"
                  disabled={status === "submitting"}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jouw@email.nl"
                  aria-required="true"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "cf-email-error" : undefined}
                />
              </Field>

              {/* Message */}
              <Field
                label={
                  <>
                    Bericht{" "}
                    <span className="text-[var(--ld-green)]" aria-hidden="true">
                      *
                    </span>
                  </>
                }
                htmlFor="cf-message"
                error={errors.message}
                messageId="cf-message-error"
              >
                <Textarea
                  id="cf-message"
                  rows={5}
                  className="resize-none"
                  disabled={status === "submitting"}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Je vraag of opmerking…"
                  aria-required="true"
                  aria-invalid={errors.message ? true : undefined}
                  aria-describedby={errors.message ? "cf-message-error" : undefined}
                />
              </Field>

              {status === "error" && (
                <p role="alert" className="text-sm text-[var(--ld-danger)]">
                  Er ging iets mis bij het versturen. Probeer het opnieuw of mail
                  ons direct via mail@letsdog.nl.
                </p>
              )}

              <Button
                type="submit"
                variant="brand"
                block
                pill
                loading={status === "submitting"}
              >
                {status === "submitting" ? (
                  "Versturen…"
                ) : (
                  <>
                    <PaperPlaneTilt size={16} />
                    Verstuur bericht
                  </>
                )}
              </Button>

              <p className="text-xs text-[var(--ld-text-subtle)] text-center">
                We antwoorden binnen 1 werkdag. Je gegevens worden nooit gedeeld.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
