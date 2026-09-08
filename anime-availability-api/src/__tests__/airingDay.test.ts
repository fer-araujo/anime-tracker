import { describe, it, expect } from "vitest";
import { airingsOnDay } from "../utils/airingDay.js";
import { cdmxDayStart, cdmxDayIndex } from "../utils/cdmxCalendar.js";

/**
 * The shelf said "Emisión de Hoy" and showed six titles on a day with far more,
 * because everything already broadcast that morning was missing. These pin the
 * reconstruction that recovers it — and the limits that keep it from inventing
 * broadcasts.
 */
const DAY = cdmxDayIndex(Math.floor(Date.parse("2026-09-07T12:00:00Z") / 1000));
const WEEK = 7 * 86400;

const at = (offsetSeconds: number) =>
  new Date((cdmxDayStart(DAY) + offsetSeconds) * 1000).toISOString();

describe("airingsOnDay", () => {
  it("keeps an episode scheduled later the same day", () => {
    const hits = airingsOnDay(
      [{ next_episode: 4, next_episode_at: at(20 * 3600) }],
      DAY,
    );

    expect(hits).toHaveLength(1);
    expect(hits[0].episode).toBe(4);
  });

  it("recovers the episode that already aired this morning", () => {
    // Shikimori reports next week's broadcast; the one this morning is only
    // knowable from the cadence, and it is the bulk of what the shelf was
    // missing.
    const hits = airingsOnDay(
      [{ next_episode: 5, next_episode_at: at(9 * 3600 + WEEK) }],
      DAY,
    );

    expect(hits).toHaveLength(1);
    expect(hits[0].episode).toBe(4);
    expect(hits[0].airingAt).toBe(cdmxDayStart(DAY) + 9 * 3600);
  });

  it("ignores a series whose next episode is more than a week out", () => {
    // On hiatus or not yet premiered. Stepping back through it would place a
    // broadcast on a day nothing aired.
    const hits = airingsOnDay(
      [{ next_episode: 2, next_episode_at: at(9 * 3600 + 4 * WEEK) }],
      DAY,
    );

    expect(hits).toEqual([]);
  });

  it("never invents an episode 0", () => {
    // A premiere next week has no previous broadcast to recover.
    const hits = airingsOnDay(
      [{ next_episode: 1, next_episode_at: at(9 * 3600 + WEEK) }],
      DAY,
    );

    expect(hits).toEqual([]);
  });

  it("orders the day chronologically", () => {
    const hits = airingsOnDay(
      [
        { next_episode: 3, next_episode_at: at(22 * 3600) },
        { next_episode: 8, next_episode_at: at(2 * 3600 + WEEK) },
        { next_episode: 2, next_episode_at: at(11 * 3600) },
      ],
      DAY,
    );

    expect(hits.map((h) => h.airingAt)).toEqual([
      cdmxDayStart(DAY) + 2 * 3600,
      cdmxDayStart(DAY) + 11 * 3600,
      cdmxDayStart(DAY) + 22 * 3600,
    ]);
  });

  it("drops an unparseable date instead of throwing", () => {
    expect(airingsOnDay([{ next_episode: 3, next_episode_at: "" }], DAY)).toEqual(
      [],
    );
  });
});
