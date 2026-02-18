// src/utils/tmdb.enrich.ts
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

export function normalizeTitle(raw: string): string {
  if (!raw) return "";
  return (
    raw
      .toLowerCase()
      // 1. Quita "Season X", "Cour X", "Part X"
      .replace(/\b(season|cour|part)\s*\d+\b/gi, "")
      // 2. Quita "2nd Season", "3rd Season", etc.
      .replace(/\b\d+(st|nd|rd|th)\s*season\b/gi, "")
      // 3. Quita subtítulos después de dos puntos (ej: ": The Culling Game")
      .replace(/:\s*.*$/, "")
      // 4. Limpieza general de caracteres raros y espacios dobles
      .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

function pickBestTmdbMatch(
  results: TMDBSearchTVItem[] | undefined,
  title: string,
): TMDBSearchTVItem | undefined {
  if (!results || results.length === 0) return undefined;

  const titleNorm = normalizeTitle(title);

  // Filtramos solo candidatos de anime
  const animeOnly = results.filter(isAnimeCandidate);
  const pool = animeOnly.length ? animeOnly : results;

  // Prioridad 1: Match Exacto (título limpio vs título limpio)
  const exact = pool.find((i) => normalizeTitle(i.name) === titleNorm);
  if (exact) return exact;

  // Prioridad 2: Contenido (si "Jujutsu Kaisen" está dentro del título de AniList)
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
  try {
    tmdbResults = await tmdbSearch(kind, base.title);
  } catch (err) {
    console.warn("[tmdb.enrich] search error:", err);
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
    console.warn("[tmdb.enrich] providers error:", err);
  }

  return {
    ...base,
    poster,
    backdrop,
    providers,
    tmdbId: (best as any).id ?? null,
  };
}
