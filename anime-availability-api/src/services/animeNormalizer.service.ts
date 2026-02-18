export function normalizeAnimeFromAnilist(media: any) {
  const nextEpisodeAt =
    media?.nextAiringEpisode?.airingAt
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
        media.coverImage?.extraLarge ||
        media.coverImage?.large ||
        null,
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
      media.studios?.nodes?.map((s: any) => s.name) ?? [],

    format: media.format ?? null,
  };
}
