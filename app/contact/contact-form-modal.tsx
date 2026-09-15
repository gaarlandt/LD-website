"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
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
import { trackEvent, identifyLead } from "@/lib/analytics";
import { TURNSTILE_SITE_KEY, loadTurnstile } from "@/components/shared/turnstile";
import {
  formActionFor,
  reportUnreachable,
  submitWebsiteForm,
  type ContactOutcome,
  type ErrorKind,
  type FieldCode,
} from "@/lib/website-contact";

type Status = "idle" | "submitting" | "success" | "error";

// The fields this form shows; a refusal on any other is a client out of step
// with the platform's contract and gets the generic banner (formActionFor).
const CONTACT_FIELDS = ["name", "email", "message"] as const satisfies readonly FieldCode[];

const EMPTY = { name: "", email: "", message: "", company: "" };

// Server-side field-validation copy. The platform (lib/website-contact.ts)
// returns { ok:false, error:"name"|"email"|"message" } with 400 when a field fails
// its stricter checks (length caps, a tighter address shape) that the lighter
// client validation lets through — surface those on the matching field instead of
// the generic banner. On-brand Dutch; deliberately distinct from validate()'s
// empty-field prompts ("Vul je naam in.") — these signal a length/format reject,
// not a blank field. Re-tone both together if you change the field copy.
const FIELD_ERROR_COPY: Record<(typeof CONTACT_FIELDS)[number], string> = {
  name: "Controleer je naam.",
  email: "Vul een geldig e-mailadres in.",
  message: "Controleer je bericht.",
};

// The banner per ErrorKind. `generic` is the old copy unchanged; the other two
// are the platform's own answers (hub contract websiteformulier-ingang.md).
const ERROR_COPY: Record<ErrorKind, string> = {
  generic:
    "Er ging iets mis bij het versturen. Probeer het opnieuw of mail ons direct via mail@letsdog.nl.",
  captcha:
    "De beveiligingscontrole is niet gelukt. Doe de controle hierboven opnieuw en verstuur je bericht nog een keer.",
  rate_limited:
    "Er zijn net te veel berichten achter elkaar verstuurd. Probeer het over een uur opnieuw, of mail ons direct via mail@letsdog.nl.",
};

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
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [token, setToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Handle for the post-close reset timer (see handleOpenChange). Held in a ref so
  // a close→reopen within the 250ms window can cancel it; otherwise the stale timer
  // wipes the freshly-rendered widget's token and disables submit on a live dialog.
  const resetTimerRef = useRef<number | null>(null);
  // AbortController for the in-flight submit to the platform: bounds a stalled request
  // (10s timeout) and lets a dialog close cancel it, so the orphaned fetch's
  // continuation can't paint a stale success/error onto a closed dialog.
  const abortRef = useRef<AbortController | null>(null);

  // Render the Turnstile widget while the form is visible. Radix unmounts dialog
  // content on close, so each open paints a fresh widget; keying the effect on a
  // boolean (not `status`) keeps idle -> submitting -> error from churning it.
  const formVisible = open && status !== "success";
  useEffect(() => {
    if (!formVisible) return;
    let cancelled = false;
    // KNOWN FINDING, tracked as T-78 in the loop repo: clearing a stale error when
    // the dialog reopens is correct behaviour, but doing it synchronously in the
    // effect body costs an extra render. NOT suppressed, because on the toolchain
    // this repo pins it is not reported: measured 2026-08-24, eslint-plugin-react-
    // hooks 7.0.1 (the lockfile) stays silent here while 7.1.1 raises
    // react-hooks/set-state-in-effect. Bumping the plugin turns this into a real
    // lint error, and T-78 is the fix — moving the reset changes WHEN it lands, so
    // it wants a browser check on a live form rather than a blind edit.
    setTurnstileError(false);
    loadTurnstile()
      .then(() => {
        if (
          cancelled ||
          widgetIdRef.current ||
          !widgetRef.current ||
          !window.turnstile
        )
          return;
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {
        // Script failed to load (e.g. blocked by an ad-blocker / network). Surface
        // a fallback so the user isn't stuck behind a permanently disabled button.
        if (!cancelled) setTurnstileError(true);
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [formVisible]);

  // Cancel a pending post-close reset when the dialog reopens within the 250ms
  // window — the #9 race. Guarded on `open` so it only fires on (re)open and never
  // clears the timer that handleOpenChange arms on the *closing* render (a
  // [open]-keyed cleanup would clobber that). Reopen is parent-driven (the `open`
  // prop), so it does NOT route through handleOpenChange — this effect is the fix.
  useEffect(() => {
    if (open && resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [open]);

  // Don't let a pending reset fire — or an in-flight submit resolve — after the
  // modal unmounts entirely.
  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function resetTurnstile() {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setToken("");
  }

  // Radix Dialog owns focus-trap, scroll-lock, Esc-to-close and focus-restore —
  // so the hand-rolled effects/refs the Framer-Motion version needed are gone.
  // onOpenChange(false) fires for the × button, the overlay click and Esc alike.
  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose();
    // Cancel any in-flight submit so its continuation can't paint a stale
    // success/error onto the now-closed dialog (the catch treats a close-initiated
    // abort as benign and just settles to idle).
    abortRef.current?.abort();
    // Reset transient state after the close transition, so a re-open is clean.
    // Clear any prior pending reset first (re-entry guard), stash the handle so the
    // [open] effect above can cancel it if the dialog reopens within the window.
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      setStatus("idle");
      setErrors({});
      setToken("");
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
    if (!token) e.turnstile = "Even bevestigen dat je geen robot bent.";
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const first = Object.keys(e)[0];
      if (first !== "turnstile") document.getElementById(`cf-${first}`)?.focus();
      return;
    }
    setErrors({});
    setStatus("submitting");
    // Bound the request: abort after 10s so a stalled upstream can't leave the
    // button stuck on "Versturen…"; handleOpenChange also aborts it on close.
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    let outcome: ContactOutcome;
    try {
      outcome = await submitWebsiteForm({ ...form, turnstileToken: token }, controller.signal);
    } catch (err) {
      // A close-initiated abort (not the timeout) is benign: the dialog is gone
      // and handleOpenChange already reset it — settle to idle so a fast reopen
      // (where the [open] effect cancels the reset timer) isn't stuck "submitting".
      if (controller.signal.aborted && !timedOut) {
        setStatus("idle");
        return;
      }
      // No answer at all — the one failure the platform cannot see, because
      // nothing reached it. A CORS refusal lands here too.
      reportUnreachable(err, timedOut);
      setErrorKind("generic");
      setStatus("error");
      resetTurnstile();
      return;
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) abortRef.current = null;
    }

    // Outside the try on purpose: nothing below may be reported as an
    // unreachable platform, and an analytics sink that throws must not turn a
    // delivered message into an error banner.
    const action = formActionFor(outcome, CONTACT_FIELDS);
    if (action.type === "success") {
      setForm(EMPTY);
      setStatus("success");
      trackEvent("contact_form_submitted");
      // The one PostHog identify on the site — on the anonymous $device_id,
      // never on the address (see lib/analytics.ts, T-46).
      identifyLead(form.email);
      return;
    }
    resetTurnstile();
    if (action.type === "field") {
      // flushSync so the input is no longer `disabled` when focus() runs: set in
      // the same tick, the field was still disabled and focus stayed on the
      // button (pre-existing since 2026-06-25, found in the T-83 review).
      flushSync(() => {
        setErrors({ [action.field]: FIELD_ERROR_COPY[action.field] });
        setStatus("idle");
      });
      document.getElementById(`cf-${action.field}`)?.focus();
      return;
    }
    setErrorKind(action.kind);
    setStatus("error");
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
              Vul het formulier in, we antwoorden binnen 1 werkdag.
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

              {/* Cloudflare Turnstile — anti-abuse check before sending */}
              <div>
                <div ref={widgetRef} className="flex min-h-[65px] justify-center" />
                {turnstileError ? (
                  <p role="alert" className="mt-1 text-sm text-[var(--ld-danger)]">
                    De verificatie kon niet laden. Herlaad de pagina of mail ons
                    direct via mail@letsdog.nl.
                  </p>
                ) : (
                  errors.turnstile && (
                    <p role="alert" className="mt-1 text-sm text-[var(--ld-danger)]">
                      {errors.turnstile}
                    </p>
                  )
                )}
              </div>

              {status === "error" && (
                <p role="alert" className="text-sm text-[var(--ld-danger)]">
                  {ERROR_COPY[errorKind]}
                </p>
              )}

              <Button
                type="submit"
                variant="brand"
                block
                pill
                loading={status === "submitting"}
                disabled={!token || status === "submitting"}
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
