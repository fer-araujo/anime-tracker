import { describe, it, expect } from "vitest";
import { malToAniMedia } from "../services/adapters/malToAniMedia.js";
import type { MalNode } from "../services/malSchedule.service.js";

/** Frieren: MAL 52991, AniList 154587. One of the pairs that do not agree. */
const FRIEREN_MAL = 52991;
const FRIEREN_ANILIST = 154587;

const node = (over: Partial<MalNode> = {}): MalNode => ({
  id: FRIEREN_MAL,
  title: "Sousou no Frieren",
  status: "currently_airing",
  media_type: "tv",
  ...over,
});

describe("malToAniMedia", () => {
  it("translates the id, because the database stores AniList ids", () => {
    expect(malToAniMedia(node())?.id).toBe(FRIEREN_ANILIST);
  });

  it("drops an entry it cannot translate rather than passing a MAL id through", () => {
    // A card carrying an untranslated id renders fine and then writes a
    // favourite against a row that matches nothing — a silent failure.
    expect(malToAniMedia(node({ id: 99999999 }))).toBeNull();
  });

  it("rescales the score to AniList's 0-100", () => {
    expect(malToAniMedia(node({ mean: 9.11 }))?.averageScore).toBe(91);
    expect(malToAniMedia(node({ mean: 0 }))?.averageScore).toBeNull();
  });

  it("converts the episode length from seconds to whole minutes", () => {
    // MAL reports seconds; every consumer downstream prints minutes.
    expect(malToAniMedia(node({ average_episode_duration: 1440 }))?.duration).toBe(
      24,
    );
  });

  it("carries the genres and studios the Shikimori list endpoint omits", () => {
    const media = malToAniMedia(
      node({
        genres: [{ id: 1, name: "Adventure" }],
        studios: [{ id: 11, name: "Madhouse" }],
        synopsis: "A mage outlives her party.",
      }),
    );

    expect(media?.genres).toEqual(["Adventure"]);
    expect(media?.studios?.edges?.[0]?.node?.name).toBe("Madhouse");
    expect(media?.description).toBe("A mage outlives her party.");
  });

  it("maps MAL's vocabulary onto AniList's", () => {
    expect(malToAniMedia(node({ media_type: "tv_special" }))?.format).toBe(
      "TV_SHORT",
    );
    expect(malToAniMedia(node())?.status).toBe("RELEASING");
  });
});
