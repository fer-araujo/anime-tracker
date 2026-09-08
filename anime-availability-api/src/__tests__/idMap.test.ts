import { describe, it, expect } from "vitest";
import { ID_MAP_SIZE, anilistIdFor, malIdFor, genresFor, studioFor } from "../utils/idMap.js";

describe("AniList ↔ MAL id map", () => {
  it("translates ids that differ between the two sites", () => {
    // The case that makes this table necessary. Get it wrong and a fallback
    // returns Frieren under an id the user's library has never seen.
    expect(malIdFor(154587)).toBe(52991);
    expect(anilistIdFor(52991)).toBe(154587);
  });

  it("still maps the ids that happen to agree", () => {
    // One Piece is 21 on both, which is exactly why the problem is easy to
    // miss when spot-checking.
    expect(malIdFor(21)).toBe(21);
    expect(malIdFor(16498)).toBe(16498);
  });

  it("round-trips", () => {
    for (const anilistId of [1, 21, 16498, 154587, 178789]) {
      const mal = malIdFor(anilistId);
      expect(mal).not.toBeNull();
      expect(anilistIdFor(mal as number)).toBe(anilistId);
    }
  });

  it("returns null for an unknown id instead of guessing", () => {
    // The 9% of AniList entries with no MAL counterpart. No fallback can serve
    // them, and saying so beats inventing a number.
    expect(malIdFor(999999999)).toBeNull();
    expect(anilistIdFor(999999999)).toBeNull();
  });

  it("carries the whole table, not a truncated copy", () => {
    // Guards against a regeneration that silently produced a fraction of it.
    expect(ID_MAP_SIZE).toBeGreaterThan(15000);
  });
});

/**
 * Genres were the last empty row on a degraded card. They ship in the same
 * generated table as the studio because no fallback source carries them without
 * one detail call per anime.
 */
describe("genresFor", () => {
  it("reads the genres AniList would have returned", () => {
    // Frieren: the fantasy/slice-of-life pairing is what makes it recognisable.
    const genres = genresFor(154587);

    expect(genres).toContain("Fantasy");
    expect(genres).toContain("Slice of Life");
  });

  it("returns an empty list rather than throwing for an unknown id", () => {
    expect(genresFor(999999999)).toEqual([]);
  });

  it("keeps the studio readable now that the slot can hold a placeholder", () => {
    // An entry with genres but no studio stores 0 there; reading it as a name
    // would print "0" under the title.
    expect(studioFor(154587)).toBe("Madhouse");
  });
});
