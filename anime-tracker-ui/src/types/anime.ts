export type Anime = {
  id: { anilist: number; tmdb: number | null };
  title: string;
  poster: string | null;
  backdrop?: string | null;
  banner?: string | null;
  providers: string[];
  meta?: {
    genres?: string[];
    rating?: number | null; // 0..10
    synopsis?: string | null;
    year?: number | null;
    season?: string | null;
    popularity?: number | null;
    favourites?: number | null;
    score?: number | null; // 0..10
    startDate?: string | null; // fecha ISO
    isAdult?: boolean;
    isNew?: boolean;
    status?: "ongoing" | "finished";
    studio?: string | null;
    type?: string | null; // TV / ONA / Movie / OVA / Special ...
    episodes?: number | null;
    progress?: number | null; // vistos
    nextAiring?: string | null; // e.g. "in 6 days" (texto ya formateado)
    nextEpisodeAt?: string | null; // fecha ISO del próximo episodio
  };
};

export type AnimeCardProps = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
  onAddToList?: (anime: Anime) => void;
  onToggleFavorite?: (anime: Anime, next: boolean) => void;
  variant?: "default" | "compact";
  showTitleBelow?: boolean; // título fuera del card
  overlayTone?: "soft" | "strong"; // tono manual base
  autoContrast?: boolean; // detectar pósters claros automáticamente
};
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
