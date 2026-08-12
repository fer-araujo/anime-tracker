/**
 * Step one of two: which anime the community associates with the user's seeds.
 *
 * Ids and vote counts only. The obvious shape — nesting the full card field set
 * under `mediaRecommendation` — multiplies complexity across three levels, and
 * AniList's cap of 500 is not theoretical here: the batch endpoint died on
 * exactly that mistake at fifteen aliases. Step two hydrates the survivors
 * through `ANIME_BATCH_GQL`, so nothing is fetched in full until it has earned
 * a place in the list.
 *
 * Measured before writing the controller: 50 seeds return HTTP 200 and roughly
 * 300 unique candidates, well inside the cap.
 *
 * `perPage: 10` per seed is the knob to turn if that ever changes — losing
 * depth per seed costs less than losing seeds, because agreement between seeds
 * is what the ranking is built on.
 */
export const SEED_RECOMMENDATIONS_GQL = `
  query ($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        recommendations(sort: RATING_DESC, perPage: 10) {
          nodes {
            rating
            mediaRecommendation { id }
          }
        }
      }
    }
  }
`;
