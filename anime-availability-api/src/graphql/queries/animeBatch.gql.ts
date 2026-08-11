import { MEDIA_CARD_FIELDS } from "../fragments/mediaCard.gql.js";

/**
 * Batch lookup by id.
 *
 * This replaced a query built from one aliased `Media(id:)` selection per id,
 * which broke the lists page outright. AniList caps query complexity at 500 and
 * each alias cost 35, so the request died at **fifteen ids** — while the
 * endpoint advertised fifty:
 *
 *   HTTP 400 {"errors":[{"message":"Max query complexity should be 500
 *                        but got 525.","status":400}],"data":null}
 *
 * `anilistFetch` maps any non-ok response to `null`, the controller maps that
 * to 503, and the page rendered with no posters at all. Fourteen ids worked,
 * fifteen did not — verified against the live API. The ceiling was never
 * expressed anywhere in the code, so the endpoint's own `BATCH_MAX_IDS = 50`
 * was a promise it could not keep.
 *
 * Aliases have a second cliff worth recording, since it is the reason not to go
 * back to them: if any one id does not resolve, AniList answers HTTP 404 and
 * nulls *every* sibling alias, not just the missing one — a query for Cowboy
 * Bebop plus a dead id returns null for Cowboy Bebop too.
 *
 * `id_in` has neither problem. Fifty ids with this full field set return 200
 * (measured), unknown ids are simply absent from the result rather than fatal,
 * and the query is one selection instead of fifty. It also lets the batch share
 * the field set every other card endpoint uses, which is why `source`,
 * `popularity`, `favourites` and `externalLinks` were arriving null here while
 * being populated everywhere else.
 *
 * `perPage: 50` matches the caller's id ceiling and AniList's maximum page
 * size, so a single page always covers a full batch.
 */
export const ANIME_BATCH_GQL = `
  query ($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        ${MEDIA_CARD_FIELDS}
      }
    }
  }
`;
