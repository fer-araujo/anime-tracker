// src/services/anilist.service.ts
import { memoryCache } from "../utils/cache.js";
import type {
  AiringStatus,
  AniListMedia,
  BaseAnimeInfo,
} from "../types/types.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: title } }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn("[AniList] search error:", res.status, text);
    return null;
  }

  const json = await res.json();
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
      typeof (m as any).popularity === "number"
        ? (m as any).popularity
        : undefined,
    favourites:
      typeof (m as any).favourites === "number"
        ? (m as any).favourites
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
