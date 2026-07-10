import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock TMDB service functions used by resolveHeroArtwork
vi.mock("../services/tmdb.service.js", () => ({
  tmdbSearch: vi.fn(),
  tmdbBackdropUrl: vi.fn(
    (path?: string | null, size = "w1280") =>
      path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  ),
  isAnimeCandidate: vi.fn(() => true),
  getTmdbImages: vi.fn(),
  resolveTmdbSeasonNumber: vi.fn(() => null),
  getTmdbSeasonImages: vi.fn(() => null),
  getTmdbExternalIds: vi.fn(),
}));

// Mock fanart.tv service
vi.mock("../services/fanart.service.js", () => ({
  getFanartTvArtwork: vi.fn(),
}));

// Mock tmdb.enrich utils
vi.mock("../utils/tmdb.enrich.js", () => ({
  getTitleVariations: vi.fn((title: string) => [title]),
  isSeasonSequel: vi.fn(() => false),
}));

import { resolveHeroArtwork } from "../utils/artwork.js";
import { tmdbSearch, getTmdbImages, getTmdbExternalIds } from "../services/tmdb.service.js";
import { getFanartTvArtwork } from "../services/fanart.service.js";

describe("resolveHeroArtwork — fanart.tv merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseMedia = { bannerImage: null, coverImage: null };

  it("fanart.tv logo wins when available, TMDB logo falls back", async () => {
    // TMDB search returns a result
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 94664, backdrop_path: "/tmdb-backdrop.jpg" },
    ]);
    // TMDB images return a logo
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [],
      logos: [
        {
          file_path: "/tmdb-logo.png",
          iso_639_1: "en",
          vote_average: 5,
          vote_count: 10,
        },
      ],
    });
    // TMDB external_ids returns TVDB ID
    vi.mocked(getTmdbExternalIds).mockResolvedValue({ tvdb_id: 371310 });
    // fanart.tv returns a logo
    vi.mocked(getFanartTvArtwork).mockResolvedValue({
      logoUrl: "https://fanart.tv/logo.png",
      backdropUrl: null,
      seasonPosters: [],
      seasonBanners: [],
      seasonThumbs: [],
    });

    const result = await resolveHeroArtwork(
      "Test Anime",
      "tv",
      baseMedia,
      { year: 2024, month: 1 },
    );

    // fanart.tv logo should win over TMDB logo
    expect(result.logo).toBe("https://fanart.tv/logo.png");
  });

  it("fanart.tv logo null → TMDB logo preserved", async () => {
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 94664, backdrop_path: "/tmdb-backdrop.jpg" },
    ]);
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [],
      logos: [
        {
          file_path: "/tmdb-logo.png",
          iso_639_1: "en",
          vote_average: 5,
          vote_count: 10,
        },
      ],
    });
    vi.mocked(getTmdbExternalIds).mockResolvedValue({ tvdb_id: 371310 });
    // fanart.tv returns NO logo
    vi.mocked(getFanartTvArtwork).mockResolvedValue({
      logoUrl: null,
      backdropUrl: null,
      seasonPosters: [],
      seasonBanners: [],
      seasonThumbs: [],
    });

    const result = await resolveHeroArtwork(
      "Test Anime",
      "tv",
      baseMedia,
      { year: 2024, month: 1 },
    );

    // TMDB logo should be preserved since fanart.tv returned null
    expect(result.logo).toContain("image.tmdb.org");
    expect(result.logo).toContain("tmdb-logo.png");
  });

  it("fanart.tv backdrop wins when available", async () => {
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 94664, backdrop_path: "/tmdb-backdrop.jpg" },
    ]);
    // TMDB images return a backdrop
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [
        {
          file_path: "/tmdb-bg.jpg",
          width: 1920,
          height: 1080,
          iso_639_1: null,
          vote_average: 5,
          vote_count: 10,
        },
      ],
      logos: [],
    });
    vi.mocked(getTmdbExternalIds).mockResolvedValue({ tvdb_id: 371310 });
    // fanart.tv returns a backdrop
    vi.mocked(getFanartTvArtwork).mockResolvedValue({
      logoUrl: null,
      backdropUrl: "https://fanart.tv/backdrop.jpg",
      seasonPosters: [],
      seasonBanners: [],
      seasonThumbs: [],
    });

    const result = await resolveHeroArtwork(
      "Test Anime",
      "tv",
      baseMedia,
      { year: 2024, month: 1 },
    );

    expect(result.backdrop).toBe("https://fanart.tv/backdrop.jpg");
  });

  it("fanart.tv empty → TMDB data preserved", async () => {
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 94664, backdrop_path: "/tmdb-backdrop.jpg" },
    ]);
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [
        {
          file_path: "/tmdb-bg.jpg",
          width: 1920,
          height: 1080,
          iso_639_1: null,
          vote_average: 5,
          vote_count: 10,
        },
      ],
      logos: [
        {
          file_path: "/tmdb-logo.png",
          iso_639_1: "en",
          vote_average: 5,
          vote_count: 10,
        },
      ],
    });
    vi.mocked(getTmdbExternalIds).mockResolvedValue({ tvdb_id: 371310 });
    // fanart.tv returns null (full failure)
    vi.mocked(getFanartTvArtwork).mockResolvedValue(null);

    const result = await resolveHeroArtwork(
      "Test Anime",
      "tv",
      baseMedia,
      { year: 2024, month: 1 },
    );

    // TMDB data should be fully preserved
    expect(result.backdrop).toContain("image.tmdb.org");
    expect(result.logo).toContain("image.tmdb.org");
  });

  it("movie kind skips fanart.tv entirely", async () => {
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 550, backdrop_path: "/movie-bg.jpg" },
    ]);
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [
        {
          file_path: "/movie-bg.jpg",
          width: 1920,
          height: 1080,
          iso_639_1: null,
          vote_average: 5,
          vote_count: 10,
        },
      ],
      logos: [],
    });

    const result = await resolveHeroArtwork(
      "Test Movie",
      "movie",
      baseMedia,
    );

    // fanart.tv should NEVER be called for movies
    expect(getTmdbExternalIds).not.toHaveBeenCalled();
    expect(getFanartTvArtwork).not.toHaveBeenCalled();
    expect(result.backdrop).toContain("image.tmdb.org");
  });

  it("TVDB ID missing → skips fanart.tv, TMDB data preserved", async () => {
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 94664, backdrop_path: "/tmdb-backdrop.jpg" },
    ]);
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [
        {
          file_path: "/tmdb-bg.jpg",
          width: 1920,
          height: 1080,
          iso_639_1: null,
          vote_average: 5,
          vote_count: 10,
        },
      ],
      logos: [],
    });
    // No TVDB ID returned
    vi.mocked(getTmdbExternalIds).mockResolvedValue({ tvdb_id: null });

    const result = await resolveHeroArtwork(
      "Test Anime",
      "tv",
      baseMedia,
      { year: 2024, month: 1 },
    );

    expect(getFanartTvArtwork).not.toHaveBeenCalled();
    expect(result.backdrop).toContain("image.tmdb.org");
  });

  it("fanart.tv error → TMDB fallback", async () => {
    vi.mocked(tmdbSearch).mockResolvedValue([
      { id: 94664, backdrop_path: "/tmdb-backdrop.jpg" },
    ]);
    vi.mocked(getTmdbImages).mockResolvedValue({
      backdrops: [
        {
          file_path: "/tmdb-bg.jpg",
          width: 1920,
          height: 1080,
          iso_639_1: null,
          vote_average: 5,
          vote_count: 10,
        },
      ],
      logos: [],
    });
    vi.mocked(getTmdbExternalIds).mockResolvedValue({ tvdb_id: 371310 });
    // fanart.tv throws (simulates network error)
    vi.mocked(getFanartTvArtwork).mockRejectedValue(new Error("Network error"));

    const result = await resolveHeroArtwork(
      "Test Anime",
      "tv",
      baseMedia,
      { year: 2024, month: 1 },
    );

    // Should fall back to TMDB data without crashing
    expect(result.backdrop).toContain("image.tmdb.org");
  });
});
