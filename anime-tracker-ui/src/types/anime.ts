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

export type AnimeCardMeta = {
  genres?: string[];
  rating?: number | null;
  isAdult?: boolean | null;
  nextEpisode?: number | null;
  nextEpisodeAt?: string | null;
};

export type AnimeCardData = {
  id: { anilist: number; tmdb: number | null };
  title: string;
  poster: string | null;
  providers: string[];
  meta?: AnimeCardMeta;
};

