import { describe, it, expect } from "vitest";
import type { Anime } from "@/types/anime";
import type { SeasonCatalogue } from "@/types/season";
import {
  buildFormatCounts,
  buildYearOptions,
  describeResults,
  getDefaultSeason,
  normalizeFormatKey,
  normalizeViewMode,
  resolveFormatBucket,
  selectByFormat,
} from "@/lib/season";

const make = (id: number, title: string, type: string | null): Anime => ({
  id: { anilist: id, tmdb: null },
  title,
  providers: [],
  images: { poster: null },
  meta: { type },
});

const catalogue = (
  seasonal: Anime[],
  leftovers: Anime[] = [],
): SeasonCatalogue => ({ seasonal, leftovers });

describe("resolveFormatBucket", () => {
  it("counts a short-form weekly as TV", () => {
    // A three-minute weekly is still a weekly: the chip answers "how much time
    // does this cost me", and TV_SHORT costs the same shape of time as TV.
    expect(resolveFormatBucket(make(1, "A", "TV"))).toBe("tv");
    expect(resolveFormatBucket(make(2, "B", "TV_SHORT"))).toBe("tv");
  });

  it("separates films", () => {
    expect(resolveFormatBucket(make(3, "C", "MOVIE"))).toBe("movie");
  });

  it("groups the short odds and ends together", () => {
    for (const format of ["OVA", "ONA", "SPECIAL", "MUSIC"]) {
      expect(resolveFormatBucket(make(4, "D", format))).toBe("ova");
    }
  });

  it("files an unknown or missing format under ova instead of dropping it", () => {
    // Dropping unknowns would make the chip counts disagree with the total, and
    // a count that does not add up is worse than a slightly wrong bucket.
    expect(resolveFormatBucket(make(5, "E", null))).toBe("ova");
    expect(resolveFormatBucket(make(6, "F", "SOMETHING_NEW"))).toBe("ova");
  });

  it("is case-insensitive", () => {
    expect(resolveFormatBucket(make(7, "G", "tv"))).toBe("tv");
  });
});

describe("buildFormatCounts", () => {
  const sample = catalogue(
    [
      make(1, "Serie A", "TV"),
      make(2, "Serie B", "TV"),
      make(3, "Peli", "MOVIE"),
      make(4, "Especial", "SPECIAL"),
    ],
    [make(9, "One Piece", "TV")],
  );

  it("counts every bucket and totals to the season", () => {
    const chips = buildFormatCounts(sample);
    const byKey = Object.fromEntries(chips.map((c) => [c.key, c.count]));

    expect(byKey.all).toBe(4);
    expect(byKey.tv).toBe(2);
    expect(byKey.movie).toBe(1);
    expect(byKey.ova).toBe(1);
    expect(byKey.tv + byKey.movie + byKey.ova).toBe(byKey.all);
  });

  it("counts leftovers separately from the season total", () => {
    // They are not part of the season — that is precisely why the season query
    // cannot see them — so folding them into `all` would misreport it.
    const chips = buildFormatCounts(sample);
    expect(chips.find((c) => c.key === "leftovers")?.count).toBe(1);
    expect(chips.find((c) => c.key === "all")?.count).toBe(4);
  });

  it("drops empty buckets so no chip advertises nothing", () => {
    const chips = buildFormatCounts(catalogue([make(1, "Serie", "TV")]));
    expect(chips.map((c) => c.key)).toEqual(["all", "tv"]);
  });

  it("keeps `all` even when the season is empty", () => {
    const chips = buildFormatCounts(catalogue([]));
    expect(chips.map((c) => c.key)).toEqual(["all"]);
  });

  it("keeps the chips in reading order", () => {
    expect(buildFormatCounts(sample).map((c) => c.key)).toEqual([
      "all",
      "tv",
      "movie",
      "ova",
      "leftovers",
    ]);
  });
});

describe("selectByFormat", () => {
  const sample = catalogue(
    [make(1, "Serie", "TV"), make(2, "Peli", "MOVIE")],
    [make(9, "One Piece", "TV")],
  );

  it("returns the whole season for `all`", () => {
    expect(selectByFormat(sample, "all")).toHaveLength(2);
  });

  it("returns the other array entirely for `leftovers`", () => {
    const result = selectByFormat(sample, "leftovers");
    expect(result.map((a) => a.id.anilist)).toEqual([9]);
  });

  it("never mixes leftovers into a format bucket", () => {
    // Both the leftover and the seasonal entry are TV; only the seasonal one
    // may answer the TV chip.
    expect(selectByFormat(sample, "tv").map((a) => a.id.anilist)).toEqual([1]);
  });
});

describe("normalizeFormatKey", () => {
  const chips = buildFormatCounts(catalogue([make(1, "Serie", "TV")]));

  it("keeps a key the current response can serve", () => {
    expect(normalizeFormatKey("tv", chips)).toBe("tv");
  });

  it("falls back when the bucket does not exist this season", () => {
    // A bookmarked `?format=movie` on a season with no films would otherwise
    // render an empty page with no chip highlighted to explain why.
    expect(normalizeFormatKey("movie", chips)).toBe("all");
  });

  it("falls back for junk and absent values", () => {
    expect(normalizeFormatKey("../etc", chips)).toBe("all");
    expect(normalizeFormatKey(null, chips)).toBe("all");
    expect(normalizeFormatKey(undefined, chips)).toBe("all");
  });
});

describe("normalizeViewMode", () => {
  it("only accepts list, defaulting to grid", () => {
    expect(normalizeViewMode("list")).toBe("list");
    expect(normalizeViewMode("grid")).toBe("grid");
    expect(normalizeViewMode("chart")).toBe("grid");
    expect(normalizeViewMode(null)).toBe("grid");
  });
});

describe("describeResults", () => {
  it("agrees in number", () => {
    expect(describeResults("movie", 1)).toBe("1 película");
    expect(describeResults("movie", 2)).toBe("2 películas");
    expect(describeResults("all", 1)).toBe("1 lanzamiento");
  });

  it("explains what leftovers are rather than naming a format", () => {
    expect(describeResults("leftovers", 3)).toContain(
      "siguen de la temporada anterior",
    );
  });

  it("does not print a zero count", () => {
    expect(describeResults("tv", 0)).toBe(
      "No hay lanzamientos para esta temporada.",
    );
  });
});

describe("date-derived options", () => {
  it("spans next year back to 2009, newest first", () => {
    // The picker used to stop five years back, which put most of AniList's
    // usable seasonal data out of reach. Newest first because the current
    // season is the common case and should not be the longest scroll.
    const options = buildYearOptions(new Date("2026-08-10T12:00:00Z"));
    const values = options.map((o) => o.value);

    expect(values[0]).toBe("2027");
    expect(values[values.length - 1]).toBe("2009");
    expect(values).toHaveLength(2027 - 2009 + 1);
    expect(values).toEqual([...values].sort().reverse());
  });

  it("moves with the clock rather than pinning the newest year", () => {
    const options = buildYearOptions(new Date("2030-01-01T12:00:00Z"));
    expect(options[0].value).toBe("2031");
    expect(options[options.length - 1].value).toBe("2009");
  });

  it("maps months onto seasons at the boundaries", () => {
    expect(getDefaultSeason(new Date(2026, 0, 1))).toBe("WINTER");
    expect(getDefaultSeason(new Date(2026, 2, 31))).toBe("WINTER");
    expect(getDefaultSeason(new Date(2026, 3, 1))).toBe("SPRING");
    expect(getDefaultSeason(new Date(2026, 6, 1))).toBe("SUMMER");
    expect(getDefaultSeason(new Date(2026, 9, 1))).toBe("FALL");
    expect(getDefaultSeason(new Date(2026, 11, 31))).toBe("FALL");
  });
});
