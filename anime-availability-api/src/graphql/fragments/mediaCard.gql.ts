/**
 * The field set every card-producing endpoint asks AniList for.
 *
 * Season, schedule and the home hero each carried their own hand-copied list of
 * fields, and they had already drifted: `seasonYear` was missing from the season
 * query, `format` from the hero, `duration` from all three. That last one was
 * not cosmetic — `formatAnimeList` reads `anime.duration` and maps it into
 * `meta.duration`, so every season card has been serving `null` for a field the
 * formatter was perfectly capable of filling.
 *
 * Adding six more fields to three separate string literals would have
 * guaranteed the next divergence, so the list lives here once. Callers that
 * need extra fields concatenate rather than fork.
 *
 * On cost: AniList bills by request, not by field, and every caller here
 * already runs exactly one query. Widening the selection is free; it is the
 * per-item enrichment in `formatAnimeList` that costs, and that is unchanged.
 */
export const MEDIA_CARD_FIELDS = `
  id
  isAdult
  title { romaji english native }
  coverImage { extraLarge large }
  bannerImage
  description
  format
  type
  status
  genres
  episodes
  duration
  averageScore
  popularity
  favourites
  season
  seasonYear
  source
  startDate { year month day }
  nextAiringEpisode { episode airingAt }
  studios(isMain: true) { edges { isMain node { name } } }
  trailer { id site }
  externalLinks { site url type color icon }
  relations {
    edges {
      relationType
      node { id type title { romaji english native } }
    }
  }
`;
