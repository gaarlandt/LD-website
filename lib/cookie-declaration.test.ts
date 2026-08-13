import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COOKIE_DECLARATION_PATH, COOKIE_DECLARATION_SLUG } from "./cookie-declaration";
import { loadLegalContent } from "./content";

// T-33 form 2: when Cookiebot is absent the footer falls back to a link to the
// cookie declaration instead of rendering nothing. That fallback is only worth
// something if the page it points at exists AND still names the withdrawal
// routes that keep working without Cookiebot — so both are read off disk here
// rather than asserted in a comment. The component that consumes this is a
// client component and the test env is Node, so this is the part that CAN be
// pinned; the rendered swap itself is verified in the browser.

describe("the footer's Cookiebot-less fallback target", () => {
  it("points at a route that exists in the static export", () => {
    // The content file existing is not enough — the route can be deleted while
    // the markdown lingers, and then the fallback link 404s.
    const page = path.join(process.cwd(), "app", COOKIE_DECLARATION_SLUG, "page.tsx");
    expect(fs.existsSync(page), `${page} is gone — the footer fallback would 404`).toBe(true);
    expect(COOKIE_DECLARATION_PATH).toBe(`/${COOKIE_DECLARATION_SLUG}`);
  });

  it("is backed by committed legal content", () => {
    const { data, content } = loadLegalContent(COOKIE_DECLARATION_SLUG);
    expect(data.title).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  it("still names the two routes that work without Cookiebot", () => {
    // This does NOT own the copy — that is Jur's. It guards the dependency:
    // form 2's whole justification is that this page names the preference screen
    // on mijn.letsdog.nl (reachable without an account) and the browser's own
    // settings. If a rewrite ever drops them, the fallback becomes a dead end,
    // and that should fail loudly here rather than quietly in the footer.
    const { content } = loadLegalContent(COOKIE_DECLARATION_SLUG);
    expect(content).toMatch(/mijn\.letsdog\.nl/);
    expect(content.toLowerCase()).toMatch(/browser/);
  });
});
