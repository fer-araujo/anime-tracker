// src/services/anilist.service.ts
import { logger } from "../utils/logger.js";
import { memoryCache } from "../utils/cache.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import type {
  AiringStatus,
  AniListMedia,
  BaseAnimeInfo,
} from "../types/types.js";

function normalizeStatus(status?: string): AiringStatus | undefined {
  if (!status) return undefined;

  const map: Record<string, AiringStatus> = {
    RELEASING: "ongoing",
    FINISHED: "finished",
    NOT_YET_RELEASED: "announced",
  };

  return map[status] ?? undefined;
}

/**
 * Búsqueda simple en AniList por título.
 * Devuelve un `BaseAnimeInfo` muy básico que luego
 * podremos enriquecer con TMDB / otros servicios.
 */
export async function fetchAniListBySearch(
  title: string
): Promise<BaseAnimeInfo | null> {
  const cacheKey = `anilist:search:${title.toLowerCase()}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as BaseAnimeInfo;

  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title { english romaji native }
        episodes
        status
        season
        seasonYear
        bannerImage
        coverImage { large }
        averageScore
        popularity
        favourites
      }
    }
  `;

  const json = await anilistFetch(query, { search: title });
  if (!json) return null;

  const m = json?.data?.Media as AniListMedia | undefined;
  if (!m) return null;

  const mainTitle =
    m.title.english ?? m.title.romaji ?? m.title.native ?? title;

  const poster = m.coverImage?.large ?? null;
  const backdrop = m.bannerImage ?? poster ?? null;

  const info: BaseAnimeInfo = {
    id: m.id,
    title: mainTitle,
    year: m.seasonYear,
    season: m.season,
    episodes: m.episodes,
    airingStatus: normalizeStatus(m.status),
    popularity:
      typeof m.popularity === "number"
        ? m.popularity
        : undefined,
    favourites:
      typeof m.favourites === "number"
        ? m.favourites
        : undefined,
    score:
      typeof m.averageScore === "number" ? m.averageScore / 10 : undefined,
    poster: poster ?? undefined,
    backdrop: backdrop ?? undefined,
    banner: m.bannerImage ?? undefined,
    providers: [], // por ahora AniList no trae plataformas
  };

  memoryCache.set(cacheKey, info);
  return info;
}
