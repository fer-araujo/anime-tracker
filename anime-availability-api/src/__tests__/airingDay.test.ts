import { describe, it, expect } from "vitest";
import { airingsOnDay, broadcastsOnDay } from "../utils/airingDay.js";
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

/**
 * MAL states a JST weekday plus a wall-clock time, never a timestamp. A CDMX day
 * spans two JST days, so the same weekday name lands on either side of the
 * boundary depending on the hour — which is the whole reason this is arithmetic
 * and not a string comparison.
 *
 * 2026-09-08 CDMX runs 06:00Z that day to 05:59Z the next: JST Tuesday 15:00
 * through JST Wednesday 14:59.
 */
describe("broadcastsOnDay", () => {
  const TUESDAY = cdmxDayIndex(
    Math.floor(Date.parse("2026-09-08T12:00:00Z") / 1000),
  );

  const slot = (day: string, time: string) => ({
    broadcast: { day_of_the_week: day, start_time: time },
  });

  it("places a late-night JST Tuesday slot on the CDMX Tuesday", () => {
    // JST Tuesday 23:15 is 14:15 UTC, inside the CDMX Tuesday.
    const hits = broadcastsOnDay([slot("tuesday", "23:15")], TUESDAY);

    expect(hits).toHaveLength(1);
    expect(new Date(hits[0].airingAt * 1000).toISOString()).toBe(
      "2026-09-08T14:15:00.000Z",
    );
  });

  it("excludes a morning JST Tuesday slot, which belongs to the day before", () => {
    // JST Tuesday 10:00 is 01:00 UTC — still the CDMX Monday evening.
    expect(broadcastsOnDay([slot("tuesday", "10:00")], TUESDAY)).toEqual([]);
  });

  it("includes a morning JST Wednesday slot, which is still the CDMX Tuesday", () => {
    const hits = broadcastsOnDay([slot("wednesday", "07:40")], TUESDAY);

    expect(hits).toHaveLength(1);
    expect(new Date(hits[0].airingAt * 1000).toISOString()).toBe(
      "2026-09-08T22:40:00.000Z",
    );
  });

  it("skips an entry with no broadcast slot at all", () => {
    expect(broadcastsOnDay([{ broadcast: null }, {}], TUESDAY)).toEqual([]);
  });
});
