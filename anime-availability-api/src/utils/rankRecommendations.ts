import type {
  CandidateFacts,
  RawRecommendation,
  ScoredCandidate,
  Seed,
  UserLibrary,
} from "../types/recommendations.js";

/**
 * Ranking and selection for the recommendation page.
 *
 * Everything here is pure and network-free. That is deliberate: this file holds
 * every judgement the feature makes about what is worth suggesting, and none of
 * it should require an AniList round-trip to test.
 */

/* -------------------------------------------------------------------------- */
/*  Weights                                                                    */
/* -------------------------------------------------------------------------- */

/** Below this, a rating is not an endorsement worth acting on. */
const MIN_SCORE_BONUS_AT = 7;

/**
 * How strongly one seed argues for a recommendation.
 *
 * A favourite counts for more than a plain entry, and a high score raises it
 * further, but the range stays narrow — 1 to 2.5. A wider spread would let a
 * single perfect-scored favourite outvote three merely-loved ones, and the
 * point of using several seeds is that agreement between them means something.
 *
 * A favourite with no score is not treated as an implicit 8: the user chose the
 * heart and skipped the number, and inventing the number they did not give is
 * how a recommendation ends up justified by data that never existed.
 */
export function seedWeight(seed: Seed): number {
  let weight = 1;
  if (seed.favorite) weight += 0.5;
  if (typeof seed.score === "number" && seed.score >= MIN_SCORE_BONUS_AT) {
    weight += (seed.score - MIN_SCORE_BONUS_AT) / 3;
  }
  return weight;
}

/**
 * Accumulate weight per candidate and drop what the user already has.
 *
 * Weight uses AniList's per-association `rating` rather than counting
 * appearances, because the two say different things: a hundred people voting
 * "if you liked A you'll like B" is not the same signal as one person
 * suggesting it once, and frequency alone cannot tell them apart.
 *
 * Exclusions are applied here, before anything is fetched — there is no reason
 * to hydrate an anime the user finished last year.
 */
export function rankCandidates(
  seeds: Seed[],
  recommendations: RawRecommendation[],
  library: UserLibrary,
): ScoredCandidate[] {
  const weightBySeed = new Map<number, number>();
  for (const seed of seeds) weightBySeed.set(seed.animeId, seedWeight(seed));

  const seedIds = new Set(seeds.map((s) => s.animeId));

  type Accumulator = {
    weight: number;
    topSeedId: number;
    topSeedWeight: number;
    seeds: Set<number>;
  };
  const byAnime = new Map<number, Accumulator>();

  for (const rec of recommendations) {
    if (library.excludedIds.has(rec.animeId)) continue;
    // A seed recommending another seed tells the user nothing they have not
    // already said themselves.
    if (seedIds.has(rec.animeId)) continue;

    const seedW = weightBySeed.get(rec.seedId);
    if (seedW === undefined) continue;

    // AniList can report negative ratings when an association is downvoted.
    // Those are the community saying "these are not alike", so they must not
    // add weight — but neither should they subtract from a different seed's
    // genuine endorsement, which is why the floor is zero rather than the
    // raw value.
    const contribution = seedW * Math.max(rec.rating, 0);

    const current = byAnime.get(rec.animeId);
    if (!current) {
      byAnime.set(rec.animeId, {
        weight: contribution,
        topSeedId: rec.seedId,
        topSeedWeight: contribution,
        seeds: new Set([rec.seedId]),
      });
      continue;
    }

    current.weight += contribution;
    current.seeds.add(rec.seedId);
    if (contribution > current.topSeedWeight) {
      current.topSeedWeight = contribution;
      current.topSeedId = rec.seedId;
    }
  }

  return [...byAnime.entries()]
    .map(([animeId, acc]) => ({
      animeId,
      weight: acc.weight,
      topSeedId: acc.topSeedId,
      seedCount: acc.seeds.size,
    }))
    .sort((a, b) => b.weight - a.weight || a.animeId - b.animeId);
}

/* -------------------------------------------------------------------------- */
/*  Selection                                                                  */
/* -------------------------------------------------------------------------- */

/** Nothing may claim more than this many slots on behalf of one seed. */
const MAX_PER_SEED = 3;

/**
 * Multiplier applied once per genre already present in the picked set.
 *
 * Three shared genres leave a candidate at ~0.22 of its weight, which is enough
 * to drop it behind a good suggestion from elsewhere without banning it: if
 * nothing else comes close, the fourth isekai still gets in. A hard ban would
 * make a list worse for someone who genuinely watches one genre.
 */
const GENRE_DECAY = 0.6;

/** A sequel to something the user finished is a stronger bet than average. */
const COMPLETED_SEQUEL_BOOST = 1.3;

/**
 * Pick the final list from ranked candidates.
 *
 * Pure weight order produces a monotone list — with a hundred candidates and
 * twenty slots, whatever genre the user's favourites share wins every slot. The
 * two limits below are what make the page worth revisiting, and they apply at
 * selection time rather than at scoring time so the underlying weights stay
 * interpretable.
 *
 * `facts` covers only the candidates that were hydrated. Anything missing is
 * skipped rather than assumed: a candidate with unknown genres cannot be
 * diversity-checked, and guessing would silently defeat the check.
 */
export function selectRecommendations(
  ranked: ScoredCandidate[],
  facts: Map<number, CandidateFacts>,
  library: UserLibrary,
  limit: number,
): ScoredCandidate[] {
  const picked: ScoredCandidate[] = [];
  const usedGenres = new Map<string, number>();
  const perSeed = new Map<number, number>();

  const remaining = ranked.filter((candidate) => {
    const fact = facts.get(candidate.animeId);
    if (!fact) return false;

    if (fact.continuationOfId !== null) {
      // Recommending a third season to someone who never watched the first is
      // noise with a good score attached. Only entries whose predecessor the
      // user has actually engaged with survive.
      if (
        !library.completedIds.has(fact.continuationOfId) &&
        !library.excludedIds.has(fact.continuationOfId)
      ) {
        return false;
      }
    }
    return true;
  });

  const adjusted = new Map<number, number>();
  for (const candidate of remaining) {
    const fact = facts.get(candidate.animeId)!;
    const boost =
      fact.continuationOfId !== null &&
      library.completedIds.has(fact.continuationOfId)
        ? COMPLETED_SEQUEL_BOOST
        : 1;
    adjusted.set(candidate.animeId, candidate.weight * boost);
  }

  const pool = [...remaining];

  while (picked.length < limit && pool.length > 0) {
    let bestIndex = -1;
    let bestValue = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      if ((perSeed.get(candidate.topSeedId) ?? 0) >= MAX_PER_SEED) continue;

      const fact = facts.get(candidate.animeId)!;
      const overlap = fact.genres.reduce(
        (count, genre) => count + (usedGenres.has(genre) ? 1 : 0),
        0,
      );
      const value =
        (adjusted.get(candidate.animeId) ?? 0) * Math.pow(GENRE_DECAY, overlap);

      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }

    // Every remaining candidate is blocked by its seed's quota. Stopping here
    // rather than relaxing the cap keeps the guarantee honest: a short list is
    // a better answer than twenty suggestions that are really one.
    if (bestIndex === -1) break;

    const [chosen] = pool.splice(bestIndex, 1);
    picked.push(chosen);
    perSeed.set(chosen.topSeedId, (perSeed.get(chosen.topSeedId) ?? 0) + 1);
    for (const genre of facts.get(chosen.animeId)!.genres) {
      usedGenres.set(genre, (usedGenres.get(genre) ?? 0) + 1);
    }
  }

  return picked;
}

/* -------------------------------------------------------------------------- */
/*  Seeds                                                                      */
/* -------------------------------------------------------------------------- */

/** Below this, the result is a "similar to" rather than a recommendation. */
export const MIN_SEEDS = 3;

/** A score at or above this counts as a signal on its own. */
export const SEED_SCORE_THRESHOLD = 8;

/**
 * Whether the user has told us enough to have an opinion.
 *
 * Counts distinct anime, not signals. Someone who favourited three shows and
 * also scored those same three a 9 has expressed three preferences, not six,
 * and a threshold meant to require three different tastes would otherwise be
 * cleared by one.
 */
export function countSeedAnime(seeds: Seed[]): number {
  const ids = new Set<number>();
  for (const seed of seeds) {
    if (
      seed.favorite ||
      (typeof seed.score === "number" && seed.score >= SEED_SCORE_THRESHOLD)
    ) {
      ids.add(seed.animeId);
    }
  }
  return ids.size;
}

export function hasEnoughSeeds(seeds: Seed[]): boolean {
  return countSeedAnime(seeds) >= MIN_SEEDS;
}
