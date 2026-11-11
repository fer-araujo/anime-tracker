import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";

const mockTimetable = vi.fn();
const mockRoutes = vi.fn();
vi.mock("../services/animeSchedule.service.js", async (importOriginal) => ({
  // The pure readers stay real: they decide which series and episodes a row is.
  ...(await importOriginal<object>()),
  asFetchTimetableRange: (...a: unknown[]) => mockTimetable(...a),
  asAnimeForRoutes: () => mockRoutes(),
}));

vi.mock("../utils/formatAnimeList.js", () => ({
  getCachedAnimeRecords: async () => new Map(),
}));

const anilistFetch = vi.fn();
vi.mock("../utils/anilistRateLimit.js", () => ({ anilistFetch }));
const tryConsumeRapidApiCall = vi.fn();
vi.mock("../utils/quotaGuard.js", () => ({ tryConsumeRapidApiCall }));

const { default: routes } = await import("../routes/calendar.routes.js");
const app = express().use(express.json()).use("/", routes);

/** Thursday 22 October 2026, 10:00 CDMX: the week runs Sunday 18 to Saturday 24. */
const NOW = Date.parse("2026-10-22T16:00:00Z");

const row = (route: string, episodeDate: string, episodeNumber = 5, episodes = 12) => ({
  route,
  title: route,
  episodeDate,
  episodeNumber,
  episodes,
});

const records = (pairs: [string, number, string?][]) =>
  new Map(
    pairs.map(([route, id, english]) => [
      route,
      {
        route,
        title: route,
        names: { english: english ?? route },
        websites: { aniList: `anilist.co/anime/${id}/x` },
      },
    ]),
  );

const post = (body: unknown) => request(app).post("/").send(body);
const dayOf = (body: { data: { date: string; items: unknown[] }[] }, date: string) =>
  body.data.find((d) => d.date === date)!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe("POST /calendar", () => {
  it("returns seven CDMX days and marks today", async () => {
    mockTimetable.mockResolvedValue([row("a", "2026-10-22T20:00:00Z")]);
    mockRoutes.mockResolvedValue(records([["a", 1]]));

    const res = await post({ animeIds: [1] });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data[0]).toMatchObject({ date: "2026-10-18", day: "sunday" });
    expect(res.body.meta).toMatchObject({
      firstDate: "2026-10-18",
      lastDate: "2026-10-24",
      today: "2026-10-22",
    });
  });

  it("only lists what the user has a status on", async () => {
    mockTimetable.mockResolvedValue([
      row("mine", "2026-10-22T20:00:00Z"),
      row("other", "2026-10-22T21:00:00Z"),
    ]);
    mockRoutes.mockResolvedValue(records([["mine", 1], ["other", 2]]));

    const res = await post({ animeIds: [1] });

    expect(dayOf(res.body, "2026-10-22").items).toEqual([
      expect.objectContaining({ animeId: 1 }),
    ]);
  });

  it("files a late broadcast under its CDMX day", async () => {
    // 02:00 UTC on Friday is still Thursday evening in CDMX.
    mockTimetable.mockResolvedValue([row("a", "2026-10-23T02:00:00Z")]);
    mockRoutes.mockResolvedValue(records([["a", 1]]));

    const res = await post({ animeIds: [1] });

    expect(dayOf(res.body, "2026-10-22").items).toHaveLength(1);
    expect(dayOf(res.body, "2026-10-23").items).toHaveLength(0);
  });

  it("collapses a same-day drop into one entry with its range", async () => {
    mockTimetable.mockResolvedValue([
      row("a", "2026-10-22T20:00:00Z", 1),
      row("a", "2026-10-22T20:00:00Z", 12),
    ]);
    mockRoutes.mockResolvedValue(records([["a", 1]]));

    const res = await post({ animeIds: [1] });

    const { items } = dayOf(res.body, "2026-10-22");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ range: { from: 1, to: 12, total: 12 } });
  });

  it("orders a day by time, then by the title shown", async () => {
    mockTimetable.mockResolvedValue([
      row("zeta", "2026-10-22T20:00:00Z"),
      row("alfa", "2026-10-22T20:00:00Z"),
      row("early", "2026-10-22T18:00:00Z"),
    ]);
    mockRoutes.mockResolvedValue(
      records([["zeta", 1, "Zeta"], ["alfa", 2, "Alfa"], ["early", 3, "Omega"]]),
    );

    const res = await post({ animeIds: [1, 2, 3] });

    const ids = dayOf(res.body, "2026-10-22").items.map(
      (i) => (i as { animeId: number }).animeId,
    );
    expect(ids).toEqual([3, 2, 1]);
  });

  it("marks a day the timetable has nothing for as unavailable, not empty", async () => {
    // A failed weekly fetch must not read as "nothing of yours airs".
    mockTimetable.mockResolvedValue([row("a", "2026-10-22T20:00:00Z")]);
    mockRoutes.mockResolvedValue(records([["a", 1]]));

    const res = await post({ animeIds: [1] });

    expect(dayOf(res.body, "2026-10-22")).toMatchObject({ status: "ok" });
    expect(dayOf(res.body, "2026-10-21")).toMatchObject({ status: "unavailable" });
  });

  it("keeps a day with broadcasts but none of the user's as ok", async () => {
    mockTimetable.mockResolvedValue([row("other", "2026-10-22T20:00:00Z")]);
    mockRoutes.mockResolvedValue(records([["other", 2]]));

    const res = await post({ animeIds: [1] });

    expect(dayOf(res.body, "2026-10-22")).toMatchObject({ status: "ok", items: [] });
  });

  it("answers 503 when the whole timetable failed", async () => {
    mockTimetable.mockResolvedValue([]);

    const res = await post({ animeIds: [1] });

    expect(res.status).toBe(503);
  });

  it("carries whether each broadcast is delayed, and to when", async () => {
    mockTimetable.mockResolvedValue([
      row("a", "2026-10-22T20:00:00Z"),
      {
        ...row("b", "2026-10-22T21:00:00Z"),
        airingStatus: "delayed-air",
        delayedUntil: "2026-10-29T21:00:00Z",
      },
    ]);
    mockRoutes.mockResolvedValue(records([["a", 1], ["b", 2]]));

    const res = await post({ animeIds: [1, 2] });

    expect(dayOf(res.body, "2026-10-22").items).toEqual([
      expect.objectContaining({ animeId: 1, delayed: false, delayedUntil: null }),
      expect.objectContaining({
        animeId: 2,
        delayed: true,
        delayedUntil: "2026-10-29T21:00:00.000Z",
      }),
    ]);
  });

  it("answers an empty id list with seven days and no upstream call", async () => {
    mockRoutes.mockResolvedValue(new Map());

    const res = await post({ animeIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data.every((d: { status: string }) => d.status === "ok")).toBe(true);
    expect(mockTimetable).not.toHaveBeenCalled();
  });

  it("moves by whole weeks and reports no today outside the current one", async () => {
    mockTimetable.mockResolvedValue([row("a", "2026-10-29T20:00:00Z")]);
    mockRoutes.mockResolvedValue(records([["a", 1]]));

    const res = await post({ animeIds: [1], week: 1 });

    expect(res.body.meta).toMatchObject({
      firstDate: "2026-10-25",
      lastDate: "2026-10-31",
      today: null,
      week: 1,
    });
  });

  it("rejects a week it cannot answer", async () => {
    expect((await post({ animeIds: [1], week: 2 })).status).toBe(400);
    expect((await post({ week: 0 })).status).toBe(400);
  });

  it("never touches AniList or the metered provider", async () => {
    mockTimetable.mockResolvedValue([row("a", "2026-10-22T20:00:00Z")]);
    mockRoutes.mockResolvedValue(records([["a", 1]]));

    await post({ animeIds: [1] });

    expect(anilistFetch).not.toHaveBeenCalled();
    expect(tryConsumeRapidApiCall).not.toHaveBeenCalled();
  });
});
