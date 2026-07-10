export const HOME_HERO_GQL = `
  query ($season: MediaSeason, $seasonYear: Int) {
    Page(page: 1, perPage: 5) {
      media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: [SCORE_DESC], isAdult: false) {
        id
        title { romaji english native }
        coverImage { extraLarge }
        bannerImage
        description
        episodes
        genres
        averageScore
        seasonYear
        startDate { year month day }
        status
        studios(isMain: true) { edges { isMain node { name } } }
        trailer { id site }
        type
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;
