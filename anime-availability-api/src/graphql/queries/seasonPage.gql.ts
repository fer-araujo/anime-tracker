import { MEDIA_CARD_FIELDS } from "../fragments/mediaCard.gql.js";

export function buildSeasonPageQuery(isPopularYearQuery: boolean): string {
  const seasonFilter = isPopularYearQuery ? "" : "season: $season,";
  const seasonVarDecl = isPopularYearQuery ? "" : "$season: MediaSeason, ";

  return `
    query (${seasonVarDecl}$seasonYear: Int, $page: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: 50) {
        media(${seasonFilter} seasonYear: $seasonYear, type: ANIME, sort: $sort, isAdult: false) {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }
  `;
}

/**
 * Series still airing that belong to an *earlier* season.
 *
 * A season query filters on `season` + `seasonYear`, so by construction it can
 * never return a show that started before the season being viewed — even though
 * that show is still airing new episodes during it. Two-cour series, long
 * runners and anything that slipped its schedule all fall through this gap, and
 * the season page reads as incomplete for reasons that look like missing data
 * rather than a filter.
 *
 * The caller excludes whatever the season query already returned; AniList has no
 * "not in this season" filter, so the deduplication happens on our side.
 */
export const LEFTOVER_MEDIA_GQL = `
  query ($page: Int) {
    Page(page: $page, perPage: 50) {
      media(status: RELEASING, type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
        ${MEDIA_CARD_FIELDS}
      }
    }
  }
`;

/**
 * One year of the archive in a single request.
 *
 * Four aliased `Page` selections, each asking for `pageInfo.total` (the count
 * the archive grid prints) and exactly one media (the cover art it prints it
 * over). Aliases matter here: AniList is rate-limited to 25 requests/minute
 * globally in this app, so a naive query-per-season would spend four slots per
 * year and a full archive would exhaust the window before it finished.
 */
export const SEASON_ARCHIVE_GQL = `
  query ($year: Int) {
    WINTER: Page(page: 1, perPage: 1) {
      pageInfo { total }
      media(season: WINTER, seasonYear: $year, type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
        id
        title { romaji english }
        coverImage { extraLarge large }
        bannerImage
      }
    }
    SPRING: Page(page: 1, perPage: 1) {
      pageInfo { total }
      media(season: SPRING, seasonYear: $year, type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
        id
        title { romaji english }
        coverImage { extraLarge large }
        bannerImage
      }
    }
    SUMMER: Page(page: 1, perPage: 1) {
      pageInfo { total }
      media(season: SUMMER, seasonYear: $year, type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
        id
        title { romaji english }
        coverImage { extraLarge large }
        bannerImage
      }
    }
    FALL: Page(page: 1, perPage: 1) {
      pageInfo { total }
      media(season: FALL, seasonYear: $year, type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
        id
        title { romaji english }
        coverImage { extraLarge large }
        bannerImage
      }
    }
  }
`;
