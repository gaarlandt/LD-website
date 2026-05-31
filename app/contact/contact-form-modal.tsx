"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, CheckCircle2, X, Loader2 } from "lucide-react";
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

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember the trigger so focus can return to it on close; focus the first
  // field shortly after the open animation starts.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    const t = setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close + Tab focus trap.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // `close` is stable enough for this lifecycle; re-binding per open is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    onClose();
    triggerRef.current?.focus?.();
    // Reset transient state after the exit animation.
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

  const inputBase =
    "w-full px-4 py-3 rounded-xl border text-[15px] text-[#141414] bg-white placeholder:text-[#141414]/35 outline-none transition-colors focus:border-[#75876D] disabled:opacity-60";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#141414]/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cf-title"
            aria-describedby="cf-desc"
            className="relative w-full max-w-lg bg-[#F8F5F2] rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Sluiten"
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[#141414]/50 hover:text-[#141414] hover:bg-[#141414]/5 transition-colors cursor-pointer"
            >
              <X size={20} strokeWidth={2} />
            </button>

            {status === "success" ? (
              <div className="text-center py-8">
                <CheckCircle2
                  size={44}
                  className="text-[#75876D] mx-auto mb-4"
                  strokeWidth={1.5}
                />
                <h2
                  id="cf-title"
                  className="font-heading font-bold text-2xl text-[#141414] mb-3"
                >
                  Bericht ontvangen.
                </h2>
                <p id="cf-desc" className="text-[#141414]/60 leading-relaxed mb-6">
                  We antwoorden binnen 1 werkdag. Alvast bedankt voor je bericht.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#75876D] text-white font-semibold hover:bg-[#647558] transition-colors cursor-pointer"
                >
                  Sluiten
                </button>
              </div>
            ) : (
              <>
                <h2
                  id="cf-title"
                  className="font-heading font-bold text-2xl text-[#141414] mb-1"
                >
                  Stuur een bericht
                </h2>
                <p id="cf-desc" className="text-[#141414]/60 text-[15px] mb-6">
                  Vul het formulier in — we antwoorden binnen 1 werkdag.
                </p>

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
                  <div>
                    <label
                      htmlFor="cf-name"
                      className="block text-sm font-semibold text-[#141414] mb-1.5"
                    >
                      Naam{" "}
                      <span className="text-[#75876D]" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="cf-name"
                      ref={firstFieldRef}
                      type="text"
                      autoComplete="name"
                      disabled={status === "submitting"}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`${inputBase} ${errors.name ? "border-red-400" : "border-[#141414]/15"}`}
                      placeholder="Je naam"
                      aria-required="true"
                      aria-describedby={errors.name ? "cf-name-error" : undefined}
                    />
                    {errors.name && (
                      <p
                        id="cf-name-error"
                        role="alert"
                        className="mt-1.5 text-sm text-red-600"
                      >
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="cf-email"
                      className="block text-sm font-semibold text-[#141414] mb-1.5"
                    >
                      E-mailadres{" "}
                      <span className="text-[#75876D]" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="cf-email"
                      type="email"
                      autoComplete="email"
                      disabled={status === "submitting"}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`${inputBase} ${errors.email ? "border-red-400" : "border-[#141414]/15"}`}
                      placeholder="jouw@email.nl"
                      aria-required="true"
                      aria-describedby={errors.email ? "cf-email-error" : undefined}
                    />
                    {errors.email && (
                      <p
                        id="cf-email-error"
                        role="alert"
                        className="mt-1.5 text-sm text-red-600"
                      >
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor="cf-message"
                      className="block text-sm font-semibold text-[#141414] mb-1.5"
                    >
                      Bericht{" "}
                      <span className="text-[#75876D]" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <textarea
                      id="cf-message"
                      rows={5}
                      disabled={status === "submitting"}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className={`${inputBase} resize-none ${errors.message ? "border-red-400" : "border-[#141414]/15"}`}
                      placeholder="Je vraag of opmerking…"
                      aria-required="true"
                      aria-describedby={errors.message ? "cf-message-error" : undefined}
                    />
                    {errors.message && (
                      <p
                        id="cf-message-error"
                        role="alert"
                        className="mt-1.5 text-sm text-red-600"
                      >
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {status === "error" && (
                    <p role="alert" className="text-sm text-red-600">
                      Er ging iets mis bij het versturen. Probeer het opnieuw of mail
                      ons direct via mail@letsdog.nl.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#75876D] text-white font-semibold text-[16px] hover:bg-[#647558] transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 size={18} className="animate-spin" strokeWidth={2} />
                        Versturen…
                      </>
                    ) : (
                      <>
                        <Send size={16} strokeWidth={2} />
                        Verstuur bericht
                      </>
                    )}
                  </button>

                  <p className="text-xs text-[#141414]/40 text-center">
                    We antwoorden binnen 1 werkdag. Je gegevens worden nooit gedeeld.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
