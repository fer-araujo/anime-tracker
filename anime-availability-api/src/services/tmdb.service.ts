// src/services/tmdb.service.ts
import { memoryCache } from "../utils/cache.js";
import type {
  ProviderInfo,
  TMDBProvidersResponse,
  TMDBSearchTVItem,
} from "../types/types.js";
import {
  flattenProviders,
  normalizeProviderNames,
} from "../utils/providers.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_KEY ?? "";

export const tmdbPosterUrl = (path?: string | null, size = "w780") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

export const tmdbImageUrl = (path?: string | null, size = "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

export const tmdbBackdropUrl = (path?: string | null, size = "w1280") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

export async function tmdbSearch(kind: "tv" | "movie", query: string) {
  const url = new URL(`${TMDB_BASE}/search/${kind}`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
  });

  if (!res.ok) throw new Error(`TMDB search ${kind} error: ${res.status}`);
  const data = await res.json();
  return (data?.results ?? []) as TMDBSearchTVItem[]; // si quieres, renombra el type a TMDBSearchItem
}

export async function tmdbWatchProviders(
  kind: "tv" | "movie",
  id: number,
  region = "MX"
): Promise<ProviderInfo[]> {
  const cacheKey = `providers:${kind}:${id}:${region}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as ProviderInfo[];

  const url = `${TMDB_BASE}/${kind}/${id}/watch/providers`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as TMDBProvidersResponse;
  const regionData = data.results?.[region];

  const names = flattenProviders(regionData /* <- streaming-only si ya aplicaste el fix */);
  const normalized = normalizeProviderNames(names).map((name, idx) => ({
    id: idx + 1,
    name,
  }));

  memoryCache.set(cacheKey, normalized, 1000 * 60 * 60 * 12);
  return normalized;
}

// 👇 sin scoring, solo filtro booleando
export function isAnimeCandidate(item: TMDBSearchTVItem) {
  const isAnimation =
    Array.isArray(item.genre_ids) && item.genre_ids.includes(16);

  const origins = Array.isArray(item.origin_country) ? item.origin_country : [];

  const fromAnimeRegions = origins.some((c) =>
    ["JP", "CN", "KR", "TW"].includes(c)
  );

  return isAnimation || fromAnimeRegions;
}

