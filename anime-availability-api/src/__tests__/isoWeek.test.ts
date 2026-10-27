import { describe, it, expect } from "vitest";
import { isoWeek, isoWeeksBetween } from "../utils/isoWeek.js";

const at = (iso: string) => isoWeek(Date.parse(iso));

describe("isoWeek", () => {
  it("numbers weeks the way AnimeSchedule's timetable does", () => {
    // Measured: ?week=37&year=2026 returned Monday 7 to Sunday 13 September.
    expect(at("2026-09-07T12:00:00Z")).toEqual({ week: 37, year: 2026 });
    expect(at("2026-09-13T12:00:00Z")).toEqual({ week: 37, year: 2026 });
    expect(at("2026-09-14T12:00:00Z")).toEqual({ week: 38, year: 2026 });
  });

  it("puts early January in the previous year's last week when ISO does", () => {
    // Subtracting one from the week number would ask for week 0 here.
    expect(at("2021-01-01T12:00:00Z")).toEqual({ week: 53, year: 2020 });
  });

  it("puts late December in the next year's first week when ISO does", () => {
    expect(at("2024-12-30T12:00:00Z")).toEqual({ week: 1, year: 2025 });
  });
});

describe("isoWeeksBetween", () => {
  const between = (from: string, to: string) =>
    isoWeeksBetween(Date.parse(from), Date.parse(to));

  it("reaches the next week for a CDMX Sunday evening", () => {
    // Sunday 25 October 2026, 08:00 to 23:59:59 CDMX. From 18:00 CDMX it is
    // already Monday in UTC, so the broadcasts of the evening live in week 44.
    expect(between("2026-10-25T14:00:00Z", "2026-10-26T05:59:59Z")).toEqual([
      { week: 43, year: 2026 },
      { week: 44, year: 2026 },
    ]);
  });

  it("stays in one week for a CDMX weekday", () => {
    expect(between("2026-10-22T06:00:00Z", "2026-10-23T05:59:59Z")).toEqual([
      { week: 43, year: 2026 },
    ]);
  });

  it("covers a seven-day lookback across the year boundary", () => {
    expect(between("2020-12-27T12:00:00Z", "2021-01-04T05:59:59Z")).toEqual([
      { week: 52, year: 2020 },
      { week: 53, year: 2020 },
      { week: 1, year: 2021 },
    ]);
  });

  it("answers nothing for an inverted range", () => {
    expect(between("2026-10-23T00:00:00Z", "2026-10-22T00:00:00Z")).toEqual([]);
  });
});
