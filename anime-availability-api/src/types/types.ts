export type AiringStatus = "ongoing" | "finished" | "announced";

export interface ProviderInfo {
  id: number;
  name: string;
}

export interface BaseAnimeInfo {
  id: number | string;
  title: string;
  year?: number;
  season?: string;
  episodes?: number;
  airingStatus?: AiringStatus;
  poster?: string;
  providers?: ProviderInfo[];
  score?: number;
}

export interface TMDBSearchTVItem {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];
  original_language?: string;
  overview?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
}

export interface TMDBProvidersResponse {
  id: number;
  results: Record<
    string,
    {
      flatrate?: Array<{ provider_id: number; provider_name: string }>;
      buy?: Array<{ provider_id: number; provider_name: string }>;
      rent?: Array<{ provider_id: number; provider_name: string }>;
      free?: Array<{ provider_id: number; provider_name: string }>;
    }
  >;
}

export interface AniListMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  episodes?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  coverImage?: { large?: string; medium?: string };
  averageScore?: number;
}

export interface SearchOptions {
  query: string;
  region?: string; // affects providers only
  limit?: number; // 5..15
  cursor?: string; // opaque cursor for "ver más"
  providersForTop?: number; // default 3 in first page
}

export type AniTitle = { romaji?: string; english?: string; native?: string };

export interface AniMedia {
  id: number;
  title: AniTitle;
  episodes?: number;
  status?: string; // RELEASING | FINISHED | NOT_YET_RELEASED | ...
  season?: string; // WINTER | SPRING | SUMMER | FALL
  seasonYear?: number;
  coverImage?: { large?: string; medium?: string };
  averageScore?: number; // 0..100
}

export interface AniPage {
  pageInfo: { hasNextPage: boolean; currentPage: number };
  media: AniMedia[];
}

export interface SearchResultItem extends BaseAnimeInfo {
  idMap: {
    tmdb?: number;
    anilist?: number;
    mal?: number | string;
    kitsu?: string;
  };
  titles: AniTitle;
}

export interface SearchResponse {
  query: string;
  region: string;
  page: { size: number; hasNext: boolean; cursor?: string };
  results: SearchResultItem[];
}

export type Enrichment = {
  synopsis?: string | null;
  rating?: number | null; // 0..10 (preferimos MAL.score; luego Kitsu.score)
  genres?: string[]; // (no disponible en nuestros services actuales)
  episodes?: number | null; // si algún service lo trae
  startDate?: string | null; // (no disponible ahora)
  posterAlt?: string | null; // poster alterno si no hay TMDB
  sources: {
    mal?: { id?: number | string; title?: string } | null;
    kitsu?: { id?: string | number; title?: string } | null;
  };
};

