// src/services/tmdb.service.ts
import { logger } from "../utils/logger.js";
import { hybridCache } from "../utils/cache.js";
import { fetchWithRetry } from "../utils/fetch.js";
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

// --- INTERFACES AUXILIARES PARA SEASON-SPECIFIC SYNOPSIS ---

/** Estructura de una temporada dentro de la respuesta de /tv/{id} */
interface TMDBSeasonSummary {
  air_date?: string | null;
  season_number: number;
  name?: string;
  overview?: string;
}

/** Estructura de la respuesta de /tv/{id} */
interface TMDBTVDetails {
  seasons?: TMDBSeasonSummary[];
  overview?: string | null;
}

/** Estructura de la respuesta de /tv/{id}/season/{n} */
interface TMDBSeasonDetail {
  overview?: string | null;
  name?: string;
  air_date?: string | null;
}

// --- HELPERS DE IMÁGENES ---

export const tmdbPosterUrl = (path?: string | null, size = "w780") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

export const tmdbImageUrl = (path?: string | null, size = "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

// Cambio: Default a "original" para asegurar máxima calidad en Banners
export const tmdbBackdropUrl = (path?: string | null, size = "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

// ─── In-flight request deduplication ──────────────────────────────────────────

function withDedup<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyFn?: (...args: any[]) => string,
): T {
  const inFlight = new Map<string, Promise<any>>();
  const getKey = keyFn ?? ((...args: any[]) => JSON.stringify(args));
  
  return ((...args: any[]) => {
    const key = getKey(...args);
    const existing = inFlight.get(key);
    if (existing) return existing;
    
    const promise = fn(...args).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  }) as T;
}

// --- FUNCIONES API ---

async function _tmdbSearch(kind: "tv" | "movie", query: string) {
  const url = new URL(`${TMDB_BASE}/search/${kind}`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const res = await fetchWithRetry(url.toString(), {
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
async function _getTmdbImages(id: number, kind: "tv" | "movie" = "tv") {
  const url = new URL(`${TMDB_BASE}/${kind}/${id}/images`);
  
  // Pedimos imágenes sin texto (null), en inglés (en) o japonés (ja)
  url.searchParams.set("include_image_language", "null,en,ja");

  try {
    const res = await fetchWithRetry(url.toString(), {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    });
    
    if (!res.ok) return null;
    return await res.json(); // Retorna { backdrops: [], posters: [] }
  } catch (e) {
logger.warn({ err: e, id }, "Error fetching TMDB images");
      return null;
  }
}

/**
 * Obtiene la sinopsis en un idioma específico, con fallback automático
 * a otros idiomas si el solicitado no tiene overview.
 * 
 * Cadena de fallback: "es-MX" → "es-ES" → "en"
 */
const SYNOPSIS_LANG_FALLBACKS = ["es-MX", "es-ES", "en"];

export async function getTmdbSynopsis(
  id: number,
  kind: "tv" | "movie" = "tv",
  language: string = "es-MX"
): Promise<string | null> {
  const languages = language === "es-MX"
    ? SYNOPSIS_LANG_FALLBACKS
    : [language];

  for (const lang of languages) {
    try {
      const url = new URL(`${TMDB_BASE}/${kind}/${id}`);
      url.searchParams.set("language", lang);

      const res = await fetchWithRetry(url.toString(), {
        headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (data.overview?.trim()) return data.overview.trim();
    } catch (e) {
      logger.warn({ err: e, id, language: lang }, "Error fetching TMDB synopsis");
      continue;
    }
  }

  return null;
}

/**
 * Obtiene la sinopsis de TMDB, pero para "tv" busca la sinopsis específica
 * de la temporada/cour cuyo año de emisión coincida con `aniYear`.
 * - Para "movie" delega directamente a getTmdbSynopsis.
 * - Para "tv" busca en el array `seasons` de /tv/{id} la temporada
 *   cuyo `air_date` calce con `aniYear` (+/- 2 meses si hay
 *   ambigüedad con `aniMonth`). Si la encuentra, hace un segundo fetch
 *   a /tv/{id}/season/{n} para obtener su `overview`. Sino, fallback al
 *   overview general del TV Show.
 */
export async function getTmdbSpecificSynopsis(
  id: number,
  kind: "tv" | "movie",
  language: string = "es-MX",
  aniYear?: number | null,
  aniMonth?: number | null,
  nextAiringAt?: number | null,
): Promise<string | null> {
  // --- Movie: mismo comportamiento de siempre ---
  if (kind === "movie") {
    return getTmdbSynopsis(id, kind, language);
  }

  // --- TV: derivar año/mes del próximo episodio si está disponible ---
  // nextAiringAt es un timestamp Unix de AniList. Al usarlo en vez de
  // seasonYear/startDate, obtenemos la temporada/cour ACTUAL, no la primera.
  if (nextAiringAt && kind === "tv") {
    const airDate = new Date(nextAiringAt * 1000);
    aniYear = airDate.getFullYear();
    aniMonth = airDate.getMonth() + 1;
    logger.debug({ aniYear, aniMonth, nextAiringAt }, "[tmdb] season derived from nextAiringEpisode");
  }

  // --- TV: buscar temporada específica por año/mes ---
  try {
    // 1. Obtener datos generales del TV Show (incluye "seasons")
    const tvUrl = new URL(`${TMDB_BASE}/tv/${id}`);
    tvUrl.searchParams.set("language", language);

    const tvRes = await fetchWithRetry(tvUrl.toString(), {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    });
    if (!tvRes.ok) return getTmdbSynopsis(id, kind, language);

    const tvData: TMDBTVDetails = await tvRes.json();
    const seasons = tvData.seasons;

    // 2. Sin seasons o sin año de referencia → fallback
    if (!seasons?.length || !aniYear) {
      return tvData.overview || getTmdbSynopsis(id, kind, language);
    }

    // 3. Buscar temporada cuyo air_date coincida con aniYear
    //    Primero filtramos por año exacto
    let candidates = seasons.filter((s) => {
      if (!s.air_date) return false;
      const y = new Date(s.air_date).getFullYear();
      return !isNaN(y) && y === aniYear;
    });

    // 3b. Si hay mes y múltiples candidatos, desempatar con +/- 2 meses
    if (candidates.length > 1 && aniMonth) {
      const monthMin = aniMonth - 2; // puede ser < 1, Date lo maneja
      const monthMax = aniMonth + 2;

      candidates = candidates.filter((s) => {
        if (!s.air_date) return false;
        const d = new Date(s.air_date);
        const m = d.getMonth() + 1; // getMonth() es 0-indexed
        return !isNaN(m) && m >= monthMin && m <= monthMax;
      });
    }

    // 3c. Si no hay candidatos después del filtro → fallback
    if (candidates.length === 0) {
      return tvData.overview || getTmdbSynopsis(id, kind, language);
    }

    // 4. Ordenar por season_number (la primera chronológicamente)
    candidates.sort((a, b) => a.season_number - b.season_number);
    const targetSeason = candidates[0];

    // 5. Si la temporada elegida tiene overview en la lista, úsalo
    //    (TMDB a veces ya incluye overview en la lista de seasons)
    if (targetSeason.overview) return targetSeason.overview;

    // 6. Fetch específico a /tv/{id}/season/{season_number}
    const seasonUrl = new URL(
      `${TMDB_BASE}/tv/${id}/season/${targetSeason.season_number}`,
    );
    seasonUrl.searchParams.set("language", language);

    const sRes = await fetchWithRetry(seasonUrl.toString(), {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    });
    if (!sRes.ok) {
      return tvData.overview || getTmdbSynopsis(id, kind, language);
    }

    const seasonData: TMDBSeasonDetail = await sRes.json();
    return seasonData.overview || tvData.overview || getTmdbSynopsis(id, kind, language);
  } catch (e) {
    logger.warn({ err: e, id }, "Error fetching TMDB specific synopsis");
    return getTmdbSynopsis(id, kind, language);
  }
}

/**
 * Resuelve el season_number de TMDB que coincide con el año/mes de AniList.
 * Útil para obtener artwork o sinopsis específica de una temporada/cour.
 * Lógica equivalente a la búsqueda interna de getTmdbSpecificSynopsis.
 */
async function _resolveTmdbSeasonNumber(
  id: number,
  aniYear?: number | null,
  aniMonth?: number | null,
): Promise<number | null> {
  if (!aniYear) return null;

  try {
    const tvUrl = new URL(`${TMDB_BASE}/tv/${id}`);
    const tvRes = await fetchWithRetry(tvUrl.toString(), {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    });
    if (!tvRes.ok) return null;

    const tvData: TMDBTVDetails = await tvRes.json();
    const seasons = tvData.seasons;
    if (!seasons?.length) return null;

    // Filtrar por año exacto
    let candidates = seasons.filter((s) => {
      if (!s.air_date) return false;
      const y = new Date(s.air_date).getFullYear();
      return !isNaN(y) && y === aniYear;
    });

    // Desempatar por mes si hay múltiples candidatos
    if (candidates.length > 1 && aniMonth) {
      const monthMin = aniMonth - 2;
      const monthMax = aniMonth + 2;
      candidates = candidates.filter((s) => {
        if (!s.air_date) return false;
        const d = new Date(s.air_date);
        const m = d.getMonth() + 1;
        return !isNaN(m) && m >= monthMin && m <= monthMax;
      });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.season_number - b.season_number);
    return candidates[0].season_number;
  } catch (e) {
    logger.warn({ err: e, id }, "Error resolving TMDB season number");
    return null;
  }
}

/**
 * Obtiene imágenes (backdrops, logos, posters) específicas de una temporada/cour
 * desde el endpoint /tv/{id}/season/{season_number}/images de TMDB.
 */
async function _getTmdbSeasonImages(
  id: number,
  seasonNumber: number,
): Promise<{ backdrops?: any[]; logos?: any[]; posters?: any[] } | null> {
  try {
    const url = new URL(
      `${TMDB_BASE}/tv/${id}/season/${seasonNumber}/images`,
    );
    url.searchParams.set("include_image_language", "null,en,ja");

    const res = await fetchWithRetry(url.toString(), {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    logger.warn({ err: e, id, seasonNumber }, "Error fetching TMDB season images");
    return null;
  }
}

export async function tmdbWatchProviders(
  kind: "tv" | "movie",
  id: number,
  region = "MX"
): Promise<ProviderInfo[]> {
  const cacheKey = `providers:${kind}:${id}:${region}`;
  const cached = await hybridCache.get<ProviderInfo[]>(cacheKey);
  if (cached) return cached;

  const url = `${TMDB_BASE}/${kind}/${id}/watch/providers`;
  const res = await fetchWithRetry(url, {
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
  
  await hybridCache.set(cacheKey, normalized, 1000 * 60 * 60 * 12);
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

// ─── Deduplicated exports ────────────────────────────────────────────────────

export const tmdbSearch = withDedup(_tmdbSearch, (kind, query) => `tmdbSearch:${kind}:${query}`);
export const getTmdbImages = withDedup(_getTmdbImages, (id, kind) => `getTmdbImages:${kind}:${id}`);
export const getTmdbSeasonImages = withDedup(_getTmdbSeasonImages, (id, season) => `getTmdbSeasonImages:${id}:S${season}`);
export const resolveTmdbSeasonNumber = withDedup(_resolveTmdbSeasonNumber, (id, y, m) => `resolveTmdbSeasonNumber:${id}:${y}:${m}`);