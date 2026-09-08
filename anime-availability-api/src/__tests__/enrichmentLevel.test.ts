import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import { getTmdbSpecificSynopsis } from "../services/tmdb.service.js";
import { resolveProvidersForAnimeDetailed } from "../utils/resolveProviders.js";
import { enrichFromMalAndKitsu } from "../utils/enrich.js";
import type { AniMedia } from "../types/animeCore.js";

vi.mock("../services/tmdb.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../services/tmdb.service.js")
  >("../services/tmdb.service.js");
  return {
    ...actual,
    tmdbSearch: vi.fn().mockResolvedValue([{ id: 555, name: "Test" }]),
    isAnimeCandidate: () => true,
    getTmdbSpecificSynopsis: vi.fn().mockResolvedValue("Sinopsis en español."),
  };
});

vi.mock("../utils/resolveProviders.js", () => ({
  resolveProvidersForAnimeDetailed: vi
    .fn()
    .mockResolvedValue({ providers: ["Netflix"] }),
}));

vi.mock("../utils/enrich.js", () => ({
  enrichFromMalAndKitsu: vi.fn().mockResolvedValue(null),
}));

const media: AniMedia = {
  id: 1,
  title: { romaji: "Test", english: "Test" },
  description: "An English description from AniList.",
  genres: ["Action"],
  status: "RELEASING",
  format: "TV",
};

beforeEach(() => vi.clearAllMocks());

/**
 * These three used to ride on one boolean, which is how asking for Spanish text
 * silently bought a metered provider lookup. Each row pins one of them to the
 * level that should own it.
 */
describe("EnrichmentLevel", () => {
  it("light: no Spanish synopsis, and the paid fallback stays off", async () => {
    const [item] = await formatAnimeList([media], "MX", undefined, undefined, "light");

    expect(getTmdbSpecificSynopsis).not.toHaveBeenCalled();
    expect(item.meta.synopsisLang).toBe("en");
    expect(
      vi.mocked(resolveProvidersForAnimeDetailed).mock.calls[0]?.[7],
    ).toMatchObject({ skipPaidFallback: true });
  });

  it("localized: Spanish synopsis, and the paid fallback still off", async () => {
    // The whole reason this level exists. RapidAPI is capped at 1000 calls a
    // month and 35 a day; a page of twenty must not be able to spend the day.
    const [item] = await formatAnimeList([media], "MX", undefined, undefined, "localized");

    expect(getTmdbSpecificSynopsis).toHaveBeenCalled();
    expect(item.meta.synopsisLang).toBe("es");
    expect(item.meta.synopsis).toContain("español");
    expect(
      vi.mocked(resolveProvidersForAnimeDetailed).mock.calls[0]?.[7],
    ).toMatchObject({ skipPaidFallback: true });
  });

  it("full: Spanish synopsis and the paid fallback allowed", async () => {
    await formatAnimeList([media], "MX", undefined, undefined, "full");

    expect(getTmdbSpecificSynopsis).toHaveBeenCalled();
    expect(
      vi.mocked(resolveProvidersForAnimeDetailed).mock.calls[0]?.[7],
    ).toMatchObject({ skipPaidFallback: false });
  });

  it("only full reaches for MAL and Kitsu when TMDB misses", async () => {
    const tmdb = await import("../services/tmdb.service.js");
    vi.mocked(tmdb.tmdbSearch).mockResolvedValue([]);

    for (const level of ["light", "localized"] as const) {
      vi.mocked(enrichFromMalAndKitsu).mockClear();
      await formatAnimeList([media], "MX", undefined, undefined, level);
      expect(enrichFromMalAndKitsu).not.toHaveBeenCalled();
    }

    vi.mocked(enrichFromMalAndKitsu).mockClear();
    await formatAnimeList([media], "MX", undefined, undefined, "full");
    expect(enrichFromMalAndKitsu).toHaveBeenCalled();
  });

  it("defaults to full when no level is given", async () => {
    // The previous test leaves TMDB returning no match, and without a tmdbId
    // there is no Spanish synopsis to ask for regardless of level.
    const tmdb = await import("../services/tmdb.service.js");
    vi.mocked(tmdb.tmdbSearch).mockResolvedValue([
      { id: 555, name: "Test" } as never,
    ]);

    await formatAnimeList([media], "MX");
    expect(getTmdbSpecificSynopsis).toHaveBeenCalled();
  });
});
