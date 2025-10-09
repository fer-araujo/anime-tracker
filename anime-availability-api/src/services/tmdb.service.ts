import axios from "axios";
import { ENV } from "../config/env.js";

const TMDB = "https://api.themoviedb.org/3";

// src/services/tmdb.service.ts
export type TMDBSearchTVItem = {
  id: number;
  name?: string;
  original_name?: string;
  poster_path?: string | null;
  first_air_date?: string | null;
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
};


export type TMDBProviders = {
  flatrate?: { provider_name: string }[];
  rent?: { provider_name: string }[];
  buy?: { provider_name: string }[];
};

export async function tmdbSearchTV(query: string): Promise<TMDBSearchTVItem[]> {
  if (!query?.trim()) return [];
  const { data } = await axios.get(`${TMDB}/search/tv`, {
    params: {
      api_key: ENV.TMDB_KEY,
      query,
      include_adult: false,
      language: "en-US"
    }
  });
  return data?.results ?? [];
}


export async function tmdbTVProviders(tvId: number, country: string): Promise<TMDBProviders | null> {
  const { data } = await axios.get(`${TMDB}/tv/${tvId}/watch/providers`, {
    params: { api_key: ENV.TMDB_KEY }
  });
  return data?.results?.[country] ?? null;
}

export function tmdbPosterUrl(path?: string | null, size: "w185" | "w342" | "w500" = "w500"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
