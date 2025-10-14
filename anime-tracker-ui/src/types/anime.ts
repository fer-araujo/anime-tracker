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
