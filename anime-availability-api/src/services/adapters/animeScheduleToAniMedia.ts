import type { AniMedia } from "../../types/animeCore.js";
import { genresFor } from "../../utils/idMap.js";
import { AS_IMAGE_BASE, type AsAnime } from "../animeSchedule.service.js";

/** AnimeSchedule spells media types in prose; AniList expects these. */
const FORMAT: Record<string, string> = {
  tv: "TV",
  "tv short": "TV_SHORT",
  movie: "MOVIE",
  ova: "OVA",
  ona: "ONA",
  special: "SPECIAL",
  music: "MUSIC",
};

/**
 * One AnimeSchedule series record as the formatter expects it.
 *
 * Unlike the MAL and Shikimori adapters this needs no id map: the record links
 * to its own AniList page, so the id is read straight off it. That is why 179
 * of 179 ongoing entries resolve here while the offline mapping table covers
 * 91% and silently drops anything published after its last snapshot.
 *
 * Returns null when the record has no AniList link. A card whose id matches
 * nothing in `user_anime` looks fine and then writes a favourite against a row
 * that does not exist.
 */
export function animeScheduleToAniMedia(anime: AsAnime): AniMedia | null {
  const anilistId = Number(
    anime.websites?.aniList?.match(/anime\/(\d+)/)?.[1] ?? NaN,
  );
  if (!Number.isFinite(anilistId) || anilistId <= 0) return null;

  const poster = anime.imageVersionRoute
    ? `${AS_IMAGE_BASE}${anime.imageVersionRoute}`
    : null;

  const year = Number(anime.season?.year);
  const format = anime.mediaTypes?.[0]?.name?.toLowerCase() ?? "";

  return {
    id: anilistId,
    title: {
      romaji: anime.names?.romaji || anime.title,
      english: anime.names?.english || anime.title,
      native: anime.names?.native || undefined,
    },
    coverImage: { extraLarge: poster, large: poster },
    bannerImage: null,
    // Their descriptions carry inline markup such as <span class="italics">,
    // which the caller's sanitiser strips the same way it does Shikimori's.
    description: anime.description ?? null,
    format: FORMAT[format] ?? null,
    status: "RELEASING",
    genres: anime.genres?.length
      ? anime.genres.map((g) => g.name)
      : genresFor(anilistId),
    episodes: null,
    // Already 0–100 here, unlike MAL and Shikimori which report 0–10.
    averageScore:
      typeof anime.stats?.averageScore === "number"
        ? Math.round(anime.stats.averageScore)
        : null,
    duration: anime.lengthMin || null,
    season: anime.season?.season?.toUpperCase() ?? null,
    seasonYear: Number.isFinite(year) ? year : null,
    startDate: null,
    isAdult: false,
    studios: anime.studios?.length
      ? {
          edges: anime.studios.map((st) => ({
            isMain: true,
            node: { name: st.name },
          })),
        }
      : undefined,
  };
}
