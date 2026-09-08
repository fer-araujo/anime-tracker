import { describe, it, expect } from "vitest";
import { ID_MAP_SIZE, anilistIdFor, malIdFor } from "../utils/idMap.js";

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
