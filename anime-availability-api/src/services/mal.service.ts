import { memoryCache } from "../utils/cache.js";
import type { AiringStatus, BaseAnimeInfo } from "../types/types.js";

const MAL_BASE = "https://api.jikan.moe/v4";

function normalizeStatus(status?: string): AiringStatus | undefined {
  if (!status) return undefined;
  const map: Record<string, AiringStatus> = {
    airing: "ongoing",
    complete: "finished",
    finished: "finished",
    upcoming: "announced",
  };
  return map[status.toLowerCase()] ?? undefined;
}

export async function malSearchAnime(title: string): Promise<BaseAnimeInfo | null> {
  const cacheKey = `mal:${title.toLowerCase()}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as BaseAnimeInfo;

  const url = new URL(`${MAL_BASE}/anime`);
  url.searchParams.set("q", title);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.data?.[0];
  if (!result) return null;

  const info: BaseAnimeInfo = {
    id: result.mal_id,
    title: result.title,
    airingStatus: normalizeStatus(result.status),
    score: result.score ? result.score / 10 : undefined,
    poster: result.images?.jpg?.large_image_url,
  };

  memoryCache.set(cacheKey, info);
  return info;
}
