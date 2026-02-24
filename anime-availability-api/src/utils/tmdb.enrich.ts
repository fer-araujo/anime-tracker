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

export function normalizeTitle(title: string): string {
  if (!title) return "";

  let clean = title.toLowerCase();

  // 1. GUILLOTINA: Si encuentra "season X", "Xth season", "part X", "cour X" o "final season",
  // corta esa palabra Y TODO lo que haya después de ella (.*$)
  clean = clean.replace(
    /\s*(\d+(st|nd|rd|th)? season|season \d+|final season|part \d+|cour \d+).*$/i,
    "",
  );

  // 2. Cambiar slashes, guiones y dos puntos por espacios
  // (Esto arregla: "Fate/stay night" -> "fate stay night", "Re:Zero" -> "Re Zero")
  clean = clean.replace(/[\/\-\:]/g, " ");

  // 3. Quitar caracteres especiales extraños (!, ?, [], etc)
  // (Esto deja las películas limpias como "fate stay night heavens feel i presage flower")
  clean = clean.replace(/[^\w\s]/g, "");

  // 4. Limpiar espacios dobles que hayan quedado
  return clean.replace(/\s+/g, " ").trim();
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
