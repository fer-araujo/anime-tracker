import { describe, it, expect } from "vitest";
import { animeScheduleToAniMedia } from "../services/adapters/animeScheduleToAniMedia.js";
import type { AsAnime } from "../services/animeSchedule.service.js";

const anime = (over: Partial<AsAnime> = {}): AsAnime => ({
  route: "youjo-senki-ii",
  title: "Youjo Senki II",
  websites: { aniList: "anilist.co/anime/136430/Youjo-Senki-II" },
  ...over,
});

describe("animeScheduleToAniMedia", () => {
  it("reads the AniList id off the record instead of a mapping table", () => {
    // This is the source's whole advantage: no id translation, so nothing is
    // lost to a snapshot that predates a newly added series.
    expect(animeScheduleToAniMedia(anime())?.id).toBe(136430);
  });

  it("drops a record with no AniList link", () => {
    expect(animeScheduleToAniMedia(anime({ websites: { mal: "x" } }))).toBeNull();
    expect(animeScheduleToAniMedia(anime({ websites: null }))).toBeNull();
  });

  it("keeps the score on the 0-100 scale it already uses", () => {
    // Unlike MAL and Shikimori, which report 0-10 and need scaling.
    const media = animeScheduleToAniMedia(
      anime({ stats: { averageScore: 83.2315902709961 } }),
    );

    expect(media?.averageScore).toBe(83);
  });

  it("builds the poster URL from the versioned image path", () => {
    const media = animeScheduleToAniMedia(
      anime({ imageVersionRoute: "anime/jpg/default/one-piece-f2f2a983a8.jpg" }),
    );

    expect(media?.coverImage?.large).toBe(
      "https://img.animeschedule.net/production/assets/public/img/anime/jpg/default/one-piece-f2f2a983a8.jpg",
    );
  });

  it("leaves the poster null so the TMDB fallback can take over", () => {
    expect(animeScheduleToAniMedia(anime())?.coverImage?.large).toBeNull();
  });

  it("maps the media type and season into AniList's vocabulary", () => {
    const media = animeScheduleToAniMedia(
      anime({
        mediaTypes: [{ name: "TV Short" }],
        season: { year: "2026", season: "Summer" },
      }),
    );

    expect(media?.format).toBe("TV_SHORT");
    expect(media?.season).toBe("SUMMER");
    expect(media?.seasonYear).toBe(2026);
  });

  it("carries genres, studios and the synopsis", () => {
    const media = animeScheduleToAniMedia(
      anime({
        genres: [{ name: "Action" }, { name: "Isekai" }],
        studios: [{ name: "NUT" }],
        description: "The second season.",
      }),
    );

    expect(media?.genres).toEqual(["Action", "Isekai"]);
    expect(media?.studios?.edges?.[0]?.node?.name).toBe("NUT");
    expect(media?.description).toBe("The second season.");
  });
});
