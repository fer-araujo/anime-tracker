import { describe, it, expect } from "vitest";
import {
  buildStatusBreakdown,
  resolveListAccent,
  resolveMosaicLayout,
} from "@/lib/lists";
import type { TrackingStatus } from "@/types/anime";

describe("buildStatusBreakdown", () => {
  const statuses = new Map<number, TrackingStatus>([
    [1, "watching"],
    [2, "watching"],
    [3, "completed"],
    [4, "dropped"],
  ]);

  it("counts each status and keeps the bar's reading order", () => {
    const result = buildStatusBreakdown(statuses, [1, 2, 3, 4]);

    // watching before completed before dropped — not insertion order.
    expect(result).toEqual([
      { status: "watching", count: 2 },
      { status: "completed", count: 1 },
      { status: "dropped", count: 1 },
    ]);
  });

  it("omits statuses with no animes so the bar has no zero-width segments", () => {
    const result = buildStatusBreakdown(statuses, [3]);

    expect(result).toEqual([{ status: "completed", count: 1 }]);
  });

  it("ignores animes the user never tracked", () => {
    // The caller sizes segments against the list total, so an untracked anime
    // has to leave the rail showing through rather than inflate the others.
    const result = buildStatusBreakdown(statuses, [1, 99]);

    expect(result).toEqual([{ status: "watching", count: 1 }]);
  });

  it("returns nothing for a list with no tracked animes", () => {
    expect(buildStatusBreakdown(statuses, [98, 99])).toEqual([]);
    expect(buildStatusBreakdown(new Map(), [1, 2])).toEqual([]);
  });
});

describe("resolveListAccent", () => {
  it("honours the colour the user picked", () => {
    expect(resolveListAccent("pink").tint).toContain("pink");
    expect(resolveListAccent("emerald").tint).toContain("emerald");
  });

  it("falls back for lists created before the picker existed", () => {
    // The regression this guards: the card used to derive colour from
    // `name.length % 6`, so renaming a list silently changed it.
    expect(resolveListAccent(null).tint).toContain("sky");
    expect(resolveListAccent("chartreuse").tint).toContain("sky");
  });
});

describe("resolveMosaicLayout", () => {
  it("maps poster counts to compositions without padding empty cells", () => {
    expect(resolveMosaicLayout(0)).toBe("empty");
    expect(resolveMosaicLayout(1)).toBe("one");
    expect(resolveMosaicLayout(2)).toBe("two");
    expect(resolveMosaicLayout(3)).toBe("three");
    expect(resolveMosaicLayout(4)).toBe("four");
    expect(resolveMosaicLayout(9)).toBe("four");
  });
});
