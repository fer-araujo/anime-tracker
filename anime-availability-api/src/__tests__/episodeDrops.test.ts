import { describe, it, expect } from "vitest";
import { collapseSameDayDrops } from "../utils/episodeDrops.js";

/** Unix seconds of a UTC ISO instant. */
const s = (iso: string) => Date.parse(iso) / 1000;

const drop = (
  anilistId: number,
  iso: string,
  from: number | null,
  to = from,
  total: number | null = null,
) => ({
  anilistId,
  airingAt: s(iso),
  range: from === null || to === null ? null : { from, to, total },
});

describe("collapseSameDayDrops", () => {
  it("merges a season dropped as one airing per episode", () => {
    // AniList's shape for Cyberpunk: Edgerunners 2 on 2026-10-20.
    const rows = Array.from({ length: 10 }, (_, i) =>
      drop(195539, "2026-10-20T07:00:00Z", i + 1, i + 1, 10),
    );

    expect(collapseSameDayDrops(rows)).toEqual([
      drop(195539, "2026-10-20T07:00:00Z", 1, 10, 10),
    ]);
  });

  it("groups by CDMX day, not UTC day", () => {
    // 23:00 and 23:30 CDMX on the 20th are both the 21st in UTC; 05:00 UTC on
    // the 21st is still the 20th in CDMX. All three are one CDMX day.
    const rows = [
      drop(1, "2026-10-21T05:00:00Z", 1),
      drop(1, "2026-10-21T05:30:00Z", 2),
      drop(1, "2026-10-20T07:00:00Z", 3),
    ];

    const [only, ...rest] = collapseSameDayDrops(rows);
    expect(rest).toEqual([]);
    expect(only.range).toEqual({ from: 1, to: 3, total: null });
    // The release happened when its first episode did.
    expect(only.airingAt).toBe(s("2026-10-20T07:00:00Z"));
  });

  it("keeps a weekly series' two days apart", () => {
    const rows = [
      drop(1, "2026-10-13T14:00:00Z", 4),
      drop(1, "2026-10-20T14:00:00Z", 5),
    ];

    expect(collapseSameDayDrops(rows)).toHaveLength(2);
  });

  it("keeps different series apart on the same day", () => {
    const rows = [
      drop(1, "2026-10-20T14:00:00Z", 4),
      drop(2, "2026-10-20T14:00:00Z", 4),
    ];

    expect(collapseSameDayDrops(rows)).toHaveLength(2);
  });

  it("lets a numbered row win over an unnumbered one", () => {
    const rows = [
      drop(1, "2026-10-20T14:00:00Z", null),
      drop(1, "2026-10-20T15:00:00Z", 7),
    ];

    expect(collapseSameDayDrops(rows)[0].range).toEqual({
      from: 7,
      to: 7,
      total: null,
    });
  });

  it("keeps the other fields of the earliest row", () => {
    const rows = [
      { ...drop(1, "2026-10-20T15:00:00Z", 2), tag: "late" },
      { ...drop(1, "2026-10-20T14:00:00Z", 1), tag: "early" },
    ];

    expect(collapseSameDayDrops(rows)[0].tag).toBe("early");
  });
});
