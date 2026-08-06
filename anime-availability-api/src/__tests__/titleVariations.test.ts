import { describe, it, expect } from "vitest";
import { getTitleVariations } from "../utils/tmdb.enrich.js";

describe("getTitleVariations", () => {
  it("keeps the apostrophe in the first candidate", () => {
    // The reported bug: TMDB indexes titles verbatim, so searching "jojos"
    // returns nothing while "jojo's" returns the parent series. Stripping
    // punctuation before the first attempt made the match impossible.
    const variants = getTitleVariations(
      "STEEL BALL RUN JoJo's Bizarre Adventure 1st STAGE",
    );

    expect(variants[0]).toBe(
      "steel ball run jojo's bizarre adventure 1st stage",
    );
  });

  it("still offers the punctuation-stripped form as a fallback", () => {
    // AniList and TMDB don't always punctuate a title the same way, so the
    // permissive form stays useful — just never as the only attempt.
    const variants = getTitleVariations("JoJo's Bizarre Adventure");

    expect(variants).toContain("jojo's bizarre adventure");
    expect(variants).toContain("jojos bizarre adventure");
    expect(variants.indexOf("jojo's bizarre adventure")).toBeLessThan(
      variants.indexOf("jojos bizarre adventure"),
    );
  });

  it("preserves punctuation when trimming at a colon", () => {
    const variants = getTitleVariations(
      "Kino's Journey: The Beautiful World",
    );

    expect(variants).toContain("kino's journey");
  });

  it("still strips season and part suffixes", () => {
    // Pre-existing behaviour that must not regress: the suffix is what
    // prevents a match against the parent entry on TMDB.
    expect(getTitleVariations("Vinland Saga Season 2")[0]).toBe("vinland saga");

    const bleach = getTitleVariations("Bleach: TYBW Part 3");
    expect(bleach.every((v) => !v.includes("part"))).toBe(true);
    // Fullest form first, broadening only as earlier attempts fail.
    expect(bleach[0]).toBe("bleach: tybw");
    expect(bleach).toContain("bleach");
  });

  it("emits no duplicates for titles without punctuation", () => {
    // Both forms collapse to the same string here; a Set keeps it to one
    // request instead of querying TMDB twice for an identical query.
    expect(getTitleVariations("Vinland Saga")).toEqual(["vinland saga"]);
  });

  it("returns an empty list for an empty title", () => {
    expect(getTitleVariations("")).toEqual([]);
  });
});
