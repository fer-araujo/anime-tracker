import { MEDIA_CARD_FIELDS } from "../fragments/mediaCard.gql.js";

export const HOME_HERO_GQL = `
  query ($season: MediaSeason, $seasonYear: Int) {
    Page(page: 1, perPage: 5) {
      media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: [SCORE_DESC], isAdult: false) {
        ${MEDIA_CARD_FIELDS}
      }
    }
  }
`;
