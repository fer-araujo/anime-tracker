// --- NUEVOS TIPOS PARA LA PÁGINA DE DETALLES ---
export type FranchiseItem = {
  id: number;
  relationType: string;
  title: string;
  poster: string | null;
  type: string;
};

export type StreamingEpisode = {
  title: string;
  thumbnail: string | null;
  url: string;
};

export type ranking = {
  rank: number;
  type: string;
};

// --- TUS TIPOS ORIGINALES (AUMENTADOS) ---
export type Anime = {
  id: { anilist: number; tmdb: number | null };
  title: string;
  subtitle?: string | null; // <-- NUEVO
  providers: string[];
  images: {
    artworkCandidates?: ArtworkCandidate[];
    banner?: string | null;
    backdrop?: string | null;
    logo?: string | null;
    poster?: string | null;
  };

  franchise?: FranchiseItem[]; // <-- NUEVO
  episodesData?: StreamingEpisode[]; // <-- NUEVO

  meta?: {
    genres?: string[];
    rating?: number | null; // 0..10
    synopsis?: string | null;
    synopsisShort?: string | null;
    synopsisHTML?: string | null;
    year?: number | null;
    season?: string | null;
    popularity?: number | null;
    favourites?: number | null;
    score?: number | null; // 0..10
    startDate?: string | null; // fecha ISO
    isAdult?: boolean;
    isNew?: boolean;
    ranking?: ranking | null; // ranking global de popularidad
    recommendations?: Anime[]; // <-- Lo mantenemos aquí donde tú lo tenías
    status?:
      | "RELEASING"
      | "FINISHED"
      | "NOT_YET_RELEASED"
      | "CANCELLED"
      | "HIATUS"
      | "COMPLETED";
    studio?: string | null;
    type?: string | null; // TV / ONA / Movie / OVA / Special ...
    trailer?: string | null;
    episodes?: number | null;
    duration?: number | null; // <-- NUEVO
    progress?: number | null; // vistos
    nextAiring?: string | null; // e.g. "in 6 days" (texto ya formateado)
    nextEpisodeAt?: number; // fecha ISO del próximo episodio
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
  synopsisHTML?: string | null;
  synopsis?: string | null;
  synopsisShort?: string | null;
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

export type ArtworkCandidate = {
  lang: string | null;
  source: "anilist-cover" | "anilist-banner" | "tmdb-poster" | "tmdb-backdrop";
  votes: number;
  rating: number;
  aspect: number | null;
  width: number | null;
  height: number | null;
  url_780: string | null;
  url_1280: string | null;
  url_orig?: string | null;
  url_original?: string | null;
};
