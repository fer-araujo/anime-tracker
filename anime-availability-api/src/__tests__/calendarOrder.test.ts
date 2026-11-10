import { describe, it, expect } from "vitest";
import { compareCalendarEntries } from "../utils/calendarOrder.js";

const entry = (animeId: number, title: string, airingAt: string | null) => ({
  animeId,
  title,
  airingAt,
});

const order = (...items: ReturnType<typeof entry>[]) =>
  [...items].sort(compareCalendarEntries).map((e) => e.animeId);

describe("compareCalendarEntries", () => {
  it("orders by airing time", () => {
    expect(
      order(
        entry(1, "A", "2026-11-09T20:00:00Z"),
        entry(2, "B", "2026-11-09T08:00:00Z"),
      ),
    ).toEqual([2, 1]);
  });

  it("breaks a shared time alphabetically", () => {
    expect(
      order(
        entry(1, "Zom 100", "2026-11-09T20:00:00Z"),
        entry(2, "Bleach", "2026-11-09T20:00:00Z"),
      ),
    ).toEqual([2, 1]);
  });

  it("treats seconds within one minute as the same time", () => {
    // Both print as the same hour, so the viewer expects alphabetical order.
    expect(
      order(
        entry(1, "Zom 100", "2026-11-09T20:00:05Z"),
        entry(2, "Bleach", "2026-11-09T20:00:45Z"),
      ),
    ).toEqual([2, 1]);
  });

  it("ignores accents and case, and reads numbers as numbers", () => {
    const at = "2026-11-09T20:00:00Z";
    expect(order(entry(1, "Élan", at), entry(2, "dragon", at))).toEqual([2, 1]);
    expect(
      order(entry(1, "Show Season 10", at), entry(2, "Show Season 2", at)),
    ).toEqual([2, 1]);
  });

  it("puts an unknown time last, alphabetically among its peers", () => {
    expect(
      order(
        entry(1, "Zeta", null),
        entry(2, "Alfa", null),
        entry(3, "Omega", "2026-11-09T23:59:00Z"),
      ),
    ).toEqual([3, 2, 1]);
  });

  it("falls back to the id so the order cannot flicker", () => {
    const at = "2026-11-09T20:00:00Z";
    expect(order(entry(9, "Same", at), entry(4, "Same", at))).toEqual([4, 9]);
  });
});
