import { memoryCache } from "../utils/cache.js";
import type { AiringStatus, BaseAnimeInfo } from "../types/types.js";

const KITSU_BASE = "https://kitsu.io/api/edge";

function normalizeStatus(status?: string): AiringStatus | undefined {
  if (!status) return undefined;
  const map: Record<string, AiringStatus> = {
    current: "ongoing",
    finished: "finished",
    upcoming: "announced",
    tba: "announced",
  };
  return map[status.toLowerCase()] ?? undefined;
}

export async function kitsuSearchAnime(title: string): Promise<BaseAnimeInfo | null> {
  const cacheKey = `kitsu:${title.toLowerCase()}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as BaseAnimeInfo;

  const url = new URL(`${KITSU_BASE}/anime`);
  url.searchParams.set("filter[text]", title);
  url.searchParams.set("page[limit]", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.data?.[0];
  if (!result) return null;

  const attrs = result.attributes ?? {};
  const info: BaseAnimeInfo = {
    id: result.id,
    title: attrs.titles?.en ?? attrs.titles?.en_jp ?? attrs.titles?.ja_jp ?? title,
    airingStatus: normalizeStatus(attrs.status),
    score: attrs.averageRating ? parseFloat(attrs.averageRating) / 10 : undefined,
    poster: attrs.posterImage?.large ?? attrs.posterImage?.original,
  };

  memoryCache.set(cacheKey, info);
  return info;
}
