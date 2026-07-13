export function normalizeAnimeFromAnilist(media: {
  id: number;
  idMal?: number | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  description?: string | null;
  coverImage?: { extraLarge?: string | null; large?: string | null } | null;
  bannerImage?: string | null;
  episodes?: number | null;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  nextAiringEpisode?: { airingAt?: number | null } | null;
  genres?: string[] | null;
  studios?: { nodes?: { name?: string | null }[] | null } | null;
  format?: string | null;
}) {
  const nextEpisodeAt = media?.nextAiringEpisode?.airingAt
    ? new Date(media.nextAiringEpisode.airingAt * 1000).toISOString()
    : null;

  return {
    id: media.id,
    malId: media.idMal ?? null,

    title: {
      romaji: media.title?.romaji ?? null,
      english: media.title?.english ?? null,
      native: media.title?.native ?? null,
    },

    synopsis: media.description ?? null,

    artwork: {
      coverImage:
        media.coverImage?.extraLarge || media.coverImage?.large || null,
      bannerImage: media.bannerImage ?? null,
    },

    meta: {
      episodes: media.episodes ?? null,
      status: media.status ?? null,
      season: media.season ?? null,
      seasonYear: media.seasonYear ?? null,
      nextEpisodeAt,
    },

    genres: media.genres ?? [],

    studios:
      media.studios?.nodes?.map((s: { name?: string | null }) => s.name) ?? [],

    format: media.format ?? null,
  };
}
