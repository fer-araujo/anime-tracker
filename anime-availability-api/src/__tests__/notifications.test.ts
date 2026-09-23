import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

const mockTimetable = vi.fn();
const mockIndex = vi.fn();
vi.mock("../services/animeSchedule.service.js", () => ({
  asFetchRecentTimetable: () => mockTimetable(),
  asAnimeForRoutes: () => mockIndex(),
  AS_IMAGE_BASE: "https://img.test/",
}));

const mockRecords = vi.fn();
vi.mock("../utils/formatAnimeList.js", () => ({
  getCachedAnimeRecords: (...a: unknown[]) => mockRecords(...a),
}));

const { default: routes } = await import("../routes/notifications.routes.js");

const app = express().use(express.json()).use("/", routes);

/** A timetable row for `route`, aired `hoursAgo` before now. */
const row = (route: string, episodeNumber: number, hoursAgo: number) => ({
  route,
  episodeNumber,
  episodeDate: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
});

/** The index entry that maps a route to an AniList id. */
const indexed = (pairs: [string, number][]) =>
  new Map(
    pairs.map(([route, id]) => [
      route,
      { route, websites: { aniList: `anilist.co/anime/${id}/x` } },
    ]),
  );

const post = (body: unknown) => request(app).post("/").send(body);

const DAY_AGO = new Date(Date.now() - 24 * 3600_000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mockRecords.mockResolvedValue(new Map());
});

describe("POST /notifications", () => {
  it("reports an episode of a watched anime released since the last visit", async () => {
    mockTimetable.mockResolvedValue([row("frieren", 4, 3)]);
    mockIndex.mockResolvedValue(indexed([["frieren", 154587]]));

    const res = await post({ animeIds: [154587], since: DAY_AGO });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ animeId: 154587, episode: 4 });
  });

  it("never announces an episode that has not aired yet", async () => {
    // The timetable is a schedule, so it carries tonight's broadcast too.
    // Reporting it as released is a lie the user can check against the clock.
    mockTimetable.mockResolvedValue([row("frieren", 5, -6)]);
    mockIndex.mockResolvedValue(indexed([["frieren", 154587]]));

    const res = await post({ animeIds: [154587], since: DAY_AGO });

    expect(res.body.data).toEqual([]);
  });

  it("ignores anime the user is not watching", async () => {
    mockTimetable.mockResolvedValue([row("other", 9, 2)]);
    mockIndex.mockResolvedValue(indexed([["other", 999]]));

    const res = await post({ animeIds: [154587], since: DAY_AGO });

    expect(res.body.data).toEqual([]);
  });

  it("ignores an episode older than the last visit", async () => {
    mockTimetable.mockResolvedValue([row("frieren", 3, 30)]);
    mockIndex.mockResolvedValue(indexed([["frieren", 154587]]));

    const res = await post({ animeIds: [154587], since: DAY_AGO });

    expect(res.body.data).toEqual([]);
  });

  it("falls back to a week when the timestamp is unusable", async () => {
    // A missing prefs row sends a bad value rather than no request. The bell is
    // not worth failing a page over, so it degrades to the widest window it can
    // answer instead of erroring.
    mockTimetable.mockResolvedValue([row("frieren", 4, 48)]);
    mockIndex.mockResolvedValue(indexed([["frieren", 154587]]));

    const res = await post({ animeIds: [154587], since: "not-a-date" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("caps the lookback at a week however old the timestamp is", async () => {
    // Someone returning after a month gets the week the timetable can answer,
    // not a backlog they would dismiss unread.
    mockTimetable.mockResolvedValue([row("frieren", 1, 24 * 20)]);
    mockIndex.mockResolvedValue(indexed([["frieren", 154587]]));

    const res = await post({
      animeIds: [154587],
      since: new Date(Date.now() - 24 * 3600_000 * 60).toISOString(),
    });

    expect(res.body.data).toEqual([]);
  });

  it("orders the newest episode first", async () => {
    mockTimetable.mockResolvedValue([
      row("a", 1, 20),
      row("b", 2, 2),
      row("c", 3, 9),
    ]);
    mockIndex.mockResolvedValue(
      indexed([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]),
    );

    const res = await post({ animeIds: [1, 2, 3], since: DAY_AGO });

    expect(res.body.data.map((n: { animeId: number }) => n.animeId)).toEqual([
      2, 3, 1,
    ]);
  });

  it("names a series from its schedule record when no card is cached", async () => {
    // A finale resolved by route a moment ago has never been rendered as a
    // card, so the card cache has nothing. It still has to read as the series,
    // not as "#135865".
    mockTimetable.mockResolvedValue([row("youjo-senki-ii", 12, 5)]);
    mockIndex.mockResolvedValue(
      new Map([
        [
          "youjo-senki-ii",
          {
            route: "youjo-senki-ii",
            title: "Youjo Senki II",
            names: { english: "Saga of Tanya the Evil II" },
            imageVersionRoute: "anime/jpg/default/youjo.jpg",
            websites: { aniList: "anilist.co/anime/135865/x" },
          },
        ],
      ]),
    );

    const res = await post({ animeIds: [135865], since: DAY_AGO });

    expect(res.body.data[0]).toMatchObject({
      episode: 12,
      title: "Saga of Tanya the Evil II",
      poster: "https://img.test/anime/jpg/default/youjo.jpg",
    });
  });

  it("answers an empty watching list without touching the upstream", async () => {
    const res = await post({ animeIds: [], since: DAY_AGO });

    expect(res.body.data).toEqual([]);
    expect(mockTimetable).not.toHaveBeenCalled();
  });

  it("rejects a body that is not shaped like a request", async () => {
    expect((await post({ animeIds: "all", since: DAY_AGO })).status).toBe(400);
    expect((await post({ animeIds: [1] })).status).toBe(400);
  });
});
