import { describe, it, expect } from "vitest";
import { isoWeek } from "../utils/isoWeek.js";

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
