import { describe, it, expect } from "vitest";
import {
  formatAiringCaption,
  formatCdmxTime,
  formatEpisodeRange,
  isPending,
} from "@/lib/episodes";

describe("formatEpisodeRange", () => {
  it("names a single episode", () => {
    expect(formatEpisodeRange({ from: 5, to: 5, total: 12 })).toBe("Episodio 5");
  });

  it("names a partial drop by its range", () => {
    expect(formatEpisodeRange({ from: 1, to: 6, total: 12 })).toBe(
      "Episodios 1–6",
    );
    expect(formatEpisodeRange({ from: 11, to: 12, total: 12 })).toBe(
      "Episodios 11–12",
    );
  });

  it("calls a drop of every episode the whole season", () => {
    expect(formatEpisodeRange({ from: 1, to: 10, total: 10 })).toBe(
      "Temporada completa",
    );
  });

  it("does not call a one-episode special a whole season", () => {
    expect(formatEpisodeRange({ from: 1, to: 1, total: 1 })).toBe("Episodio 1");
  });

  it("keeps the range when the total is unknown", () => {
    expect(formatEpisodeRange({ from: 1, to: 10, total: null })).toBe(
      "Episodios 1–10",
    );
  });
});

describe("formatCdmxTime", () => {
  it("reads the time in CDMX whatever the machine's zone", () => {
    // 03:30 UTC on the 26th is 21:30 on the CDMX Sunday 25th.
    expect(formatCdmxTime("2026-10-26T03:30:00Z")).toBe("21:30");
    expect(formatCdmxTime("2026-10-22T06:30:00Z")).toBe("00:30");
  });
});

describe("formatAiringCaption", () => {
  it("joins the range and the time", () => {
    expect(
      formatAiringCaption({
        episode: 10,
        range: { from: 1, to: 10, total: 10 },
        airingAt: "2026-10-20T07:00:00Z",
      }),
    ).toBe("Temporada completa · 01:00");
  });

  it("falls back to the episode when an older API sent no range", () => {
    expect(
      formatAiringCaption({ episode: 4, airingAt: "2026-10-20T07:00:00Z" }),
    ).toBe("Episodio 4 · 01:00");
  });

  it("shows only the time when the episode is unknown", () => {
    expect(
      formatAiringCaption({ episode: null, range: null, airingAt: "2026-10-20T07:00:00Z" }),
    ).toBe("01:00");
  });
});

describe("isPending", () => {
  const n = (airedAt: string, upcoming: boolean) => ({
    animeId: 1,
    episode: 1,
    range: { from: 1, to: 1, total: null },
    airedAt,
    upcoming,
    title: "x",
    poster: null,
  });
  const NOW = Date.parse("2026-10-22T16:00:00Z");

  it("is pending while flagged and still ahead of the clock", () => {
    expect(isPending(n("2026-10-22T22:00:00Z", true), NOW)).toBe(true);
  });

  it("stops being pending the moment it airs, whatever the stale flag says", () => {
    expect(isPending(n("2026-10-22T15:00:00Z", true), NOW)).toBe(false);
  });

  it("never treats a released episode as pending", () => {
    expect(isPending(n("2026-10-22T22:00:00Z", false), NOW)).toBe(false);
  });
});
