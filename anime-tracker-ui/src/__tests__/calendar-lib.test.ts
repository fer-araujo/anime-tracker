import { describe, it, expect } from "vitest";
import {
  cdmxDayOfMonth,
  formatDayLabel,
  formatWeekRange,
  isWeekEmpty,
  normalizeCalendarWeek,
  pickInitialDay,
  resolveCalendarView,
  shiftCalendarWeek,
} from "@/lib/calendar";
import type { CalendarDay } from "@/types/calendar";

const day = (date: string, items = 0): CalendarDay => ({
  date,
  status: "ok",
  items: Array.from({ length: items }) as CalendarDay["items"],
});

describe("formatDayLabel", () => {
  it("keeps the CDMX date, without sliding a day in another timezone", () => {
    // Read as local time, midnight UTC is still the 21st in Mexico.
    expect(formatDayLabel("2026-10-22")).toEqual({ weekday: "Jue", day: "22" });
  });
});

describe("formatWeekRange", () => {
  it("names one month when the week fits inside it", () => {
    expect(formatWeekRange("2026-10-18", "2026-10-24")).toBe(
      "Del 18 al 24 de octubre",
    );
  });

  it("names both when the week crosses into the next", () => {
    expect(formatWeekRange("2026-10-25", "2026-11-01")).toBe(
      "Del 25 de octubre al 1 de noviembre",
    );
  });
});

describe("cdmxDayOfMonth", () => {
  it("uses the CDMX date, not the UTC one", () => {
    // 02:00 UTC on the 23rd is still the evening of the 22nd in Mexico.
    expect(cdmxDayOfMonth(Date.parse("2026-10-23T02:00:00Z"))).toBe("22");
  });

  it("turns over at CDMX midnight", () => {
    expect(cdmxDayOfMonth(Date.parse("2026-10-23T05:30:00Z"))).toBe("22");
    expect(cdmxDayOfMonth(Date.parse("2026-10-23T06:30:00Z"))).toBe("23");
  });
});

describe("normalizeCalendarWeek", () => {
  it("accepts the three weeks the API answers", () => {
    expect(normalizeCalendarWeek("-1")).toBe(-1);
    expect(normalizeCalendarWeek("1")).toBe(1);
    expect(normalizeCalendarWeek("0")).toBe(0);
  });

  it("falls back to the current week for anything else", () => {
    expect(normalizeCalendarWeek("7")).toBe(0);
    expect(normalizeCalendarWeek(null)).toBe(0);
  });
});

describe("pickInitialDay", () => {
  const days = [day("2026-10-18"), day("2026-10-19", 2), day("2026-10-20", 1)];

  it("opens on today when today is in the week", () => {
    expect(pickInitialDay(days, "2026-10-20")).toBe("2026-10-20");
  });

  it("otherwise opens on the first day with something on it", () => {
    expect(pickInitialDay(days, null)).toBe("2026-10-19");
  });

  it("falls back to the first day of an empty week", () => {
    expect(pickInitialDay([day("2026-10-18")], null)).toBe("2026-10-18");
  });
});

describe("shiftCalendarWeek", () => {
  it("moves one week and stops at the edges the API answers", () => {
    expect(shiftCalendarWeek(0, 1)).toBe(1);
    expect(shiftCalendarWeek(1, 1)).toBe(1);
    expect(shiftCalendarWeek(-1, -1)).toBe(-1);
  });
});

describe("isWeekEmpty", () => {
  it("is true only when every day answered with nothing", () => {
    expect(isWeekEmpty([day("2026-10-18"), day("2026-10-19")])).toBe(true);
    expect(isWeekEmpty([day("2026-10-18"), day("2026-10-19", 1)])).toBe(false);
  });

  it("does not claim an empty week when a day failed to load", () => {
    const failed: CalendarDay = { ...day("2026-10-18"), status: "unavailable" };
    expect(isWeekEmpty([failed, day("2026-10-19")])).toBe(false);
  });
});

describe("resolveCalendarView", () => {
  const base = {
    loading: false,
    hasTrackedAnime: true,
    failed: false,
    hasCalendar: true,
  };

  it("shows the week once it has one", () => {
    expect(resolveCalendarView(base)).toBe("ready");
  });

  it("puts loading ahead of everything", () => {
    expect(resolveCalendarView({ ...base, loading: true, failed: true })).toBe(
      "loading",
    );
  });

  it("says nothing is tracked before reporting a failure", () => {
    expect(
      resolveCalendarView({ ...base, hasTrackedAnime: false, failed: true }),
    ).toBe("untracked");
  });

  it("treats a missing answer as an error", () => {
    expect(resolveCalendarView({ ...base, hasCalendar: false })).toBe("error");
  });
});
