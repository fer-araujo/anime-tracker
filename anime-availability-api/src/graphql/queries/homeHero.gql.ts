export const HOME_HERO_GQL = `
  query {
    Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: [POPULARITY_DESC], status: RELEASING) {
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
      }
    }
  }
`;
