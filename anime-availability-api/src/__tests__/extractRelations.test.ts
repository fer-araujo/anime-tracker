import { describe, it, expect } from "vitest";
import { extractContinuationOf } from "../utils/extractRelations.js";

const anime = (id: number, title: string) => ({
  id,
  type: "ANIME",
  title: { romaji: title, english: null, native: null },
});

describe("extractContinuationOf", () => {
  it("reads the PREQUEL edge, because that is what names the earlier season", () => {
    // The direction is the easy thing to get backwards: a 2nd season carries a
    // PREQUEL edge pointing at season 1. Reading SEQUEL would name whatever
    // comes after — usually nothing, for a show that is still airing.
    const result = extractContinuationOf({
      edges: [
        { relationType: "PREQUEL", node: anime(1, "Shangri-La Frontier") },
        { relationType: "SEQUEL", node: anime(3, "Shangri-La Frontier 3rd") },
      ],
    });

    expect(result).toEqual({ id: 1, title: "Shangri-La Frontier" });
  });

  it("falls back to PARENT for a spin-off with no prequel", () => {
    const result = extractContinuationOf({
      edges: [{ relationType: "PARENT", node: anime(7, "Iruma-kun") }],
    });

    expect(result).toEqual({ id: 7, title: "Iruma-kun" });
  });

  it("prefers PREQUEL over PARENT when both exist", () => {
    const result = extractContinuationOf({
      edges: [
        { relationType: "PARENT", node: anime(7, "Parent Series") },
        { relationType: "PREQUEL", node: anime(8, "Previous Season") },
      ],
    });

    expect(result?.id).toBe(8);
  });

  it("ignores manga nodes", () => {
    // AniList links the source manga through these same edges. "Sequel to <the
    // manga>" is nonsense — that relationship is what `source` reports.
    const result = extractContinuationOf({
      edges: [
        {
          relationType: "PREQUEL",
          node: { id: 99, type: "MANGA", title: { romaji: "Some Manga" } },
        },
      ],
    });

    expect(result).toBeNull();
  });

  it("prefers the English title when AniList has one", () => {
    const result = extractContinuationOf({
      edges: [
        {
          relationType: "PREQUEL",
          node: {
            id: 5,
            type: "ANIME",
            title: { romaji: "Kimetsu no Yaiba", english: "Demon Slayer" },
          },
        },
      ],
    });

    expect(result?.title).toBe("Demon Slayer");
  });

  it("skips an untitled node rather than emitting an empty label", () => {
    const result = extractContinuationOf({
      edges: [
        {
          relationType: "PREQUEL",
          node: { id: 5, type: "ANIME", title: {} },
        },
      ],
    });

    expect(result).toBeNull();
  });

  it("returns null for missing, empty or adaptation-only relations", () => {
    expect(extractContinuationOf(null)).toBeNull();
    expect(extractContinuationOf(undefined)).toBeNull();
    expect(extractContinuationOf({ edges: [] })).toBeNull();
    expect(
      extractContinuationOf({
        edges: [{ relationType: "ADAPTATION", node: anime(2, "Other") }],
      }),
    ).toBeNull();
  });
});
