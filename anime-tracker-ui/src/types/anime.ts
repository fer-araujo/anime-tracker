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
  id: {
    anilist: number;
    tmdb: number | null;
    mal?: number | string | null;
    kitsu?: number | string | null;
  };
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
    synopsisLang?: "es" | "en" | null;
    // The backend emits `synopsisHtml`; this was declared `synopsisHTML`, so
    // the property could never match and always read as undefined.
    synopsisHtml?: string | null;
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
  animeEntry?: AnimeEntry | null;
  variant?: "default" | "compact";
  showTitleBelow?: boolean; // título fuera del card
  overlayTone?: "soft" | "strong"; // tono manual base
  autoContrast?: boolean; // detectar pósters claros automáticamente
  listCount?: number; // si > 0, muestra "Añadir (N)" en el botón
};

export type ProviderLabel =
  "Crunchyroll" | "Netflix" | "HBO Max" | "Amazon" | "Disney+" | "Pirata";

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

// --- Tracking types ---
export type TrackingStatus =
  "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped";

export type AnimeEntry = {
  id: string;
  user_id: string;
  anime_id: number;
  /**
   * Optional: a row means "this anime means something to me", and where it sits
   * in the library is a separate question from whether it is a favourite or has
   * a score. Marking something a favourite must not have to claim you plan to
   * watch it.
   */
  status: TrackingStatus | null;
  favorite: boolean;
  score: number | null;
  progress: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
