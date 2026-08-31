import { describe, it, expect } from "vitest";
import type {
  CandidateFacts,
  RawRecommendation,
  Seed,
  UserLibrary,
} from "../types/recommendations.js";
import {
  countSeedAnime,
  hasEnoughSeeds,
  rankCandidates,
  seedWeight,
  selectRecommendations,
} from "../utils/rankRecommendations.js";

const library = (over: Partial<UserLibrary> = {}): UserLibrary => ({
  excludedIds: new Set<number>(),
  completedIds: new Set<number>(),
  ...over,
});

const rec = (seedId: number, animeId: number, rating: number): RawRecommendation => ({
  seedId,
  animeId,
  rating,
});

const facts = (
  entries: [number, Partial<CandidateFacts>][],
): Map<number, CandidateFacts> =>
  new Map(
    entries.map(([id, f]) => [
      id,
      { genres: [], continuationOfId: null, ...f },
    ]),
  );

describe("seedWeight", () => {
  it("gives a plain entry the baseline", () => {
    expect(seedWeight({ animeId: 1, favorite: false, score: null })).toBe(1);
  });

  it("adds for a favourite and for a high score", () => {
    expect(seedWeight({ animeId: 1, favorite: true, score: null })).toBe(1.5);
    expect(seedWeight({ animeId: 1, favorite: false, score: 10 })).toBe(2);
    expect(seedWeight({ animeId: 1, favorite: true, score: 10 })).toBe(2.5);
  });

  it("does not invent a score for an unrated favourite", () => {
    // The user chose the heart and skipped the number. Treating that as an
    // implicit 8 justifies a recommendation with data that never existed.
    const unrated = seedWeight({ animeId: 1, favorite: true, score: null });
    const ratedEight = seedWeight({ animeId: 1, favorite: true, score: 8 });
    expect(unrated).toBeLessThan(ratedEight);
  });

  it("ignores scores below the bonus threshold rather than penalising them", () => {
    expect(seedWeight({ animeId: 1, favorite: false, score: 6 })).toBe(1);
    expect(seedWeight({ animeId: 1, favorite: false, score: 3 })).toBe(1);
  });

  it("keeps the spread narrow enough that seeds have to agree", () => {
    // One perfect favourite must not outweigh two merely-loved ones, or using
    // several seeds stops meaning anything.
    const best = seedWeight({ animeId: 1, favorite: true, score: 10 });
    const good = seedWeight({ animeId: 2, favorite: true, score: null });
    expect(best).toBeLessThan(good * 2);
  });
});

describe("rankCandidates", () => {
  const seeds: Seed[] = [
    { animeId: 1, favorite: true, score: 10 },
    { animeId: 2, favorite: false, score: null },
  ];

  it("weighs community votes, not how often something appears", () => {
    // One association with a hundred votes beats two with five each. Counting
    // appearances cannot tell those apart.
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 100), rec(1, 200, 5), rec(2, 200, 5)],
      library(),
    );
    expect(ranked[0].animeId).toBe(100);
  });

  it("adds up weight across the seeds that agree", () => {
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 10), rec(2, 100, 10)],
      library(),
    );
    // 2.5 * 10 from the favourite plus 1 * 10 from the plain entry.
    expect(ranked[0].weight).toBe(35);
    expect(ranked[0].seedCount).toBe(2);
  });

  it("attributes a candidate to the seed that argued hardest for it", () => {
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 1), rec(2, 100, 50)],
      library(),
    );
    expect(ranked[0].topSeedId).toBe(2);
  });

  it("floors a downvoted association at zero instead of subtracting", () => {
    // A negative rating is the community saying "these are not alike". It must
    // not add weight, and it must not cancel another seed's real endorsement.
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 10), rec(2, 100, -999)],
      library(),
    );
    expect(ranked[0].weight).toBe(25);
  });

  it("drops what the user already tracks, lists or dismissed", () => {
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 10), rec(1, 300, 10)],
      library({ excludedIds: new Set([300]) }),
    );
    expect(ranked.map((r) => r.animeId)).toEqual([100]);
  });

  it("never recommends a seed back to the user", () => {
    const ranked = rankCandidates(seeds, [rec(1, 2, 500)], library());
    expect(ranked).toHaveLength(0);
  });

  it("ignores recommendations attributed to an unknown seed", () => {
    const ranked = rankCandidates(seeds, [rec(999, 100, 10)], library());
    expect(ranked).toHaveLength(0);
  });

  it("breaks ties deterministically so the page does not reshuffle", () => {
    const a = rankCandidates(seeds, [rec(1, 300, 10), rec(1, 100, 10)], library());
    const b = rankCandidates(seeds, [rec(1, 100, 10), rec(1, 300, 10)], library());
    expect(a.map((r) => r.animeId)).toEqual(b.map((r) => r.animeId));
  });
});

describe("selectRecommendations", () => {
  const seeds: Seed[] = [
    { animeId: 1, favorite: true, score: 10 },
    { animeId: 2, favorite: true, score: 10 },
    { animeId: 3, favorite: true, score: 10 },
  ];

  it("lets no single seed claim more than three slots", () => {
    // Without the cap, the favourite the community recommends most takes the
    // whole page on its own.
    const recs = Array.from({ length: 10 }, (_, i) => rec(1, 100 + i, 100 - i));
    const ranked = rankCandidates(seeds, recs, library());
    const f = facts(ranked.map((r) => [r.animeId, {}] as [number, Partial<CandidateFacts>]));

    const picked = selectRecommendations(ranked, f, library(), 20);
    expect(picked).toHaveLength(3);
    expect(picked.every((p) => p.topSeedId === 1)).toBe(true);
  });

  it("pushes a repeated genre down without banning it", () => {
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 100), rec(2, 200, 90), rec(3, 300, 70)],
      library(),
    );
    const f = facts([
      [100, { genres: ["Isekai"] }],
      [200, { genres: ["Isekai"] }],
      [300, { genres: ["Sports"] }],
    ]);

    const picked = selectRecommendations(ranked, f, library(), 3).map(
      (p) => p.animeId,
    );

    // 200 outranks 300 on raw weight, but shares a genre with the first pick,
    // so the different one goes ahead of it — and 200 still makes the list.
    expect(picked).toEqual([100, 300, 200]);
  });

  it("still favours a much stronger match over variety", () => {
    // The other half of the same rule. A single decay step must not overturn a
    // threefold gap: someone who watches one genre should not be handed a worse
    // suggestion purely because it is different.
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 100), rec(2, 200, 90), rec(3, 300, 25)],
      library(),
    );
    const f = facts([
      [100, { genres: ["Isekai"] }],
      [200, { genres: ["Isekai"] }],
      [300, { genres: ["Sports"] }],
    ]);

    const picked = selectRecommendations(ranked, f, library(), 3).map(
      (p) => p.animeId,
    );
    expect(picked).toEqual([100, 200, 300]);
  });

  it("drops a sequel whose predecessor the user has never touched", () => {
    // A third season recommended to someone who never watched the first is
    // noise with a good score attached.
    const ranked = rankCandidates(seeds, [rec(1, 100, 100)], library());
    const f = facts([[100, { continuationOfId: 555 }]]);

    expect(selectRecommendations(ranked, f, library(), 20)).toHaveLength(0);
  });

  it("keeps and boosts a sequel to something completed", () => {
    const ranked = rankCandidates(
      seeds,
      [rec(1, 100, 50), rec(2, 200, 60)],
      library({ completedIds: new Set([555]) }),
    );
    const f = facts([
      [100, { continuationOfId: 555 }],
      [200, {}],
    ]);

    const picked = selectRecommendations(
      ranked,
      f,
      library({ completedIds: new Set([555]) }),
      20,
    );
    // 200 ranks higher raw (60*2.5 vs 50*2.5) but the boost overturns it.
    expect(picked[0].animeId).toBe(100);
  });

  it("keeps a sequel to something merely tracked, without the boost", () => {
    const lib = library({ excludedIds: new Set([555]) });
    const ranked = rankCandidates(seeds, [rec(1, 100, 50)], lib);
    const f = facts([[100, { continuationOfId: 555 }]]);

    expect(selectRecommendations(ranked, f, lib, 20).map((p) => p.animeId)).toEqual([100]);
  });

  it("skips candidates it has no facts for rather than assuming", () => {
    const ranked = rankCandidates(seeds, [rec(1, 100, 10), rec(2, 200, 10)], library());
    const f = facts([[100, {}]]);

    expect(selectRecommendations(ranked, f, library(), 20).map((p) => p.animeId)).toEqual([100]);
  });

  it("honours the limit", () => {
    const recs = [rec(1, 100, 10), rec(2, 200, 10), rec(3, 300, 10)];
    const ranked = rankCandidates(seeds, recs, library());
    const f = facts([
      [100, {}],
      [200, {}],
      [300, {}],
    ]);

    expect(selectRecommendations(ranked, f, library(), 2)).toHaveLength(2);
  });

  it("returns a short list rather than relaxing the per-seed cap", () => {
    const recs = Array.from({ length: 8 }, (_, i) => rec(1, 100 + i, 50));
    const ranked = rankCandidates(seeds, recs, library());
    const f = facts(ranked.map((r) => [r.animeId, {}] as [number, Partial<CandidateFacts>]));

    expect(selectRecommendations(ranked, f, library(), 20).length).toBeLessThanOrEqual(3);
  });
});

describe("seed threshold", () => {
  it("counts anime, not signals", () => {
    // Three shows favourited *and* scored 9 are three preferences, not six.
    const seeds: Seed[] = [
      { animeId: 1, favorite: true, score: 9 },
      { animeId: 2, favorite: true, score: 9 },
      { animeId: 3, favorite: true, score: 9 },
    ];
    expect(countSeedAnime(seeds)).toBe(3);
    expect(hasEnoughSeeds(seeds)).toBe(true);
  });

  it("accepts a mix of favourites and high scores", () => {
    // The case a plain OR of the two conditions would reject: two of each.
    const seeds: Seed[] = [
      { animeId: 1, favorite: true, score: null },
      { animeId: 2, favorite: true, score: null },
      { animeId: 3, favorite: false, score: 9 },
      { animeId: 4, favorite: false, score: 8 },
    ];
    expect(hasEnoughSeeds(seeds)).toBe(true);
  });

  it("rejects two anime no matter how many signals they carry", () => {
    const seeds: Seed[] = [
      { animeId: 1, favorite: true, score: 10 },
      { animeId: 2, favorite: true, score: 10 },
    ];
    expect(hasEnoughSeeds(seeds)).toBe(false);
  });

  it("ignores entries that are neither favourited nor scored highly", () => {
    const seeds: Seed[] = [
      { animeId: 1, favorite: true, score: null },
      { animeId: 2, favorite: false, score: 7 },
      { animeId: 3, favorite: false, score: null },
    ];
    expect(countSeedAnime(seeds)).toBe(1);
    expect(hasEnoughSeeds(seeds)).toBe(false);
  });
});
