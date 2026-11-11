import { describe, it, expect } from "vitest";
import {
  formatAiringCaption,
  formatCdmxTime,
  formatDelayLabel,
  formatEpisodeRange,
  isPending,
  isUnreadNotification,
  normalizeNotification,
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
    delayed: false,
    delayedUntil: null,
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

describe("isUnreadNotification", () => {
  const NOW = Date.parse("2026-10-22T16:00:00Z");
  const SEEN = "2026-10-22T00:00:00+00:00";
  const n = (extra: object = {}) =>
    normalizeNotification({
      animeId: 1,
      episode: 6,
      airedAt: "2026-10-22T14:00:00Z",
      title: "x",
      poster: null,
      ...extra,
    });

  it("counts an episode released after the last visit", () => {
    expect(isUnreadNotification(n(), SEEN, NOW)).toBe(true);
  });

  it("never counts a delayed episode, though its slot has passed", () => {
    expect(isUnreadNotification(n({ delayed: true }), SEEN, NOW)).toBe(false);
  });

  it("never counts one still pending, or one before the last visit", () => {
    expect(
      isUnreadNotification(
        n({ upcoming: true, airedAt: "2026-10-22T22:00:00Z" }),
        SEEN,
        NOW,
      ),
    ).toBe(false);
    expect(
      isUnreadNotification(n({ airedAt: "2026-10-21T22:00:00Z" }), SEEN, NOW),
    ).toBe(false);
    expect(isUnreadNotification(n(), null, NOW)).toBe(false);
  });
});

describe("normalizeNotification", () => {
  it("reads a payload without delay fields as not delayed", () => {
    expect(
      normalizeNotification({
        animeId: 1,
        episode: 6,
        airedAt: "2026-10-22T14:00:00Z",
        title: "x",
        poster: null,
      }),
    ).toMatchObject({ delayed: false, delayedUntil: null, upcoming: false });
  });

  it("keeps the delay the API sent", () => {
    expect(
      normalizeNotification({
        animeId: 1,
        episode: 6,
        airedAt: "2026-10-22T14:00:00Z",
        title: "x",
        poster: null,
        delayed: true,
        delayedUntil: "2026-10-29T14:00:00.000Z",
      }),
    ).toMatchObject({ delayed: true, delayedUntil: "2026-10-29T14:00:00.000Z" });
  });
});

describe("formatDelayLabel", () => {
  it("says only that it is delayed when no date is known", () => {
    expect(formatDelayLabel(null)).toBe("Retrasado");
    expect(formatDelayLabel(undefined)).toBe("Retrasado");
  });

  it("names the new CDMX day when known", () => {
    expect(formatDelayLabel("2026-11-18T20:00:00Z")).toBe(
      "Retrasado hasta el 18 nov",
    );
    // 01:00 UTC on the 19th is still the 18th in CDMX.
    expect(formatDelayLabel("2026-11-19T01:00:00Z")).toBe(
      "Retrasado hasta el 18 nov",
    );
  });
});
