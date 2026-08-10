import { describe, it, expect } from "vitest";
import {
  cdmxDateISO,
  cdmxDayIndex,
  cdmxDayName,
  cdmxDayStart,
  cdmxRange,
  cdmxRangeBounds,
  cdmxTodayIndex,
} from "../utils/cdmxCalendar.js";

/** 2026-08-10 09:00 UTC = 03:00 CDMX, a Monday. */
const MONDAY_EARLY_UTC = Date.UTC(2026, 7, 10, 9, 0, 0);

describe("cdmxDayIndex", () => {
  it("keeps late-evening CDMX on the same calendar day", () => {
    // 23:30 CDMX on Aug 10 is 05:30 UTC on Aug 11. Bucketing on the UTC date
    // would file this episode under Tuesday, which is the whole reason the
    // offset exists rather than using the raw timestamp.
    const lateNight = Math.floor(Date.UTC(2026, 7, 11, 5, 30, 0) / 1000);
    const midMorning = Math.floor(Date.UTC(2026, 7, 10, 16, 0, 0) / 1000);
    expect(cdmxDayIndex(lateNight)).toBe(cdmxDayIndex(midMorning));
  });

  it("rolls over at 06:00 UTC, which is midnight CDMX", () => {
    const justBefore = Math.floor(Date.UTC(2026, 7, 11, 5, 59, 59) / 1000);
    const justAfter = Math.floor(Date.UTC(2026, 7, 11, 6, 0, 0) / 1000);
    expect(cdmxDayIndex(justAfter) - cdmxDayIndex(justBefore)).toBe(1);
  });

  it("round-trips with cdmxDayStart", () => {
    const index = cdmxTodayIndex(MONDAY_EARLY_UTC);
    expect(cdmxDayIndex(cdmxDayStart(index))).toBe(index);
  });
});

describe("cdmxDayName", () => {
  it("names the weekday of a known date", () => {
    expect(cdmxDayName(cdmxTodayIndex(MONDAY_EARLY_UTC))).toBe("monday");
  });

  it("advances through the week and wraps", () => {
    const monday = cdmxTodayIndex(MONDAY_EARLY_UTC);
    expect(cdmxDayName(monday + 5)).toBe("saturday");
    expect(cdmxDayName(monday + 6)).toBe("sunday");
    expect(cdmxDayName(monday + 7)).toBe("monday");
  });
});

describe("cdmxDateISO", () => {
  it("prints the CDMX date, not the UTC one", () => {
    // The instant is already Aug 11 in UTC but still Aug 10 in CDMX.
    const lateNight = Math.floor(Date.UTC(2026, 7, 11, 5, 30, 0) / 1000);
    expect(cdmxDateISO(cdmxDayIndex(lateNight))).toBe("2026-08-10");
  });
});

describe("cdmxRange", () => {
  it("returns a single day for days=1", () => {
    const { firstDay, lastDay } = cdmxRange(1, MONDAY_EARLY_UTC);
    expect(firstDay).toBe(lastDay);
    expect(cdmxDayName(firstDay)).toBe("monday");
  });

  it("returns the calendar week Sunday through Saturday, not the next 7 days", () => {
    // Anchoring the week to "today" would put Monday in column 0 today and
    // column 6 next Tuesday, so a grid meant to be read at a glance would
    // reshuffle every morning.
    const { firstDay, lastDay } = cdmxRange(7, MONDAY_EARLY_UTC);
    expect(cdmxDayName(firstDay)).toBe("sunday");
    expect(cdmxDayName(lastDay)).toBe("saturday");
    expect(lastDay - firstDay).toBe(6);
  });

  it("includes the days of the week that already passed", () => {
    const today = cdmxTodayIndex(MONDAY_EARLY_UTC);
    const { firstDay } = cdmxRange(7, MONDAY_EARLY_UTC);
    expect(firstDay).toBeLessThan(today);
  });

  it("puts a Sunday at the start of its own week", () => {
    const sunday = Date.UTC(2026, 7, 9, 20, 0, 0);
    const { firstDay } = cdmxRange(7, sunday);
    expect(firstDay).toBe(cdmxTodayIndex(sunday));
  });
});

describe("cdmxRangeBounds", () => {
  it("covers the range end to end without overlapping the next day", () => {
    const { firstDay, lastDay } = cdmxRange(7, MONDAY_EARLY_UTC);
    const { greater, lesser } = cdmxRangeBounds(firstDay, lastDay);

    expect(cdmxDayIndex(greater)).toBe(firstDay);
    expect(cdmxDayIndex(lesser)).toBe(lastDay);
    expect(cdmxDayIndex(lesser + 1)).toBe(lastDay + 1);
  });

  it("spans exactly seven days of seconds", () => {
    const { firstDay, lastDay } = cdmxRange(7, MONDAY_EARLY_UTC);
    const { greater, lesser } = cdmxRangeBounds(firstDay, lastDay);
    expect(lesser - greater).toBe(7 * 86400 - 1);
  });
});
