// Shared Turnstile widget plumbing for the site's two forms — the contact modal
// and the /partners creator modal. Extracted so there is ONE script-load
// singleton: two module-local copies would each be able to append their own
// <script> tag, and the reset/remove lifecycle is fiddly enough that a second
// copy would drift.

// Cloudflare's always-passes TEST site key — used when the real key is unset so
// dev/preview render a working widget without a real Turnstile config. The real
// key is inlined at build time from NEXT_PUBLIC_TURNSTILE_SITE_KEY in production.
// Pairs with the always-pass test SECRET in functions/api/contact.ts.
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

// Read the Function's `error` code from a non-OK response, defensively: a 5xx/502
// can return a non-JSON body (e.g. a gateway page) and res.json() would throw —
// swallow that so the caller falls through to the generic banner.
export async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : undefined;
  } catch {
    return undefined;
  }
}
