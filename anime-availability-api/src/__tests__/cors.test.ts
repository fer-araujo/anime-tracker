import { describe, it, expect } from "vitest";
import {
  normalizeOrigin,
  parseAllowedOrigins,
  isOriginAllowed,
} from "../utils/cors.js";

describe("normalizeOrigin", () => {
  it("strips the trailing slash browsers never send", () => {
    // The exact production incident: the value was copied from the address
    // bar (with slash), the Origin header has none, nothing ever matched.
    expect(normalizeOrigin("https://anime-tracker-hazel-pi.vercel.app/")).toBe(
      "https://anime-tracker-hazel-pi.vercel.app",
    );
  });

  it("strips surrounding whitespace and lowercases", () => {
    expect(normalizeOrigin("  HTTPS://Example.COM  ")).toBe(
      "https://example.com",
    );
  });
});

describe("parseAllowedOrigins", () => {
  it("splits, normalizes and drops empty entries", () => {
    expect(
      parseAllowedOrigins("https://a.vercel.app/, ,https://B.vercel.app"),
    ).toEqual(["https://a.vercel.app", "https://b.vercel.app"]);
  });

  it("returns an empty list when unset", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe("isOriginAllowed", () => {
  const allowed = parseAllowedOrigins(
    "https://anime-tracker-hazel-pi.vercel.app/,https://*.preview.vercel.app",
  );

  it("matches the production origin despite the configured trailing slash", () => {
    expect(
      isOriginAllowed("https://anime-tracker-hazel-pi.vercel.app", allowed),
    ).toBe(true);
  });

  it("rejects an unrelated origin", () => {
    expect(isOriginAllowed("https://evil.com", allowed)).toBe(false);
  });

  it("matches a wildcard subdomain", () => {
    expect(
      isOriginAllowed("https://build-123.preview.vercel.app", allowed),
    ).toBe(true);
  });

  it("does not let a wildcard span dots", () => {
    // "*" must consume exactly one label, otherwise an attacker-controlled
    // host could be crafted to satisfy the pattern.
    expect(
      isOriginAllowed("https://a.b.preview.vercel.app", allowed),
    ).toBe(false);
  });

  it("does not treat the wildcard as a substring match", () => {
    expect(
      isOriginAllowed("https://evil.com/x.preview.vercel.app", allowed),
    ).toBe(false);
  });

  it("rejects everything when the allowlist is empty", () => {
    expect(isOriginAllowed("https://anything.com", [])).toBe(false);
  });
});
