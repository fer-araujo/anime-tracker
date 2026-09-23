import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.ANIMESCHEDULE_TOKEN = "test-token";

const store = new Map<string, unknown>();
vi.mock("../utils/cache.js", () => ({
  hybridCache: {
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => {
      store.set(k, v);
    },
  },
}));

const { asAnimeForRoutes } = await import("../services/animeSchedule.service.js");

const record = (route: string, anilistId: number | null) => ({
  route,
  title: route,
  websites: anilistId ? { aniList: `anilist.co/anime/${anilistId}/x` } : null,
});

/**
 * The ongoing index holds one airing series; a finished one answers only on its
 * own `/anime/{route}` endpoint, exactly as AnimeSchedule behaved once Youjo
 * Senki II's last episode aired.
 */
function stubApi() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("airing-statuses=ongoing")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ totalAmount: 1, anime: [record("frieren", 154587)] }),
      };
    }
    if (url.endsWith("/anime/youjo-senki-ii")) {
      return { ok: true, status: 200, json: async () => record("youjo-senki-ii", 135865) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const lookups = (mock: ReturnType<typeof stubApi>) =>
  mock.mock.calls.filter(([url]) => !String(url).includes("airing-statuses"));

beforeEach(() => {
  store.clear();
  vi.restoreAllMocks();
});

describe("asAnimeForRoutes", () => {
  it("resolves a series the ongoing index dropped after its finale", async () => {
    stubApi();

    const found = await asAnimeForRoutes(["frieren", "youjo-senki-ii"]);

    expect(found.get("frieren")?.websites?.aniList).toContain("154587");
    expect(found.get("youjo-senki-ii")?.websites?.aniList).toContain("135865");
  });

  it("does not ask again for a route it already resolved", async () => {
    // Polled on every page load: once is the whole cost.
    const mock = stubApi();

    await asAnimeForRoutes(["youjo-senki-ii"]);
    await asAnimeForRoutes(["youjo-senki-ii"]);

    expect(lookups(mock)).toHaveLength(1);
  });

  it("remembers a route the API does not know, so it is not retried every poll", async () => {
    const mock = stubApi();

    await asAnimeForRoutes(["gone"]);
    await asAnimeForRoutes(["gone"]);

    expect(lookups(mock)).toHaveLength(1);
  });

  it("looks nothing up for routes the index already has", async () => {
    const mock = stubApi();

    await asAnimeForRoutes(["frieren"]);

    expect(lookups(mock)).toHaveLength(0);
  });
});
