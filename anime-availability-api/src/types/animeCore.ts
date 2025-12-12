// src/types/anime-core.ts

export type AnimeIds = {
  anilist?: number | null;
  kitsu?: string | null;
  mal?: number | null;
  shikimori?: number | null;
  tmdb?: number | null;
};

export type AnimeTitleSet = {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
};

export type AnimeCoreMeta = {
  format?:
    | "TV"
    | "ONA"
    | "MOVIE"
    | "OVA"
    | "SPECIAL"
    | "TV_SHORT"
    | string
    | null;
  season?: "WINTER" | "SPRING" | "SUMMER" | "FALL" | string | null;
  seasonYear?: number | null;
  episodes?: number | null;

  score?: number | null; // 0..10
  popularity?: number | null; // absoluto
  favourites?: number | null;

  status?:
    | "FINISHED"
    | "RELEASING"
    | "NOT_YET_RELEASED"
    | "CANCELLED"
    | "HIATUS"
    | string
    | null;

  isAdult?: boolean | null;

  genres?: string[];

  studioMain?: string | null;

  startDate?: string | null; // ISO
  nextEpisode?: number | null;
  nextEpisodeAt?: string | null; // ISO
};

export type AnimeCoreSynopses = {
  synopsisHtml?: string | null;
  synopsisText?: string | null;
  synopsisShort?: string | null;
};

export type ArtworkCandidate = {
  url_780: string | null;
  url_1280: string | null;
  url_orig: string | null;
  aspect?: number | null;
  source?: string; // "anilist-banner" | "nekos" | etc.
};

export type AnimeCoreImages = {
  poster: string | null;
  banner: string | null;
  artworkCandidates?: ArtworkCandidate[];
};

export type AnimeCore = {
  ids: AnimeIds;
  title: string; // título principal ya elegido
  titles: AnimeTitleSet;
  images: AnimeCoreImages;
  meta: AnimeCoreMeta;
  synopses: AnimeCoreSynopses;
  providers?: string[]; // luego lo rellenamos con TMDB/Neko/lo que uses
};

export type AniMedia = {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  format?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  averageScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  status?: string | null;
  isAdult?: boolean | null;
  genres?: string[] | null;
  description?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
  } | null;
  bannerImage?: string | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  nextAiringEpisode?: {
    episode?: number | null;
    airingAt?: number | null;
  } | null;
  studios?: {
    edges?:
      | { isMain?: boolean | null; node?: { name?: string | null } | null }[]
      | null;
  } | null;
  externalLinks?: { site?: string | null; url?: string | null }[] | null;
};
