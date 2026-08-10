import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { DAY_NAMES } from "../utils/cdmxCalendar.js";

describe("GET /v1/schedule?type=airing", () => {
  it("keeps the flat array shape for days=1", async () => {
    // The home page's "airing today" shelf consumes this and predates the
    // weekly grid; widening the endpoint must not rewrite its contract.
    const res = await request(app).get("/v1/schedule?type=airing&days=1");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("defaults to a single day when days is absent or nonsense", async () => {
    for (const qs of ["", "&days=abc", "&days=0", "&days=3"]) {
      const res = await request(app).get(`/v1/schedule?type=airing${qs}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta?.days).toBeUndefined();
    }
  });

  it("returns seven named day groups for days=7", async () => {
    const res = await request(app).get("/v1/schedule?type=airing&days=7");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data.map((d: { day: string }) => d.day)).toEqual([
      ...DAY_NAMES,
    ]);
    expect(res.body.meta.days).toBe(7);
  });

  it("returns every day of the week, including the empty ones", async () => {
    // An absent Thursday and an empty Thursday look identical to a client that
    // renders columns from the response, so the grid would silently reflow.
    const res = await request(app).get("/v1/schedule?type=airing&days=7");
    for (const group of res.body.data) {
      expect(group).toHaveProperty("items");
      expect(Array.isArray(group.items)).toBe(true);
      expect(group.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("carries the specific broadcast, not just the next one", async () => {
    // Previously the controller threw away `airingAt`/`episode` from the
    // schedule wrapper and kept only the media, so a row about an episode that
    // already aired could only report the *next* episode's time.
    const res = await request(app).get("/v1/schedule?type=airing&days=7");
    const withItems = res.body.data.filter(
      (d: { items: unknown[] }) => d.items.length > 0,
    );

    expect(withItems.length).toBeGreaterThan(0);
    for (const group of withItems) {
      for (const item of group.items) {
        expect(item.airing.airingAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(typeof item.airing.episode).toBe("number");
      }
    }
  });

  it("keeps both airings of a series that broadcasts twice in one week", async () => {
    // formatAnimeList deduplicates by AniList id, which is correct for a
    // catalogue and wrong for a broadcast log; the controller enriches unique
    // media and then pairs each schedule entry back to its record.
    const res = await request(app).get("/v1/schedule?type=airing&days=7");
    const all = res.body.data.flatMap(
      (d: { items: { id: { anilist: number } }[] }) => d.items,
    );
    const repeated = all.filter(
      (item: { id: { anilist: number } }) => item.id.anilist === 31,
    );

    expect(repeated).toHaveLength(2);
  });

  it("sorts each day chronologically", async () => {
    const res = await request(app).get("/v1/schedule?type=airing&days=7");
    for (const group of res.body.data) {
      const times = group.items.map(
        (i: { airing: { airingAt: string } }) => i.airing.airingAt,
      );
      expect(times).toEqual([...times].sort());
    }
  });
});

describe("GET /v1/schedule — coming vs tba", () => {
  it("keeps only titles with a real premiere date under coming", async () => {
    // A year with no month is not a date. Treating "2027" as a premiere is
    // what let undated announcements sit in a list called "coming soon".
    const res = await request(app).get("/v1/schedule?type=coming");

    expect(res.status).toBe(200);
    expect(res.body.data.map((a: { id: { anilist: number } }) => a.id.anilist)).toEqual([41]);
  });

  it("keeps only undated titles under tba", async () => {
    const res = await request(app).get("/v1/schedule?type=tba");

    expect(res.status).toBe(200);
    expect(res.body.data.map((a: { id: { anilist: number } }) => a.id.anilist)).toEqual([42]);
  });

  it("still rejects an unknown type", async () => {
    const res = await request(app).get("/v1/schedule?type=nope");
    expect(res.status).toBe(400);
  });
});

describe("GET /v1/season/archive", () => {
  it("returns four seasons per year with counts and cover art", async () => {
    const res = await request(app).get("/v1/season/archive?from=2025&years=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const [first] = res.body.data;
    expect(first.year).toBe(2025);
    expect(first.seasons.map((s: { season: string }) => s.season)).toEqual([
      "WINTER",
      "SPRING",
      "SUMMER",
      "FALL",
    ]);
    for (const season of first.seasons) {
      expect(typeof season.count).toBe("number");
      expect(season.cover).toContain("https://");
    }
  });

  it("counts down from the requested year", async () => {
    const res = await request(app).get("/v1/season/archive?from=2025&years=3");
    expect(res.body.data.map((y: { year: number }) => y.year)).toEqual([
      2025, 2024, 2023,
    ]);
  });

  it("caps the range so one request cannot drain the AniList rate limit", async () => {
    // Every year costs one call against a 25/minute budget shared by the whole
    // app, so an unbounded `years` would stall unrelated traffic behind it.
    const res = await request(app).get("/v1/season/archive?from=2025&years=99");
    expect(res.body.data.length).toBeLessThanOrEqual(12);
  });

  it("ignores a nonsensical from and falls back to the current year", async () => {
    const res = await request(app).get("/v1/season/archive?from=abc&years=1");
    expect(res.status).toBe(200);
    expect(res.body.data[0].year).toBeGreaterThan(2000);
  });

  it("does not let a future year through", async () => {
    const res = await request(app).get("/v1/season/archive?from=9999&years=1");
    expect(res.body.data[0].year).toBeLessThanOrEqual(
      new Date().getFullYear(),
    );
  });
});
