export interface AnimeMeta {
  genres?: string[];
  rating?: number | null;
  synopsis?: string | null;
}

export interface AnimeID {
  anilist: number;
  tmdb: number | null;
}

export interface AnimeItem {
  id: AnimeID;
  title: string;
  poster: string | null;
  providers: string[];
  meta?: AnimeMeta;
}

export type ProviderLabel =
  | "Crunchyroll"
  | "Netflix"
  | "HBO Max"
  | "Amazon"
  | "Disney+"
  | "Pirata";

export interface SeasonResponse {
  meta: {
    country: string;
    season: string;
    year: number;
    total: number;
    source: string;
  };
  data: AnimeItem[];
}
export interface SearchResult {
  data?: {
    ids: {
      tmdb: number;
      anilist?: number;
    };
    title: string;
    poster: string;
    providers: string[];
  };
  meta: {
    query: string;
  };
}

export type SearchItem = {
  ids: { tmdb: number | null; mal?: number | null; kitsu?: string | null };
  title: string;
  poster: string | null;
  providers: string[];
  meta?: {
    genres?: string[];
    rating?: number | null;
    synopsis?: string | null;
    episodes?: number | null;
    startDate?: string | null;
  };
};

export type SearchListResponse = {
  meta: { country: string; query: string; total: number; source: string };
  data: SearchItem[];
};
