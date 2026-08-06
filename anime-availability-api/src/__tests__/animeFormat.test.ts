import { describe, it, expect } from "vitest";
import { tmdbKindsFor, primaryTmdbKind } from "../utils/animeFormat.js";

describe("tmdbKindsFor", () => {
  it("searches only movies for a theatrical film", () => {
    expect(tmdbKindsFor("MOVIE")).toEqual(["movie"]);
  });

  it("searches only series for regular TV", () => {
    expect(tmdbKindsFor("TV")).toEqual(["tv"]);
    expect(tmdbKindsFor("TV_SHORT")).toEqual(["tv"]);
  });

  it("tries both catalogues for a SPECIAL, movies first", () => {
    // The reported bug: ONE PIECE HEROINES is a SPECIAL on AniList but a movie
    // on TMDB. Assuming "tv" meant no match, no tmdbId, and a false "Pirata".
    expect(tmdbKindsFor("SPECIAL")).toEqual(["movie", "tv"]);
  });

  it("tries both catalogues for OVA and MUSIC", () => {
    expect(tmdbKindsFor("OVA")).toEqual(["movie", "tv"]);
    expect(tmdbKindsFor("MUSIC")).toEqual(["movie", "tv"]);
  });

  it("prefers series for ONA but still falls back", () => {
    expect(tmdbKindsFor("ONA")).toEqual(["tv", "movie"]);
  });

  it("never gives up after a single catalogue for unknown formats", () => {
    // Guards against a new AniList format silently degrading to one guess.
    for (const format of [undefined, null, "", "SOMETHING_NEW"]) {
      expect(tmdbKindsFor(format)).toHaveLength(2);
    }
  });

  it("is case-insensitive", () => {
    expect(tmdbKindsFor("movie")).toEqual(["movie"]);
  });

  it("primaryTmdbKind returns the likeliest catalogue", () => {
    expect(primaryTmdbKind("SPECIAL")).toBe("movie");
    expect(primaryTmdbKind("TV")).toBe("tv");
  });
});
