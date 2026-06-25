"use client";

import { useState, useEffect, useRef } from "react";
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

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY = { name: "", email: "", message: "", company: "" };

// Server-side field-validation copy. functions/api/contact.ts returns
// { ok:false, error:"name"|"email"|"message" } with 400 when a field fails its
// stricter server checks (length caps, a tighter email regex) that the lighter
// client validation lets through — surface those on the matching field instead of
// the generic banner. On-brand Dutch; deliberately distinct from validate()'s
// empty-field prompts ("Vul je naam in.") — these signal a length/format reject,
// not a blank field. Re-tone both together if you change the field copy.
const FIELD_ERROR_COPY: Record<"name" | "email" | "message", string> = {
  name: "Controleer je naam.",
  email: "Vul een geldig e-mailadres in.",
  message: "Controleer je bericht.",
};

// Cloudflare's always-passes TEST site key — used when the real key is unset so
// dev/preview render a working widget without a real Turnstile config. The real
// key is inlined at build time from NEXT_PUBLIC_TURNSTILE_SITE_KEY in production.
// Pairs with the always-pass test SECRET in functions/api/contact.ts.
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

interface TurnstileAPI {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

// Load the Turnstile script once, lazily; resolve when window.turnstile is ready.
let turnstileScript: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScript) return turnstileScript;
  turnstileScript = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      // Don't cache the rejection — let a later open retry the load.
      turnstileScript = null;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return turnstileScript;
}

// Read the Function's `error` code from a non-OK response, defensively: a 5xx/502
// can return a non-JSON body (e.g. a gateway page) and res.json() would throw —
// swallow that so the caller falls through to the generic banner.
async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : undefined;
  } catch {
    return undefined;
  }
}

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
  const [token, setToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Handle for the post-close reset timer (see handleOpenChange). Held in a ref so
  // a close→reopen within the 250ms window can cancel it; otherwise the stale timer
  // wipes the freshly-rendered widget's token and disables submit on a live dialog.
  const resetTimerRef = useRef<number | null>(null);

  // Render the Turnstile widget while the form is visible. Radix unmounts dialog
  // content on close, so each open paints a fresh widget; keying the effect on a
  // boolean (not `status`) keeps idle -> submitting -> error from churning it.
  const formVisible = open && status !== "success";
  useEffect(() => {
    if (!formVisible) return;
    let cancelled = false;
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

  // Don't let a pending reset fire after the modal unmounts entirely.
  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
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
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: token }),
      });
      if (!res.ok) {
        // The Function validates name/email/message BEFORE Turnstile, so a field
        // 400 leaves the token unconsumed and still valid — surface the error on
        // the field, focus it, and keep the armed token so a fix can resubmit
        // straight away. captcha / invalid_json / 500 / 502 / network fall through
        // to the generic banner + token reset in catch.
        const code = await readErrorCode(res);
        if (code === "name" || code === "email" || code === "message") {
          setErrors({ [code]: FIELD_ERROR_COPY[code] });
          setStatus("idle");
          document.getElementById(`cf-${code}`)?.focus();
          return;
        }
        throw new Error("send failed");
      }
      trackEvent("contact_form_submitted");
      // The one PostHog identify on the site — lowercased email is the
      // cross-product join key (see lib/analytics.ts + the identity contract).
      identifyLead(form.email);
      setForm(EMPTY);
      setStatus("success");
    } catch {
      setStatus("error");
      // Turnstile tokens are single-use; get a fresh one for the retry.
      resetTurnstile();
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
