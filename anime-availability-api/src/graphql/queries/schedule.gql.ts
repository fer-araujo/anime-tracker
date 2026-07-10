export const AIRING_SCHEDULE_GQL = `
  query ($greater: Int, $lesser: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(airingAt_greater: $greater, airingAt_lesser: $lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          isAdult
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          episodes
          status
          format
          genres
          averageScore
          seasonYear
          nextAiringEpisode { episode airingAt }
          startDate { year month day }
          studios(isMain: true) { edges { isMain node { name } } }
        }
      }
    }
  }
`;

export const UPCOMING_MEDIA_GQL = `
  query {
    Page(page: 1, perPage: 50) {
      media(type: ANIME, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC], isAdult: false) {
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
        seasonYear
        startDate { year month day }
        studios(isMain: true) { edges { isMain node { name } } }
      }
    }
  }
`;
