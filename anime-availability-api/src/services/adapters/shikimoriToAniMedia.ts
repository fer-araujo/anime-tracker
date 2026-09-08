import type { AniMedia } from "../../types/animeCore.js";
import { anilistIdFor } from "../../utils/idMap.js";
import type { ShikiSeasonEntry } from "../shikimoriSeason.service.js";

const SHIKI_BASE = "https://shikimori.one";

/** Shikimori's `kind` uses lowercase and `tv_special`; AniList expects these. */
const FORMAT: Record<string, string> = {
  tv: "TV",
  tv_special: "TV_SHORT",
  movie: "MOVIE",
  ova: "OVA",
  ona: "ONA",
  special: "SPECIAL",
  music: "MUSIC",
};

/** Shikimori's `status` vocabulary mapped onto AniList's. */
const STATUS: Record<string, string> = {
  anons: "NOT_YET_RELEASED",
  ongoing: "RELEASING",
  released: "FINISHED",
};

/**
 * One Shikimori season entry as the formatter expects it.
 *
 * Returns null when the id cannot be translated. Shikimori numbers anime by MAL
 * id, and an entry the user's library cannot recognise is worse than an absent
 * one — it would render a card whose favourite button writes against an id that
 * matches nothing.
 *
 * The result is deliberately sparse: this endpoint gives no genres, studios or
 * synopsis. Callers fill those from the per-anime cache where it has them.
 */
export function shikimoriToAniMedia(
  entry: ShikiSeasonEntry,
  season?: string,
  year?: number,
): AniMedia | null {
  const anilistId = anilistIdFor(entry.id);
  if (!anilistId) return null;

  // Shikimori answers with a placeholder path rather than omitting the field,
  // and most recent-season entries have no art at all — 36 of 43 for Summer
  // 2026. Passing that through would paint a page of identical grey boxes and
  // block the TMDB poster further down the chain.
  const rawImage = entry.image?.original ?? null;
  const poster =
    rawImage && !rawImage.includes("missing")
      ? `${SHIKI_BASE}${rawImage}`
      : null;

  // Shikimori scores 0–10 as a string; AniList uses 0–100. Everything
  // downstream divides by 10, so the scale has to match before it gets there.
  const aired = parseAiredOn(entry.aired_on);
  const score = Number(entry.score);
  const averageScore =
    Number.isFinite(score) && score > 0 ? Math.round(score * 10) : null;

  return {
    id: anilistId,
    title: { romaji: entry.name, english: entry.name },
    coverImage: { extraLarge: poster, large: poster },
    bannerImage: null,
    description: null,
    format: FORMAT[entry.kind ?? ""] ?? null,
    status: STATUS[entry.status ?? ""] ?? null,
    genres: [],
    episodes: entry.episodes || null,
    averageScore,
    season: season ?? null,
    // The status-based lists carry no season context, so the year comes from
    // the air date instead of being left blank.
    seasonYear: year ?? aired?.year ?? null,
    startDate: aired,
    isAdult: false,
  };
}

function parseAiredOn(aired: string | null | undefined) {
  if (!aired) return null;
  const [y, m, d] = aired.split("-").map(Number);
  return { year: y || null, month: m || null, day: d || null };
}
