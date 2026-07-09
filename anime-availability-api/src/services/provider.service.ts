// src/services/provider.service.ts
import { preferTitle } from "../utils/title.js";
import { ENV } from "../config/env.js";
import { tmdbSearch, tmdbWatchProviders, isAnimeCandidate } from "./tmdb.service.js";
import type { ProviderInfo } from "../types/types.js";

type AniListTitleResp = {
  data?: {
    Media?: {
      id: number;
      format?: string | null; // 👈 para decidir tv/movie
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

  const body = { query, variables: { id: anilistId } };

  const res = await fetch(ENV.ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`AniList title error ${res.status}`);
  }

  const json = (await res.json()) as AniListTitleResp;
  const media = json.data?.Media;
  if (!media) throw new Error("AniList: Media not found");

  return {
    title: preferTitle(media.title ?? { native: "Untitled" }),
    kind: inferKind(media.format),
  };
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
