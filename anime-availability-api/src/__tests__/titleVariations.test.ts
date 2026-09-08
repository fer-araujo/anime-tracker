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

/**
 * TMDB models a sequel as another season of one series, so "Youjo Senki II"
 * does not exist there. The strip that already handled AniList's spelling
 * ("2nd Season", "Part 2") missed the Roman numerals the fallback sources use,
 * and a miss is expensive twice over: no synopsis, no providers, and a metered
 * RapidAPI call to answer what TMDB would have answered for free.
 *
 * Measured across the 179 currently-airing series: 75% matched before, 83%
 * after. The other side of that trade is over-trimming, which these pin.
 */
describe("getTitleVariations — sequel and disambiguator suffixes", () => {
  it("offers the base title for a Roman-numeral sequel", () => {
    expect(getTitleVariations("Youjo Senki II")).toContain("youjo senki");
  });

  it("offers the base title for a numbered sequel, including two digits", () => {
    expect(getTitleVariations("Swallowed Star 4")).toContain("swallowed star");
    expect(getTitleVariations("Tales of Demon and God 10")).toContain(
      "tales of demon and god",
    );
  });

  it("drops a trailing year or medium qualifier", () => {
    // The fallback sources qualify long-runners the way a catalogue does;
    // TMDB keeps the year in its own field and indexes the bare name.
    expect(getTitleVariations("Doraemon (2005)")).toContain("doraemon");
    expect(getTitleVariations("Koukaku Kidoutai (TV)")).toContain(
      "koukaku kidoutai",
    );
  });

  it("tries the title as written before anything trimmed", () => {
    // A series really called "Gundam ZZ" must get its own query first.
    expect(getTitleVariations("Youjo Senki II")[0]).toBe("youjo senki ii");
  });

  it("leaves a number that is part of the name alone", () => {
    // Every one of these would become a different show if trimmed.
    expect(getTitleVariations("Mob Psycho 100")).toEqual(["mob psycho 100"]);
    expect(getTitleVariations("86")).toEqual(["86"]);
    expect(getTitleVariations("Mobile Suit Gundam 00")).toEqual([
      "mobile suit gundam 00",
    ]);
    expect(getTitleVariations("Gundam ZZ")).toEqual(["gundam zz"]);
  });

  it("refuses a colon head too short to be a title", () => {
    // "Re:Zero…" split to "re", which TMDB answers with twenty unrelated shows
    // and the caller takes the first. A wrong provider list is worse than none.
    expect(getTitleVariations("Re:Zero kara Hajimeru Isekai Seikatsu")).not.toContain(
      "re",
    );
  });
});
