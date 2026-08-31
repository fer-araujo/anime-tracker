import type { Anime } from "@/types/anime";

/**
 * What the recommendation endpoint needs to know about the user, and what it
 * sends back.
 *
 * The API deliberately does not read `user_anime` itself. It holds a Supabase
 * service-role key — `getAnimeRating` uses it — and that key bypasses RLS, so
 * reading a user's library with it would mean the API had to authenticate the
 * request on its own to avoid serving somebody else's list. The client already
 * has this data loaded and already goes through RLS to get it, so it sends it.
 */

/** One anime the user has signalled they like. */
export type Seed = {
  animeId: number;
  favorite: boolean;
  /** 0..10, or null when the user hearted something without rating it. */
  score: number | null;
};

/**
 * Everything the ranking consults about the user's library.
 *
 * `excludedIds` is deliberately broad: anything tracked, listed or dismissed.
 * A recommendation the user has already acted on is not a recommendation.
 */
export type RecommendationLibrary = {
  seeds: Seed[];
  excludedIds: number[];
  completedIds: number[];
};

export type RecommendationsResponse = {
  meta: {
    seedCount: number;
    minSeeds: number;
    enough: boolean;
    candidates?: number;
  };
  data: Anime[];
};
