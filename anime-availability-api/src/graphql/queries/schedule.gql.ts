import { MEDIA_CARD_FIELDS } from "../fragments/mediaCard.gql.js";

/**
 * `pageInfo.hasNextPage` is new here because the window is no longer a single
 * day. AniList caps `perPage` at 50 and a full week of airings runs to a couple
 * of hundred entries, so a one-page fetch would silently truncate the weekly
 * grid — and truncate it at the *end* of the week, where nothing looks wrong.
 */
export const AIRING_SCHEDULE_GQL = `
  query ($greater: Int, $lesser: Int, $page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $greater, airingAt_lesser: $lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }
  }
`;

export const UPCOMING_MEDIA_GQL = `
  query ($page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(type: ANIME, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC], isAdult: false) {
        ${MEDIA_CARD_FIELDS}
      }
    }
  }
`;
