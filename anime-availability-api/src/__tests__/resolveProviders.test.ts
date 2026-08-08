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

const mockGetStored = vi.fn();
const mockStore = vi.fn();
vi.mock("../utils/providerStore.js", () => ({
  getStoredProviders: (...a: unknown[]) => mockGetStored(...a),
  storeProviders: (...a: unknown[]) => mockStore(...a),
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
    mockGetStored.mockResolvedValue(null);
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

  it("never persists an unverified verdict", async () => {
    // Writing this to the durable store would outlive every restart, turning a
    // momentary budget block into a permanent claim that nothing is available.
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });
    mockTryConsume.mockReturnValue(false);

    await resolveProvidersForAnimeDetailed(10, "MX", 555, "One Piece", 2024);

    expect(mockStore).not.toHaveBeenCalled();
  });

  it("persists a confirmed provider so the next deploy doesn't re-buy it", async () => {
    mockTmdbDetailed.mockResolvedValue({
      ok: true,
      providers: [{ id: 1, name: "Crunchyroll" }],
    });

    await resolveProvidersForAnimeDetailed(11, "MX", 555, "One Piece", 2024);

    expect(mockStore).toHaveBeenCalledWith(11, "MX", ["Crunchyroll"], "tmdb");
  });

  it("stores an empty list rather than the 'Pirata' label", async () => {
    // "Pirata" is how the UI presents an absence; the stored fact is simply
    // that nothing was found. Persisting the label would leak presentation
    // into the data and make it indistinguishable from a real provider name.
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });
    mockTryConsume.mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ shows: [] }),
    });

    await resolveProvidersForAnimeDetailed(12, "MX", 555, "One Piece", 2024);

    expect(mockStore).toHaveBeenCalledWith(12, "MX", [], "none");
  });

  it("serves a stored verdict without touching any upstream", async () => {
    mockGetStored.mockResolvedValue({
      providers: ["Netflix"],
      source: "sa",
      resolvedAt: new Date().toISOString(),
    });

    const result = await resolveProvidersForAnimeDetailed(
      13,
      "MX",
      555,
      "One Piece",
      2024,
    );

    expect(result.providers).toEqual(["Netflix"]);
    expect(mockTmdbDetailed).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("presents a stored empty result as 'Pirata'", async () => {
    mockGetStored.mockResolvedValue({
      providers: [],
      source: "none",
      resolvedAt: new Date().toISOString(),
    });

    const result = await resolveProvidersForAnimeDetailed(14, "MX", 555, "X");

    expect(result.providers).toEqual(["Pirata"]);
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

describe("resolveProvidersForAnimeDetailed — skipPaidFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
    global.fetch = vi.fn();
    mockGetStored.mockResolvedValue(null);
  });

  it("never calls the paid API when the caller opts out", async () => {
    // The batch endpoint resolves up to 50 ids in one request; letting each
    // miss reach RapidAPI would spend a monthly quota on a single page load.
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });
    mockTryConsume.mockReturnValue(true);

    await resolveProvidersForAnimeDetailed(
      20,
      "MX",
      555,
      "One Piece",
      2024,
      "tv",
      true,
      { skipPaidFallback: true },
    );

    expect(global.fetch).not.toHaveBeenCalled();
    // Not even the budget is touched — the call is skipped, not merely denied.
    expect(mockTryConsume).not.toHaveBeenCalled();
  });

  it("leaves the empty verdict unverified instead of banking it", async () => {
    // This is the whole point of the flag. Skipping a source that should have
    // run means the resulting "nothing found" is a guess, so it must expire
    // quickly and must never reach the durable store — otherwise the batch
    // would poison the cache exactly the way the exhausted budget once did.
    mockTmdbDetailed.mockResolvedValue({ ok: true, providers: [] });

    const result = await resolveProvidersForAnimeDetailed(
      21,
      "MX",
      555,
      "One Piece",
      2024,
      "tv",
      true,
      { skipPaidFallback: true },
    );

    expect(result.providers).toEqual(["Pirata"]);
    expect(result.saOk).toBe(false);
    expect(cachedTtlFor(21)).toBeLessThan(SEVEN_DAYS);
    expect(mockStore).not.toHaveBeenCalled();
  });

  it("still persists a provider TMDB actually confirmed", async () => {
    // Opting out of the paid fallback must not weaken a positive result:
    // TMDB answering with a real provider is conclusive on its own.
    mockTmdbDetailed.mockResolvedValue({
      ok: true,
      providers: [{ id: 1, name: "Netflix" }],
    });

    const result = await resolveProvidersForAnimeDetailed(
      22,
      "MX",
      555,
      "One Piece",
      2024,
      "tv",
      true,
      { skipPaidFallback: true },
    );

    expect(result.providers).toEqual(["Netflix"]);
    expect(cachedTtlFor(22)).toBe(SEVEN_DAYS);
    expect(mockStore).toHaveBeenCalledWith(22, "MX", ["Netflix"], "tmdb");
  });

  it("serves a stored verdict, which is how the batch gets real badges", async () => {
    // The batch relies on this path: anything another surface already resolved
    // comes back for free, so collection cards stop claiming "Pirata".
    mockGetStored.mockResolvedValue({
      providers: ["Crunchyroll"],
      source: "tmdb",
      resolvedAt: new Date().toISOString(),
    });

    const result = await resolveProvidersForAnimeDetailed(
      23,
      "MX",
      555,
      "One Piece",
      2024,
      "tv",
      true,
      { skipPaidFallback: true },
    );

    expect(result.providers).toEqual(["Crunchyroll"]);
    expect(mockTmdbDetailed).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
