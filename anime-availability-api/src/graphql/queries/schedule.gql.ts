export const AIRING_TODAY_GQL = `
  query ($greater: Int, $lesser: Int) {
    Page(page: 1, perPage: 20) {
      airingSchedules(airingAt_greater: $greater, airingAt_lesser: $lesser, sort: TIME) {
        episode
        airingAt
        media {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          genres
          averageScore
          seasonYear
          status
          format
          studios(isMain: true) { edges { isMain node { name } } }
        }
      }
    }
  }
`;

export const COMING_SOON_GQL = `
  query {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC]) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        bannerImage
        description
        genres
        averageScore
        seasonYear
        status
        format
        studios(isMain: true) { edges { isMain node { name } } }
      }
    }
  }
`;
