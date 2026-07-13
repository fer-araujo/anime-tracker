// src/services/provider.service.ts
import { preferTitle } from "../utils/title.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { tmdbSearch, tmdbWatchProviders, isAnimeCandidate } from "./tmdb.service.js";
import type { ProviderInfo } from "../types/types.js";

type AniListTitleResp = {
  data?: {
    Media?: {
      id: number;
      format?: string | null;
      title?: {
        romaji?: string | null;
        english?: string | null;
        native?: string | null;
      } | null;
    } | null;
  };
};

function inferKind(format?: string | null): "tv" | "movie" {
  return String(format).toUpperCase() === "MOVIE" ? "movie" : "tv";
}

async function fetchAniListTitleAndKind(
  anilistId: number
): Promise<{ title: string; kind: "tv" | "movie" }> {
  const query = `
    query ($id: Int!) {
      Media(id: $id, type: ANIME) {
        id
        format
        title { romaji english native }
      }
    }
  `;

  const json = await anilistFetch<AniListTitleResp>(query, { id: anilistId });

  if (!json?.data?.Media) {
    throw new Error(`AniList title lookup failed for ${anilistId}`);
  }

  const m = json.data.Media;
  const title = preferTitle(m.title ?? { native: "Untitled" });
  const kind = inferKind(m.format);
  return { title, kind };
}

async function resolveTmdbIdByTitle(
  kind: "tv" | "movie",
  title: string
): Promise<{ tmdbId: number | null }> {
  const hits = await tmdbSearch(kind, title);
  if (!hits || !hits.length) return { tmdbId: null };

  const best = hits.find(isAnimeCandidate) ?? hits[0];
  return { tmdbId: best?.id ?? null };
}

export type GetProvidersResult = {
  title: string;
  tmdbId: number | null;
  providers: string[];
  kind: "tv" | "movie"; // opcional pero útil para debug
};

/**
 * Dado un anilistId y un país, devuelve plataformas (según TMDB).
 * Ahora respeta MOVIE vs TV.
 */
export async function getProvidersForAnime(
  anilistId: number,
  country: string
): Promise<GetProvidersResult> {
  const { title, kind } = await fetchAniListTitleAndKind(anilistId);

  const { tmdbId } = await resolveTmdbIdByTitle(kind, title);
  if (!tmdbId) {
    return { title, tmdbId: null, providers: [], kind };
  }

  const infos: ProviderInfo[] = await tmdbWatchProviders(kind, tmdbId, country);
  const providers = (infos ?? []).map((p) => p.name);

  return { title, tmdbId, providers, kind };
}
