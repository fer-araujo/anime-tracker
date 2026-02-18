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

// --- HELPERS DE IMÁGENES ---

export const tmdbPosterUrl = (path?: string | null, size = "w780") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

export const tmdbImageUrl = (path?: string | null, size = "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

// Cambio: Default a "original" para asegurar máxima calidad en Banners
export const tmdbBackdropUrl = (path?: string | null, size = "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;


// --- FUNCIONES API ---

export async function tmdbSearch(kind: "tv" | "movie", query: string) {
  const url = new URL(`${TMDB_BASE}/search/${kind}`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
  });

  if (!res.ok) throw new Error(`TMDB search ${kind} error: ${res.status}`);
  const data = await res.json();
  return (data?.results ?? []) as TMDBSearchTVItem[];
}

/**
 * NUEVA FUNCIÓN: Obtiene todas las imágenes de una serie.
 * Filtra por idiomas para buscar "textless" (null) o arte original.
 */
export async function getTmdbImages(id: number, kind: "tv" | "movie" = "tv") {
  const url = new URL(`${TMDB_BASE}/${kind}/${id}/images`);
  
  // Pedimos imágenes sin texto (null), en inglés (en) o japonés (ja)
  url.searchParams.set("include_image_language", "null,en,ja");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    });
    
    if (!res.ok) return null;
    return await res.json(); // Retorna { backdrops: [], posters: [] }
  } catch (e) {
    console.warn(`Error fetching TMDB images for ID ${id}`, e);
    return null;
  }
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

  const names = flattenProviders(regionData);
  const normalized = normalizeProviderNames(names).map((name, idx) => ({
    id: idx + 1,
    name,
  }));

  memoryCache.set(cacheKey, normalized, 1000 * 60 * 60 * 12);
  return normalized;
}

// 👇 sin scoring, solo filtro booleano
export function isAnimeCandidate(item: TMDBSearchTVItem) {
  const isAnimation =
    Array.isArray(item.genre_ids) && item.genre_ids.includes(16);

  const origins = Array.isArray(item.origin_country) ? item.origin_country : [];

  const fromAnimeRegions = origins.some((c) =>
    ["JP", "CN", "KR", "TW"].includes(c)
  );

  return isAnimation || fromAnimeRegions;
}