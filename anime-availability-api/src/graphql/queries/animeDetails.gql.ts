export const ANIME_DETAILS_GQL = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { extraLarge large }
      bannerImage
      description
      episodes
      duration
      status
      season
      seasonYear
      format
      genres
      averageScore
      rankings {
        allTime
        rank
        type
      }
      isAdult
      studios(isMain: true) { edges { isMain node { name } } }
      nextAiringEpisode { episode airingAt }
      startDate { year month day }
      trailer { id site thumbnail }
      streamingEpisodes {
        title
        thumbnail
        url
      }
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english native }
            coverImage { large }
            format
            status
          }
        }
      }
      recommendations(sort: [RATING_DESC], page: 1, perPage: 10) {
        nodes {
          mediaRecommendation {
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
            season
            seasonYear
            isAdult
            nextAiringEpisode { episode airingAt }
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    }
  }
`;
