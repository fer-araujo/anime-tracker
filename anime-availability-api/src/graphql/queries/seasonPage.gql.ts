const SEASON_PAGE_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large }
  bannerImage
  description
  episodes
  status
  format
  genres
  averageScore
  nextAiringEpisode { episode airingAt }
  startDate { year month day }
  studios(isMain: true) { edges { isMain node { name } } }
`;

export function buildSeasonPageQuery(isPopularYearQuery: boolean): string {
  const seasonFilter = isPopularYearQuery ? "" : "season: $season,";
  const seasonVarDecl = isPopularYearQuery ? "" : "$season: MediaSeason, ";

  return `
    query (${seasonVarDecl}$seasonYear: Int, $page: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: 50) {
        media(${seasonFilter} seasonYear: $seasonYear, type: ANIME, sort: $sort, isAdult: false) {
          ${SEASON_PAGE_FIELDS}
        }
      }
    }
  `;
}
