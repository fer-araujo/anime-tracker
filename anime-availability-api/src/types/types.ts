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
  score?: number; // 0..10
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
      ads?: Array<{ provider_id: number; provider_name: string }>;
    }
  >;
}

export interface AniListMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  episodes?: number;
  status?: string; // RELEASING | FINISHED | NOT_YET_RELEASED...
  season?: string; // WINTER | SPRING | SUMMER | FALL
  seasonYear?: number;
  coverImage?: { large?: string; medium?: string };
  averageScore?: number; // 0..100
  genres?: string[];
  description?: string | null;
  isAdult?: boolean;
  startDate?: { year?: number; month?: number; day?: number } | null;
  nextAiringEpisode?: { episode?: number; airingAt?: number } | null;
}

export interface SearchOptions {
  query: string;
  region?: string;
  limit?: number; // 5..15
  cursor?: string;
  providersForTop?: number;
}

export type AniTitle = { romaji?: string; english?: string; native?: string };

export interface AniMedia {
  id: number;
  title: AniTitle;
  episodes?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  coverImage?: { large?: string; medium?: string };
  averageScore?: number;
  genres?: string[];
  description?: string | null;
  isAdult?: boolean;
  startDate?: { year?: number; month?: number; day?: number } | null;
  nextAiringEpisode?: { episode?: number; airingAt?: number } | null;
  format?: string;
  studios: any;
  
  // campo auxiliar opcional para fallback TMDB en search
  __tmdb__?: TMDBSearchTVItem;
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
  genres?: string[];
  synopsis?: string | null;
  startDateISO?: string | null;
  isAdult?: boolean;
  nextEpisode?: number;
  nextEpisodeAtISO?: string | null;
  type: string | null;
  studio: string | null;
}

export interface SearchResponse {
  query: string;
  region: string;
  page: { size: number; hasNext: boolean; cursor?: string };
  results: SearchResultItem[];
}

export type Enrichment = {
  synopsis?: string | null;
  rating?: number | null; // 0..10
  genres?: string[];
  episodes?: number | null;
  startDate?: string | null;
  posterAlt?: string | null;
  sources: {
    mal?: { id?: number | string; title?: string } | null;
    kitsu?: { id?: string | number; title?: string } | null;
  };
};
