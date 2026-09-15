// Shared Turnstile widget plumbing for the site's two forms — the contact modal
// and the /partners creator modal. Extracted so there is ONE script-load
// singleton: two module-local copies would each be able to append their own
// <script> tag, and the reset/remove lifecycle is fiddly enough that a second
// copy would drift.

// Cloudflare's always-passes TEST site key — used when the real key is unset so
// dev/preview render a working widget without a real Turnstile config. The real
// key is inlined at build time from NEXT_PUBLIC_TURNSTILE_SITE_KEY in production.
// The SECRET that verifies it lives on the platform since 2026-09-14 (T-83, as
// WEBSITE_TURNSTILE_SECRET_KEY), and it is the real one: a test-key token is
// refused there, so the forms render on a preview but cannot deliver from one.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

export interface TurnstileAPI {
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

export function loadTurnstile(): Promise<void> {
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
