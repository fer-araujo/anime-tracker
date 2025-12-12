// src/utils/tmdb.enrich.ts
import type { BaseAnimeInfo, ProviderInfo, TMDBSearchTVItem } from "../types/types.js";
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

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(season|cour|part)\s*\d+\b/gi, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pickBestTmdbMatch(
  results: TMDBSearchTVItem[] | undefined,
  title: string
): TMDBSearchTVItem | undefined {
  if (!results || results.length === 0) return undefined;

  const titleNorm = normalizeTitle(title);

  const animeOnly = results.filter(isAnimeCandidate);
  const pool = animeOnly.length ? animeOnly : results;

  const exact: TMDBSearchTVItem[] = [];
  const starts: TMDBSearchTVItem[] = [];
  const contains: TMDBSearchTVItem[] = [];

  for (const item of pool) {
    // ✅ TV: name/original_name | Movie: title/original_title
    const rawName =
      (item as any).name ||
      (item as any).original_name ||
      (item as any).title ||
      (item as any).original_title ||
      "";

    const nameNorm = normalizeTitle(rawName);
    if (!nameNorm) continue;

    if (nameNorm === titleNorm) exact.push(item);
    else if (nameNorm.startsWith(titleNorm)) starts.push(item);
    else if (nameNorm.includes(titleNorm)) contains.push(item);
  }

  if (exact.length) return exact[0];
  if (starts.length) return starts[0];
  if (contains.length) return contains[0];
  return pool[0];
}

export async function enrichWithTmdb(
  base: BaseAnimeInfo,
  region = "MX",
  opts?: { kind?: "tv" | "movie" }
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
    ((best as any).poster_path ? tmdbPosterUrl((best as any).poster_path, "w780") : undefined);

  const backdrop =
    base.backdrop ??
    ((best as any).backdrop_path ? tmdbBackdropUrl((best as any).backdrop_path, "w1280") : undefined);

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
