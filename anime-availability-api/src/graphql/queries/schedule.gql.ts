export const AIRING_SCHEDULE_GQL = `
  query ($greater: Int, $lesser: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(airingAt_greater: $greater, airingAt_lesser: $lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          title { romaji english native }
          coverImage { extraLarge }
          bannerImage
          averageScore
          genres
          status
          episodes
          type
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
        coverImage { extraLarge }
        bannerImage
        averageScore
        genres
        status
        episodes
        type
      }
    }
  }
`;
