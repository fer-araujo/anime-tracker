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

/** Regex para detectar si un título de AniList corresponde a una nueva temporada.
 *  Matches: "2nd Season", "Season 3", "Final Season", "Temporada 2"
 *  NO matches: "Part 2", "Cour 2", "Arc 2" (esos comparten TMDB season_number) */
const SEASON_SEQUEL_RE =
  /\d+(st|nd|rd|th)? season|season \d+|final season|temporada \d+|final temporada/i;

/**
 * Detecta si el título indica una temporada/secuela específica (no cour/part).
 * Útil para que resolveHeroArtwork decida si debe buscar logos específicos
 * de temporada en TMDB. Solo retorna true para temporadas completas
 * ("Season 2", "Temporada 3"), no para cours o partes.
 */
export function isSeasonSequel(title: string): boolean {
  if (!title) return false;
  return SEASON_SEQUEL_RE.test(title);
}

/**
 * Search candidates for TMDB, ordered from most faithful to most permissive.
 *
 * Stripping punctuation is not free: TMDB indexes titles as written, so
 * "jojo's" and "jojos" are different queries and only the first one matches.
 * That cost us every apostrophised title — JoJo's Bizarre Adventure, Kino's
 * Journey, Girls' Last Tour all reported no legal provider, because the search
 * that would have found them was never issued. We were asking TMDB for a title
 * we had corrupted ourselves.
 *
 * The stripped form still earns its place as a fallback, for when AniList and
 * TMDB punctuate the same title differently (dashes, interpuncts, stylised
 * marks). It just can't be the only attempt.
 */
export function getTitleVariations(title: string): string[] {
  if (!title) return [];

  let clean = title.toLowerCase();
  clean = clean.replace(
    /\s*(\d+(st|nd|rd|th)? season|season \d+|final season|part \d+|cour \d+).*$/i,
    "",
  );

  const variations = new Set<string>();

  // Variación A: Título tal cual lo indexa TMDB, con puntuación intacta.
  const verbatim = clean.replace(/\s+/g, " ").trim();
  if (verbatim) variations.add(verbatim);

  // Variación B: Sin puntuación — cubre las discrepancias de estilo entre
  // AniList y TMDB, pero solo después de haber intentado el título real.
  const fullTitle = clean
    .replace(/[\/\-\:]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (fullTitle) variations.add(fullTitle);

  // Variación C: Recorte antes del ':' (Para "Yu Yu Hakusho: Ghostfiles").
  // Se emiten ambas formas por la misma razón que arriba — sin esto,
  // "Kino's Journey: The Beautiful World" se recortaría a "kinos journey".
  if (clean.includes(":")) {
    const head = clean.split(":")[0];

    const headVerbatim = head.replace(/\s+/g, " ").trim();
    if (headVerbatim) variations.add(headVerbatim);

    const headStripped = head
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (headStripped) variations.add(headStripped);
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
      logger.warn(
        { err },
        `[tmdb.enrich] Error buscando la variante "${variant}"`,
      );
    }
  }

  if (!tmdbResults?.length) return { ...base, tmdbId: null };

  const best = pickBestTmdbMatch(tmdbResults, base.title);
  if (!best) return { ...base, tmdbId: null };

  const poster =
    base.poster ??
    (best.poster_path ? tmdbPosterUrl(best.poster_path, "w780") : undefined);

  const backdrop =
    base.backdrop ??
    (best.backdrop_path
      ? tmdbBackdropUrl(best.backdrop_path, "w1280")
      : undefined);

  let providers: ProviderInfo[] | undefined = base.providers;

  try {
    if (best.id) {
      const provList = await tmdbWatchProviders(kind, best.id, region);
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
    tmdbId: best.id ?? null,
  };
}
