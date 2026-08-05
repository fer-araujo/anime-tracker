import { describe, it, expect, vi, beforeEach } from "vitest";

// Read at module load inside resolveProviders — must be set before the import.
process.env.STREAMING_AVAILABILITY_KEY = "test-key";

const mockTmdbDetailed = vi.fn();
vi.mock("../services/tmdb.service.js", () => ({
  tmdbWatchProvidersDetailed: (...args: unknown[]) => mockTmdbDetailed(...args),
}));

const mockTryConsume = vi.fn();
vi.mock("../utils/quotaGuard.js", () => ({
  tryConsumeRapidApiCall: () => mockTryConsume(),
}));

const cacheStore = new Map<string, { value: unknown; ttl: number }>();
vi.mock("../utils/cache.js", () => ({
  memoryCache: {
    get: (k: string) => cacheStore.get(k)?.value,
    set: (k: string, value: unknown, ttl: number) =>
      cacheStore.set(k, { value, ttl }),
  },
}));

vi.mock("./tmdb.enrich.js", () => ({ getTitleVariations: (t: string) => [t] }));
vi.mock("../utils/tmdb.enrich.js", () => ({
  getTitleVariations: (t: string) => [t],
}));

const { resolveProvidersForAnimeDetailed } = await import(
  "../utils/resolveProviders.js"
);

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;
const cachedTtlFor = (anilistId: number) =>
  cacheStore.get(`providers:resolved:${anilistId}:MX`)?.ttl;

describe("resolveProvidersForAnimeDetailed — verified vs unverified verdicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
    global.fetch = vi.fn();
  });

  it("does not cache a 'Pirata' verdict long when the RapidAPI budget blocked the lookup", async () => {
    // The P1 incident: the budget short-circuits the call, the title is never
    // actually checked, yet the empty result was being stored as fact for a
    // week — so one exhausted budget poisoned the whole catalogue.
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });
    mockTryConsume.mockReturnValue(false);

    const result = await resolveProvidersForAnimeDetailed(
      1,
      "MX",
      555,
      "One Piece",
      2024,
      "tv",
      true,
    );

    expect(result.providers).toEqual(["Pirata"]);
    expect(result.saOk).toBe(false);
    expect(cachedTtlFor(1)).toBeLessThan(SEVEN_DAYS);
  });

  it("never reaches the paid API once the budget is spent", async () => {
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });
    mockTryConsume.mockReturnValue(false);

    await resolveProvidersForAnimeDetailed(2, "MX", 555, "One Piece", 2024);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("treats a failed TMDB lookup as unverified rather than as 'no providers'", async () => {
    // A 401/404/429 used to yield the same empty array as a real answer,
    // which marked tmdbOk true and earned the verdict a 7-day cache.
    mockTmdbDetailed.mockResolvedValue({ ok: false, providers: [] });
    mockTryConsume.mockReturnValue(false);

    const result = await resolveProvidersForAnimeDetailed(
      3,
      "MX",
      555,
      "One Piece",
      2024,
    );

    expect(result.tmdbOk).toBe(false);
    expect(cachedTtlFor(3)).toBeLessThan(SEVEN_DAYS);
  });

  it("caches a genuine TMDB result for the full window", async () => {
    mockTmdbDetailed.mockResolvedValue({
      ok: true,
      providers: [{ id: 1, name: "Crunchyroll" }],
    });

    const result = await resolveProvidersForAnimeDetailed(
      4,
      "MX",
      555,
      "One Piece",
      2024,
    );

    expect(result.providers).toEqual(["Crunchyroll"]);
    expect(result.usedSource).toBe("tmdb");
    expect(result.tmdbOk).toBe(true);
    expect(cachedTtlFor(4)).toBe(SEVEN_DAYS);
  });

  it("trusts an empty answer that TMDB actually returned", async () => {
    // Distinct from the failure case: TMDB replied, the region simply has no
    // provider. That verdict is real and deserves the long cache.
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });
    mockTryConsume.mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ shows: [] }),
    });

    const result = await resolveProvidersForAnimeDetailed(
      5,
      "MX",
      555,
      "One Piece",
      2024,
    );

    expect(result.tmdbOk).toBe(true);
    expect(result.saOk).toBe(true);
    expect(cachedTtlFor(5)).toBe(SEVEN_DAYS);
  });
});
