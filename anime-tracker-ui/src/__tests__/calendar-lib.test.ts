import { describe, it, expect } from "vitest";
import {
  calendarHref,
  calendarStatusChips,
  calendarToday,
  calendarWeekStart,
  cdmxDateKey,
  filterCalendarByStatus,
  isAiringCalendar,
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
    hasCalendar: true,
  };

  it("shows the week once it has one", () => {
    expect(resolveCalendarView(base)).toBe("ready");
  });

  it("keeps a week in hand on screen while the next answer loads", () => {
    // A remembered week, or this one being asked again after midnight.
    expect(resolveCalendarView({ ...base, loading: true })).toBe("ready");
  });

  it("loads while there is no week to show", () => {
    expect(resolveCalendarView({ ...base, loading: true, hasCalendar: false })).toBe(
      "loading",
    );
  });

  it("says nothing is tracked before reporting a failure", () => {
    expect(
      resolveCalendarView({ ...base, hasTrackedAnime: false, hasCalendar: false }),
    ).toBe("untracked");
  });

  it("never shows a remembered week to someone who now tracks nothing", () => {
    expect(resolveCalendarView({ ...base, hasTrackedAnime: false })).toBe(
      "untracked",
    );
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

describe("cdmxDateKey", () => {
  it("names the CDMX date, which trails UTC by six hours", () => {
    // 05:59 UTC on the 23rd is still 23:59 on the 22nd in Mexico.
    expect(cdmxDateKey(Date.parse("2026-10-23T05:59:00Z"))).toBe("2026-10-22");
    expect(cdmxDateKey(Date.parse("2026-10-23T06:00:00Z"))).toBe("2026-10-23");
  });
});

describe("calendarWeekStart", () => {
  it("starts the week on Sunday, as the API's grid does", () => {
    expect(calendarWeekStart("2026-10-22", 0)).toBe("2026-10-18");
    expect(calendarWeekStart("2026-10-18", 0)).toBe("2026-10-18");
    expect(calendarWeekStart("2026-10-24", 0)).toBe("2026-10-18");
  });

  it("moves whole weeks, across a month", () => {
    expect(calendarWeekStart("2026-10-22", -1)).toBe("2026-10-11");
    expect(calendarWeekStart("2026-10-22", 1)).toBe("2026-10-25");
    expect(calendarWeekStart("2026-11-01", -1)).toBe("2026-10-25");
  });
});

describe("calendarToday", () => {
  const meta = {
    firstDate: "2026-10-18",
    lastDate: "2026-10-24",
    today: null,
    week: 0 as const,
  };

  it("is today inside the week, and nothing outside it", () => {
    expect(calendarToday(meta, "2026-10-18")).toBe("2026-10-18");
    expect(calendarToday(meta, "2026-10-24")).toBe("2026-10-24");
    expect(calendarToday(meta, "2026-10-25")).toBeNull();
  });
});

describe("isAiringCalendar", () => {
  const valid = {
    meta: { firstDate: "2026-10-18", lastDate: "2026-10-24", today: null, week: 0 },
    data: [
      {
        date: "2026-10-18",
        status: "ok",
        items: [
          {
            animeId: 1,
            title: "Uno",
            poster: null,
            airingAt: "2026-10-18T20:00:00Z",
            range: { from: 1, to: 1, total: null },
          },
        ],
      },
    ],
  };

  it("accepts what the API answers, after a JSON round trip", () => {
    expect(isAiringCalendar(JSON.parse(JSON.stringify(valid)))).toBe(true);
  });

  it("rejects anything the page could not draw", () => {
    expect(isAiringCalendar(null)).toBe(false);
    expect(isAiringCalendar([])).toBe(false);
    expect(isAiringCalendar({ ...valid, data: "nope" })).toBe(false);
    expect(isAiringCalendar({ ...valid, meta: {} })).toBe(false);
    expect(
      isAiringCalendar({
        ...valid,
        data: [{ ...valid.data[0], items: [{ animeId: 1, title: "Uno" }] }],
      }),
    ).toBe(false);
  });
});
