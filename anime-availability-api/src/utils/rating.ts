/**
 * Bayesian weighted average — industry standard (IMDb, Rotten Tomatoes).
 *
 * Formula: WR = (v / (v+m)) × R + (m / (v+m)) × C
 *
 * Where:
 *   v = number of user votes
 *   m = minimum votes required (default 10)
 *   R = average of user votes
 *   C = global mean of all items
 *
 * With few votes, the score pulls toward the global mean,
 * protecting against manipulation. As votes increase,
 * it converges to the true community rating.
 */
export function bayesianAverage(
  userAverage: number,
  userVotes: number,
  globalAverage: number,
  minVotes: number = 10,
): number {
  return (
    (userVotes / (userVotes + minVotes)) * userAverage +
    (minVotes / (userVotes + minVotes)) * globalAverage
  );
}
