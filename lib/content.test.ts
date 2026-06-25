import { describe, expect, it } from "vitest";

import { loadLegalContent, parseFrontMatter } from "./content";

// U5/U16 — pure-logic coverage for the legal-content loader. loadLegalContent
// reads at build time (off the Workers/Next runtime; cwd = repo root); the
// front-matter split is extracted to parseFrontMatter so the parsing variants
// are testable from strings without disk fixtures.

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

describe("parseFrontMatter (U16 — front-matter split)", () => {
  it("parses standard LF front-matter and separates the body", () => {
    const { data, content } = parseFrontMatter("---\ntitle: Hoi\ndescription: d\n---\n# Body\n");
    expect(data.title).toBe("Hoi");
    expect(data.description).toBe("d");
    expect(content.trim()).toBe("# Body");
  });

  it("tolerates CRLF line endings", () => {
    const { data, content } = parseFrontMatter("---\r\ntitle: Hoi\r\n---\r\nBody\r\n");
    expect(data.title).toBe("Hoi");
    expect(content).toContain("Body");
  });

  it("strips a leading UTF-8 BOM before the delimiter", () => {
    const { data } = parseFrontMatter("﻿---\ntitle: Hoi\n---\nBody");
    expect(data.title).toBe("Hoi");
  });

  it("no front-matter → whole input is the body with empty data", () => {
    const { data, content } = parseFrontMatter("# Just a body\nno front-matter");
    expect(data).toEqual({});
    expect(content).toContain("Just a body");
  });

  it("title-only front-matter", () => {
    const { data, content } = parseFrontMatter("---\ntitle: Alleen\n---\nB");
    expect(data.title).toBe("Alleen");
    expect(data.description).toBeUndefined();
    expect(content).toContain("B");
  });
});
