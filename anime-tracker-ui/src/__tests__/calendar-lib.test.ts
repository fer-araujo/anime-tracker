import { describe, it, expect } from "vitest";
import {
  calendarHourRange,
  calendarHref,
  calendarStatusChips,
  cdmxMinuteOfDay,
  filterCalendarByStatus,
  blockMinutes,
  layoutDayEntries,
  normalizeStatusFilter,
  cdmxDayOfMonth,
  formatDayLabel,
  formatWeekRange,
  isWeekEmpty,
  normalizeCalendarWeek,
  pickInitialDay,
  resolveCalendarView,
  shiftCalendarWeek,
} from "@/lib/calendar";
import type { StatusByAnimeId, TrackingStatus } from "@/types/anime";
import type { CalendarDay, CalendarEntry } from "@/types/calendar";

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

// CDMX is UTC-6, so 14:00Z is 08:00 there.
const at = (animeId: number, cdmx: string): CalendarEntry => {
  const [h, m] = cdmx.split(":").map(Number);
  const utc = new Date(Date.UTC(2026, 9, 22, h + 6, m));
  return {
    animeId,
    title: `#${animeId}`,
    poster: null,
    airingAt: utc.toISOString(),
    range: { from: 1, to: 1, total: 12 },
  };
};
const okDay = (date: string, items: CalendarEntry[]): CalendarDay => ({
  date,
  status: "ok",
  items,
});

describe("cdmxMinuteOfDay", () => {
  it("counts minutes from CDMX midnight", () => {
    expect(cdmxMinuteOfDay("2026-10-22T14:56:00Z")).toBe(8 * 60 + 56);
  });

  it("restarts at CDMX midnight, not UTC midnight", () => {
    expect(cdmxMinuteOfDay("2026-10-23T06:30:00Z")).toBe(30);
    expect(cdmxMinuteOfDay("2026-10-23T05:30:00Z")).toBe(23 * 60 + 30);
  });
});

describe("calendarHourRange", () => {
  it("spans the first broadcast to the end of the last block", () => {
    const days = [okDay("a", [at(1, "01:30"), at(2, "10:28")])];
    expect(calendarHourRange(days)).toEqual({ startHour: 1, endHour: 12 });
  });

  it("never shrinks below six hours", () => {
    const days = [okDay("a", [at(1, "08:56"), at(2, "10:28")])];
    expect(calendarHourRange(days)).toEqual({ startHour: 8, endHour: 14 });
  });

  it("grows upward when the day would run past midnight", () => {
    const days = [okDay("a", [at(1, "21:00")])];
    expect(calendarHourRange(days)).toEqual({ startHour: 18, endHour: 24 });
  });

  it("keeps a late block inside the grid instead of past midnight", () => {
    const days = [okDay("a", [at(1, "23:30")])];
    const { endHour } = calendarHourRange(days);
    expect(endHour).toBe(24);
    expect(blockMinutes(23 * 60 + 30, endHour)).toBe(30);
    expect(blockMinutes(20 * 60, endHour)).toBe(60);
  });

  it("covers every day of the week, not only the first", () => {
    const days = [okDay("a", [at(1, "08:00")]), okDay("b", [at(2, "15:00")])];
    expect(calendarHourRange(days)).toEqual({ startHour: 8, endHour: 16 });
  });

  it("has a default for a week with nothing on it", () => {
    expect(calendarHourRange([okDay("a", [])])).toEqual({
      startHour: 8,
      endHour: 14,
    });
  });
});

describe("layoutDayEntries", () => {
  const lanes = (items: CalendarEntry[]) =>
    layoutDayEntries(items).map((p) => [p.entry.animeId, p.lane, p.lanes]);

  it("gives entries an hour apart the full width", () => {
    expect(lanes([at(1, "08:00"), at(2, "09:00")])).toEqual([
      [1, 0, 1],
      [2, 0, 1],
    ]);
  });

  it("puts entries at the same time side by side", () => {
    expect(lanes([at(1, "08:00"), at(2, "08:00")])).toEqual([
      [1, 0, 2],
      [2, 1, 2],
    ]);
  });

  it("reuses a lane once it is free, keeping one width for the group", () => {
    // 08:00 and 08:30 overlap; 09:15 overlaps 08:30 only, so it takes lane 0.
    expect(lanes([at(1, "08:00"), at(2, "08:30"), at(3, "09:15")])).toEqual([
      [1, 0, 2],
      [2, 1, 2],
      [3, 0, 2],
    ]);
  });

  it("counts lanes per group, not per day", () => {
    // Two at 08:00 need two lanes; the 11:00 one overlaps nothing.
    expect(lanes([at(1, "08:00"), at(2, "08:00"), at(3, "11:00")])).toEqual([
      [1, 0, 2],
      [2, 1, 2],
      [3, 0, 1],
    ]);
  });

  it("opens a lane per entry when they all share one time", () => {
    expect(
      lanes([at(1, "08:00"), at(2, "08:00"), at(3, "08:00")]).map(
        ([, lane, count]) => [lane, count],
      ),
    ).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
  });

  it("has nothing to place on an empty day", () => {
    expect(layoutDayEntries([])).toEqual([]);
  });

  it("orders by time whatever order the entries come in", () => {
    expect(lanes([at(2, "10:00"), at(1, "08:00")]).map(([id]) => id)).toEqual(
      [1, 2],
    );
  });
});

describe("status filter", () => {
  const statuses: StatusByAnimeId = new Map<number, TrackingStatus>([
    [1, "watching"],
    [2, "dropped"],
    [3, "watching"],
  ]);
  const days = [
    okDay("a", [at(1, "08:00"), at(2, "09:00")]),
    okDay("b", [at(3, "08:00")]),
  ];

  it("offers all, then each status present, in the bar's order with counts", () => {
    expect(
      calendarStatusChips(days, statuses).map((c) => [c.key, c.count]),
    ).toEqual([
      ["all", 3],
      ["watching", 2],
      ["dropped", 1],
    ]);
  });

  it("keeps only the chosen status, day by day", () => {
    const filtered = filterCalendarByStatus(days, statuses, "dropped");
    expect(filtered.map((d) => d.items.map((e) => e.animeId))).toEqual([
      [2],
      [],
    ]);
  });

  it("reads only known statuses from the URL", () => {
    expect(normalizeStatusFilter("on_hold")).toBe("on_hold");
    expect(normalizeStatusFilter("whatever")).toBe("all");
    expect(normalizeStatusFilter(null)).toBe("all");
  });

  it("leaves defaults out of the address", () => {
    expect(calendarHref(0, "all")).toBe("/calendar");
    expect(calendarHref(-1, "watching")).toBe(
      "/calendar?week=-1&status=watching",
    );
  });
});
