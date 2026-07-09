// src/utils/tmdb.enrich.ts
import { logger } from "../utils/logger.js";
import type {
  BaseAnimeInfo,
  ProviderInfo,
  TMDBSearchTVItem,
} from "../types/types.js";
import {
  tmdbSearch,
  tmdbPosterUrl,
  tmdbBackdropUrl,
  tmdbWatchProviders,
  isAnimeCandidate,
} from "../services/tmdb.service.js";

export type TmdbEnrichedInfo = BaseAnimeInfo & {
  tmdbId?: number | null;
};

// 1. Normalizador base (Mantenido por compatibilidad y para hacer match)
export function normalizeTitle(title: string): string {
  if (!title) return "";
  let clean = title.toLowerCase();

  clean = clean.replace(
    /\s*(\d+(st|nd|rd|th)? season|season \d+|final season|part \d+|cour \d+).*$/i,
    "",
  );
  clean = clean.replace(/[\/\-\:]/g, " ");
  clean = clean.replace(/[^\w\s]/g, "");
  return clean.replace(/\s+/g, " ").trim();
}

/** Regex para detectar si un título de AniList corresponde a una secuela/season/cour */
const SEASON_SEQUEL_RE =
  /\d+(st|nd|rd|th)? season|season \d+|final season|part \d+|cour \d+/i;

/**
 * Detecta si el título indica una temporada/secuela específica.
 * Útil para que resolveHeroArtwork decida si debe priorizar assets
 * nativos de AniList sobre los del TV Show padre en TMDB.
 */
export function isSeasonSequel(title: string): boolean {
  if (!title) return false;
  return SEASON_SEQUEL_RE.test(title);
}

// 2. NUEVO: Generador de cascada inteligente (El corta-subtítulos)
export function getTitleVariations(title: string): string[] {
  if (!title) return [];

  let clean = title.toLowerCase();
  clean = clean.replace(
    /\s*(\d+(st|nd|rd|th)? season|season \d+|final season|part \d+|cour \d+).*$/i,
    "",
  );

  const variations = new Set<string>();

  // Variación A: Título completo limpio (Para "Bleach Thousand Year Blood War")
  const fullTitle = clean
    .replace(/[\/\-\:]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (fullTitle) variations.add(fullTitle);

  // Variación B: Título recortado antes del ':' (Para "Yu Yu Hakusho: Ghostfiles")
  if (clean.includes(":")) {
    const splitTitle = clean
      .split(":")[0]
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (splitTitle) variations.add(splitTitle);
  }

  return Array.from(variations);
}

function pickBestTmdbMatch(
  results: TMDBSearchTVItem[] | undefined,
  title: string,
): TMDBSearchTVItem | undefined {
  if (!results || results.length === 0) return undefined;

  const titleNorm = normalizeTitle(title);
  const animeOnly = results.filter(isAnimeCandidate);
  const pool = animeOnly.length ? animeOnly : results;

  const exact = pool.find((i) => normalizeTitle(i.name) === titleNorm);
  if (exact) return exact;

  const contains = pool.find((i) => {
    const tName = normalizeTitle(i.name);
    return titleNorm.includes(tName) || tName.includes(titleNorm);
  });

  if (contains) return contains;
  return pool[0];
}

export async function enrichWithTmdb(
  base: BaseAnimeInfo,
  region = "MX",
  opts?: { kind?: "tv" | "movie" },
): Promise<TmdbEnrichedInfo> {
  if (!base?.title) return { ...base };

  const kind = opts?.kind ?? "tv";
  let tmdbResults: TMDBSearchTVItem[] = [];

  // 3. LA MAGIA EN ACCIÓN: Probamos la cascada de títulos
  const titleVariants = getTitleVariations(base.title);

  for (const variant of titleVariants) {
    try {
      const results = await tmdbSearch(kind, variant);
      if (results && results.length > 0) {
        tmdbResults = results;
        logger.info(`[tmdb.enrich] Éxito con la variación: "${variant}"`);
        break; // Si TMDB encuentra algo, rompemos el ciclo
      }
    } catch (err) {
      logger.warn({ err }, `[tmdb.enrich] Error buscando la variante "${variant}"`);
    }
  }

  if (!tmdbResults?.length) return { ...base, tmdbId: null };

  const best = pickBestTmdbMatch(tmdbResults, base.title);
  if (!best) return { ...base, tmdbId: null };

  const poster =
    base.poster ??
    ((best as any).poster_path
      ? tmdbPosterUrl((best as any).poster_path, "w780")
      : undefined);

  const backdrop =
    base.backdrop ??
    ((best as any).backdrop_path
      ? tmdbBackdropUrl((best as any).backdrop_path, "w1280")
      : undefined);

  let providers: ProviderInfo[] | undefined = base.providers;

  try {
    if ((best as any).id) {
      const provList = await tmdbWatchProviders(kind, (best as any).id, region);
      if (Array.isArray(provList) && provList.length) providers = provList;
    }
  } catch (err) {
    logger.warn({ err }, "[tmdb.enrich] providers error");
  }

  return {
    ...base,
    poster,
    backdrop,
    providers,
    tmdbId: (best as any).id ?? null,
  };
}
