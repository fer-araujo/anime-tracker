import { memoryCache } from "../utils/cache.js";
import type { AiringStatus, AniListMedia, BaseAnimeInfo } from "../types/types.js";

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

export async function fetchAniListBySearch(title: string): Promise<BaseAnimeInfo | null> {
  const cacheKey = `anilist:${title.toLowerCase()}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as BaseAnimeInfo;

  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title { english native romaji }
        episodes
        status
        season
        seasonYear
        coverImage { large medium }
        averageScore
      }
    }
  `;

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: title } }),
  });

  if (!res.ok) return null;

  const json = await res.json();
  const m = json?.data?.Media as AniListMedia | undefined;
  if (!m) return null;

  const info: BaseAnimeInfo = {
    id: m.id,
    title: m.title.english ??  m.title.romaji ?? m.title.native ?? title,
    episodes: m.episodes,
    year: m.seasonYear,
    season: m.season,
    airingStatus: normalizeStatus(m.status),
    poster: m.coverImage?.large ?? m.coverImage?.medium,
    score: m.averageScore ? m.averageScore / 10 : undefined,
  };

  memoryCache.set(cacheKey, info);
  return info;
}
