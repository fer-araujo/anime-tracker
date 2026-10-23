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

const {
  asAnimeForRoutes,
  asEpisodeRange,
  asFetchRecentTimetable,
  asFetchTimetableRange,
} = await import("../services/animeSchedule.service.js");

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

/**
 * Timetables keyed by ISO week, each holding one row per entry in `dates`. The
 * week the URL asks for decides which rows come back, as the real API does.
 */
function stubTimetables(byWeek: Record<string, string[]>) {
  const fetchMock = vi.fn(async (url: string) => {
    const m = /week=(\d+)&year=(\d+)/.exec(url);
    const dates = m ? byWeek[`${m[2]}-${m[1]}`] ?? [] : [];
    return {
      ok: true,
      status: 200,
      json: async () =>
        dates.map((episodeDate, i) => ({
          title: `t${i}`,
          route: `r-${episodeDate}`,
          episodeDate,
          episodeNumber: 1,
        })),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const weeksAsked = (mock: ReturnType<typeof stubTimetables>) =>
  mock.mock.calls.map(([url]) => /week=(\d+)&year=(\d+)/.exec(String(url))?.slice(1).reverse().join("-"));

describe("asFetchRecentTimetable", () => {
  it("reaches a CDMX Sunday evening that is already next week in UTC", async () => {
    // Sunday 25 October 2026, 10:00 CDMX. A 21:30 CDMX broadcast that night
    // is Monday 03:30 UTC — week 44, which "the week of now" never read.
    const mock = stubTimetables({
      "2026-43": ["2026-10-25T14:00:00Z"],
      "2026-44": ["2026-10-26T03:30:00Z", "2026-10-26T07:00:00Z"],
    });

    const rows = await asFetchRecentTimetable(Date.parse("2026-10-25T16:00:00Z"));

    expect(weeksAsked(mock)).toEqual(["2026-42", "2026-43", "2026-44"]);
    // Tonight's broadcast is in; Monday 01:00 CDMX is tomorrow and is not.
    expect(rows.map((r) => r.episodeDate)).toEqual([
      "2026-10-25T14:00:00Z",
      "2026-10-26T03:30:00Z",
    ]);
  });

  it("does not read the next week on an ordinary day", async () => {
    const mock = stubTimetables({});

    await asFetchRecentTimetable(Date.parse("2026-10-22T16:00:00Z"));

    expect(weeksAsked(mock)).toEqual(["2026-42", "2026-43"]);
  });
});

describe("asFetchTimetableRange", () => {
  it("spans the year boundary by instant, not by week number", async () => {
    const mock = stubTimetables({
      "2020-53": ["2020-12-31T12:00:00Z"],
      "2021-1": ["2021-01-04T12:00:00Z"],
    });

    const rows = await asFetchTimetableRange(
      Date.parse("2020-12-30T00:00:00Z"),
      Date.parse("2021-01-04T23:59:59Z"),
    );

    expect(weeksAsked(mock)).toEqual(["2020-53", "2021-1"]);
    expect(rows).toHaveLength(2);
  });
});

describe("asEpisodeRange", () => {
  const row = (episodeNumber: number, extra: object = {}) => ({
    title: "x",
    route: "x",
    episodeDate: "2026-10-20T07:00:00Z",
    episodeNumber,
    ...extra,
  });

  it("reads a season drop as the range it is", () => {
    // Cyberpunk: Edgerunners 2, exactly as the timetable sent it.
    expect(
      asEpisodeRange(row(10, { subtractedEpisodeNumber: 1, episodes: 10 })),
    ).toEqual({ from: 1, to: 10, total: 10 });
  });

  it("reads an ordinary broadcast as one episode", () => {
    expect(asEpisodeRange(row(5))).toEqual({ from: 5, to: 5, total: null });
  });

  it("ignores a start past the end rather than inventing a backwards range", () => {
    expect(asEpisodeRange(row(3, { subtractedEpisodeNumber: 7 }))).toEqual({
      from: 3,
      to: 3,
      total: null,
    });
  });
});
