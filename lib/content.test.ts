import { describe, expect, it } from "vitest";

import { loadLegalContent } from "./content";

// U5: the module-scope fs read in loadLegalContent() is guarded so a missing or
// renamed content/<slug>.md fails the build with a slug-named, path-named error
// instead of a bare ENOENT. Build-time-only logic, so this pure-logic test is its
// only automated coverage (it runs off the Workers/Next runtime, cwd = repo root).
//
// Pulled forward from Phase F/U16 since the Vitest infra already exists. The fuller
// front-matter scenarios (BOM, CRLF, no front-matter, title-only) still belong to
// U16 — extend this file there rather than recreating it.
describe("loadLegalContent (U5 — build-time content guard)", () => {
  it("loads a known legal slug", () => {
    // privacybeleid.md is a committed legal page; reading it exercises the happy path.
    const { data, content } = loadLegalContent("privacybeleid");
    expect(data.title).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  it("throws a slug-named error for a missing/renamed file", () => {
    expect(() => loadLegalContent("definitely-not-a-real-slug")).toThrow(
      /definitely-not-a-real-slug/,
    );
  });

  it("names the expected content path in the error", () => {
    expect(() => loadLegalContent("definitely-not-a-real-slug")).toThrow(
      /content[/\\]definitely-not-a-real-slug\.md/,
    );
  });
});
