/**
 * Shapes for the recommendation engine.
 *
 * Ranking and selection are two separate steps on purpose. Ranking needs only
 * ids and numbers, so it runs before anything is fetched; selection needs
 * genres and relations, which only exist after the surviving candidates are
 * hydrated. Splitting them keeps a second AniList round-trip off the path for
 * every candidate that was never going to make the cut.
 */

/** One anime the user has signalled they like. */
export type Seed = {
  animeId: number;
  favorite: boolean;
  /** 0..10, or null when the user marked a favourite without rating it. */
  score: number | null;
};

/** One "if you liked A, try B" association, as AniList reports it. */
export type RawRecommendation = {
  /** The seed this came from. */
  seedId: number;
  /** The anime being recommended. */
  animeId: number;
  /** AniList community votes for this specific association. */
  rating: number;
};

/** A candidate with its accumulated weight and where that weight came from. */
export type ScoredCandidate = {
  animeId: number;
  weight: number;
  /**
   * The seed that contributed the most weight. Used to cap how much of the
   * final list any single favourite can claim.
   */
  topSeedId: number;
  /** How many distinct seeds recommended this. Kept for debugging and tests. */
  seedCount: number;
};

/** What selection needs to know about a candidate, filled in after hydration. */
export type CandidateFacts = {
  genres: string[];
  /** The earlier entry this continues, if any. */
  continuationOfId: number | null;
};

/** The user's library, reduced to the id sets ranking and selection consult. */
export type UserLibrary = {
  /** Anything already tracked, listed or dismissed — never recommend these. */
  excludedIds: Set<number>;
  /** Tracked with status `completed`. A sequel to one of these is a good bet. */
  completedIds: Set<number>;
};
