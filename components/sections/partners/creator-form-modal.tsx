"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
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
import { TURNSTILE_SITE_KEY, loadTurnstile, readErrorCode } from "@/components/shared/turnstile";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY = {
  name: "",
  email: "",
  collaboration: "",
  profile: "",
  reach: "",
  camera: "",
  message: "",
  company: "",
};

const CHANNELS = ["Instagram", "TikTok", "YouTube", "Facebook", "Overig"];

const COLLABORATION_OPTIONS = [
  { value: "ambassador", label: "Als ambassadeur: ik ontvang een persoonlijke code om te delen" },
  { value: "ugc", label: "Als UGC-maker: ik maak content voor Let's dog" },
  { value: "both", label: "Allebei" },
  { value: "unsure", label: "Ik weet het nog niet, vertel me meer" },
];

// Server-side field-validation copy. functions/api/contact.ts returns
// { ok:false, error:"name"|"email"|"message"|"collaboration" } with 400 when a
// field fails its stricter server checks — surface those on the matching field
// instead of the generic banner.
const FIELD_ERROR_COPY: Record<string, string> = {
  name: "Controleer je naam.",
  email: "Vul een geldig e-mailadres in.",
  message: "Je tekst is te lang.",
  collaboration: "Kies hoe je wilt samenwerken.",
};

// Native select styled to match <Input>. There is no Select in components/ui yet
// and this is its only consumer, so it stays local rather than becoming a
// half-designed shared primitive.
const selectClass =
  "w-full rounded-[var(--ld-r-sm)] border border-[var(--ld-border)] bg-[var(--ld-input-bg)] px-3.5 py-3 text-[15px] text-[var(--ld-text)] outline-none transition-shadow focus:border-[var(--ld-green)] focus:shadow-[var(--ld-sh-focus)] disabled:opacity-60";

export function CreatorFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [channels, setChannels] = useState<string[]>([]);
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
  // AbortController for the in-flight submit: bounds a stalled request (10s) and
  // lets a dialog close cancel it, so the orphaned fetch's continuation can't
  // paint a stale success/error onto a closed dialog.
  const abortRef = useRef<AbortController | null>(null);

  // Render the Turnstile widget while the form is visible. Radix unmounts dialog
  // content on close, so each open paints a fresh widget; keying the effect on a
  // boolean (not `status`) keeps idle -> submitting -> error from churning it.
  const formVisible = open && status !== "success";
  useEffect(() => {
    if (!formVisible) return;
    let cancelled = false;
    // KNOWN FINDING, tracked as T-78 in the loop repo. Clearing a stale error when
    // the dialog reopens is correct behaviour, but doing it synchronously in the
    // effect body costs an extra render; moving it to the open handler changes WHEN
    // the reset lands and needs a browser check on a live form, so it is registered
    // rather than done blind here. When T-78 lands, ESLint reports this directive as
    // unused and `--max-warnings=0` fails the gate — the suppression cannot rot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTurnstileError(false);
    loadTurnstile()
      .then(() => {
        if (cancelled || widgetIdRef.current || !widgetRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {
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
  // window. Guarded on `open` so it only fires on (re)open and never clears the
  // timer that handleOpenChange arms on the *closing* render.
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
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    setToken("");
  }

  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose();
    abortRef.current?.abort();
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      setStatus("idle");
      setErrors({});
      setToken("");
    }, 250);
  }

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vul je naam in.";
    if (!form.email.trim() || !form.email.includes("@"))
      e.email = "Vul een geldig e-mailadres in.";
    if (!form.collaboration) e.collaboration = "Kies hoe je wilt samenwerken.";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (!token) e.turnstile = "Even bevestigen dat je geen robot bent.";
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const first = Object.keys(e)[0];
      if (first !== "turnstile") document.getElementById(`crf-${first}`)?.focus();
      return;
    }
    setErrors({});
    setStatus("submitting");
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          kind: "creator",
          channels,
          turnstileToken: token,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // The Function validates fields BEFORE Turnstile, so a field 400 leaves
        // the token unconsumed and still valid — surface the error on the field
        // and keep the armed token so a fix can resubmit straight away.
        const code = await readErrorCode(res);
        if (code && FIELD_ERROR_COPY[code]) {
          setErrors({ [code]: FIELD_ERROR_COPY[code] });
          setStatus("idle");
          document.getElementById(`crf-${code}`)?.focus();
          return;
        }
        throw new Error("send failed");
      }
      trackEvent("creator_form_submitted", { collaboration: form.collaboration });
      // Same cross-product join key as the contact form — lowercased email.
      identifyLead(form.email);
      setForm(EMPTY);
      setChannels([]);
      setStatus("success");
    } catch {
      // A close-initiated abort (not the timeout) is benign: the dialog is gone
      // and handleOpenChange already reset it — settle to idle so a fast reopen
      // isn't stuck "submitting".
      if (controller.signal.aborted && !timedOut) {
        setStatus("idle");
        return;
      }
      setStatus("error");
      // Turnstile tokens are single-use; get a fresh one for the retry.
      resetTurnstile();
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  const busy = status === "submitting";
  const showAmbassador = form.collaboration === "ambassador" || form.collaboration === "both";
  const showUgc = form.collaboration === "ugc" || form.collaboration === "both";

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
            <DialogTitle>Bedankt voor je aanmelding</DialogTitle>
            <DialogDescription className="mb-6">
              We hebben je gegevens ontvangen en nemen persoonlijk contact met je op.
            </DialogDescription>
            <Button variant="brand" pill onClick={() => handleOpenChange(false)}>
              Sluiten
            </Button>
          </div>
        ) : (
          <>
            <DialogTitle>Meld je aan</DialogTitle>
            <DialogDescription className="mb-6">
              Het kost ongeveer één minuut. Je hoort daarna persoonlijk van ons.
            </DialogDescription>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Honeypot — visually hidden + removed from tab + AT */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="crf-company">Bedrijf (niet invullen)</label>
                <input
                  id="crf-company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  label={
                    <>
                      Je naam{" "}
                      <span className="text-[var(--ld-green)]" aria-hidden="true">
                        *
                      </span>
                    </>
                  }
                  htmlFor="crf-name"
                  error={errors.name}
                  messageId="crf-name-error"
                >
                  <Input
                    id="crf-name"
                    type="text"
                    autoComplete="name"
                    disabled={busy}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Voor- en achternaam"
                    aria-required="true"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "crf-name-error" : undefined}
                  />
                </Field>

                <Field
                  label={
                    <>
                      E-mailadres{" "}
                      <span className="text-[var(--ld-green)]" aria-hidden="true">
                        *
                      </span>
                    </>
                  }
                  htmlFor="crf-email"
                  error={errors.email}
                  messageId="crf-email-error"
                >
                  <Input
                    id="crf-email"
                    type="email"
                    autoComplete="email"
                    disabled={busy}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jij@voorbeeld.nl"
                    aria-required="true"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "crf-email-error" : undefined}
                  />
                </Field>
              </div>

              <Field
                label={
                  <>
                    Hoe wil je samenwerken?{" "}
                    <span className="text-[var(--ld-green)]" aria-hidden="true">
                      *
                    </span>
                  </>
                }
                htmlFor="crf-collaboration"
                error={errors.collaboration}
                messageId="crf-collaboration-error"
              >
                <select
                  id="crf-collaboration"
                  className={selectClass}
                  disabled={busy}
                  value={form.collaboration}
                  onChange={(e) => setForm({ ...form, collaboration: e.target.value })}
                  aria-required="true"
                  aria-invalid={errors.collaboration ? true : undefined}
                  aria-describedby={
                    errors.collaboration ? "crf-collaboration-error" : undefined
                  }
                >
                  <option value="" disabled>
                    Kies een optie…
                  </option>
                  {COLLABORATION_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <fieldset className="border-0 p-0 m-0">
                <legend className="block mb-2 text-[15px] font-medium text-[var(--ld-text)]">
                  Welke kanalen gebruik je?{" "}
                  <span className="text-[var(--ld-text-muted)] font-normal">
                    (meerdere antwoorden mogelijk)
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2.5">
                  {CHANNELS.map((channel) => {
                    const checked = channels.includes(channel);
                    return (
                      <label
                        key={channel}
                        className={`inline-flex items-center cursor-pointer rounded-full border px-4 py-2 text-[15px] transition-colors duration-200 ${
                          checked
                            ? "bg-[var(--ld-green)] border-[var(--ld-green)] text-[var(--ld-on-green)]"
                            : "bg-[var(--ld-paper)] border-[var(--ld-border)] text-[var(--ld-text)] hover:border-[var(--ld-green)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={busy}
                          checked={checked}
                          onChange={() => toggleChannel(channel)}
                        />
                        {channel}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <Field
                label="Link naar je belangrijkste profiel of portfolio"
                htmlFor="crf-profile"
              >
                <Input
                  id="crf-profile"
                  type="url"
                  inputMode="url"
                  disabled={busy}
                  value={form.profile}
                  onChange={(e) => setForm({ ...form, profile: e.target.value })}
                  placeholder="https://instagram.com/jouwnaam"
                />
              </Field>

              {showAmbassador && (
                <Field
                  label={
                    <>
                      Hoe groot is je bereik op je belangrijkste kanaal?{" "}
                      <span className="text-[var(--ld-text-muted)] font-normal">
                        (optioneel)
                      </span>
                    </>
                  }
                  htmlFor="crf-reach"
                >
                  <select
                    id="crf-reach"
                    className={selectClass}
                    disabled={busy}
                    value={form.reach}
                    onChange={(e) => setForm({ ...form, reach: e.target.value })}
                  >
                    <option value="">Kies een bereik…</option>
                    <option>Onder 1.000 volgers</option>
                    <option>1.000 – 5.000 volgers</option>
                    <option>5.000 – 10.000 volgers</option>
                    <option>10.000 – 50.000 volgers</option>
                    <option>Meer dan 50.000 volgers</option>
                  </select>
                </Field>
              )}

              {showUgc && (
                <Field
                  label={
                    <>
                      Ben je zelf graag in beeld?{" "}
                      <span className="text-[var(--ld-text-muted)] font-normal">
                        (optioneel)
                      </span>
                    </>
                  }
                  htmlFor="crf-camera"
                >
                  <select
                    id="crf-camera"
                    className={selectClass}
                    disabled={busy}
                    value={form.camera}
                    onChange={(e) => setForm({ ...form, camera: e.target.value })}
                  >
                    <option value="">Kies een optie…</option>
                    <option>Ja</option>
                    <option>Soms</option>
                    <option>Nee, vooral mijn hond</option>
                  </select>
                </Field>
              )}

              <Field
                label={
                  <>
                    Vertel kort over jezelf, je content en je hond{" "}
                    <span className="text-[var(--ld-text-muted)] font-normal">
                      (optioneel)
                    </span>
                  </>
                }
                htmlFor="crf-message"
                error={errors.message}
                messageId="crf-message-error"
              >
                <Textarea
                  id="crf-message"
                  rows={4}
                  className="resize-none"
                  disabled={busy}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Wat maak je graag, wat maakt jouw content herkenbaar en welke hond speelt daarin een rol?"
                  aria-invalid={errors.message ? true : undefined}
                  aria-describedby={errors.message ? "crf-message-error" : undefined}
                />
              </Field>

              {/* Turnstile */}
              <div>
                <div ref={widgetRef} />
                {turnstileError && (
                  <p className="text-[13px] text-[var(--ld-danger)] mt-2">
                    De verificatie kon niet laden. Ververs de pagina of probeer het
                    later opnieuw.
                  </p>
                )}
                {errors.turnstile && (
                  <p className="text-[13px] text-[var(--ld-danger)] mt-2">
                    {errors.turnstile}
                  </p>
                )}
              </div>

              {status === "error" && (
                <p
                  className="text-[14px] text-[var(--ld-danger)]"
                  role="alert"
                  aria-live="polite"
                >
                  Er ging iets mis bij het versturen. Probeer het opnieuw, of mail
                  ons op creators@letsdog.nl.
                </p>
              )}

              <Button type="submit" variant="primary" pill block loading={busy}>
                {busy ? "Versturen…" : "Ik wil samenwerken"}
              </Button>

              <p className="text-[13px] text-[var(--ld-text-muted)] text-center">
                Gratis en vrijblijvend. Je hoort binnen drie werkdagen persoonlijk
                van ons.
                <br />
                Door je aan te melden ga je akkoord met ons{" "}
                <a
                  href="/privacybeleid"
                  className="text-[var(--ld-green-ink)] underline underline-offset-2"
                >
                  privacybeleid
                </a>
                .
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
