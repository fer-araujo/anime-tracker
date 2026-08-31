import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { SEED_RECOMMENDATIONS_GQL } from "../graphql/queries/recommendations.gql.js";
import { MEDIA_CARD_FIELDS } from "../graphql/fragments/mediaCard.gql.js";

const seed = (animeId: number, favorite = true, score: number | null = 9) => ({
  animeId,
  favorite,
  score,
});

/** Three distinct anime clears the threshold. */
const THREE_SEEDS = [seed(1), seed(2), seed(3)];

const post = (body: Record<string, unknown>) =>
  request(app).post("/v1/recommendations").send(body);

describe("SEED_RECOMMENDATIONS_GQL", () => {
  it("asks for ids and votes only", () => {
    // Nesting the card field set under mediaRecommendation multiplies
    // complexity across three levels, and AniList's cap of 500 is not
    // theoretical — the batch endpoint died on that exact mistake.
    expect(SEED_RECOMMENDATIONS_GQL).toContain("mediaRecommendation { id }");
    expect(SEED_RECOMMENDATIONS_GQL).not.toContain(MEDIA_CARD_FIELDS);
  });

  it("caps seeds at one AniList page", () => {
    expect(SEED_RECOMMENDATIONS_GQL).toContain("perPage: 50");
  });
});

describe("POST /v1/recommendations", () => {
  it("answers 200 with an explanation when there are too few seeds", async () => {
    // Not a client error: a new account simply has nothing to go on, and a 4xx
    // would make the page treat "keep marking favourites" as a failure.
    const res = await post({ seeds: [seed(1), seed(2)], exclude: [], completed: [] });

    expect(res.status).toBe(200);
    expect(res.body.meta.enough).toBe(false);
    expect(res.body.meta.seedCount).toBe(2);
    expect(res.body.meta.minSeeds).toBe(3);
    expect(res.body.data).toEqual([]);
  });

  it("counts distinct anime rather than signals", async () => {
    // Two anime that are both favourited and scored 10 are two preferences.
    const res = await post({
      seeds: [seed(1, true, 10), seed(2, true, 10)],
      exclude: [],
      completed: [],
    });
    expect(res.body.meta.seedCount).toBe(2);
    expect(res.body.meta.enough).toBe(false);
  });

  it("returns ranked recommendations once the threshold is met", async () => {
    const res = await post({ seeds: THREE_SEEDS, exclude: [], completed: [] });

    expect(res.status).toBe(200);
    expect(res.body.meta.enough).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty("id.anilist");
    expect(res.body.data[0]).toHaveProperty("providers");
  });

  it("never recommends a seed back to the user", async () => {
    const res = await post({ seeds: THREE_SEEDS, exclude: [], completed: [] });
    const ids = res.body.data.map((a: { id: { anilist: number } }) => a.id.anilist);

    for (const s of THREE_SEEDS) expect(ids).not.toContain(s.animeId);
  });

  it("honours the exclusion list", async () => {
    const first = await post({ seeds: THREE_SEEDS, exclude: [], completed: [] });
    const excluded = first.body.data[0].id.anilist;

    const second = await post({
      seeds: THREE_SEEDS,
      exclude: [excluded],
      completed: [],
    });
    const ids = second.body.data.map((a: { id: { anilist: number } }) => a.id.anilist);

    expect(ids).not.toContain(excluded);
  });

  it("caps the response at twenty", async () => {
    const seeds = Array.from({ length: 12 }, (_, i) => seed(i + 1));
    const res = await post({ seeds, exclude: [], completed: [] });

    expect(res.body.data.length).toBeLessThanOrEqual(20);
  });

  it("lets no single seed dominate the list", async () => {
    // The mock has every seed recommending four of its own candidates; without
    // the per-seed cap one seed could fill the page by itself.
    const res = await post({ seeds: THREE_SEEDS, exclude: [], completed: [] });
    const ids: number[] = res.body.data.map(
      (a: { id: { anilist: number } }) => a.id.anilist,
    );

    for (const s of THREE_SEEDS) {
      const fromSeed = ids.filter((id) => Math.floor(id / 10) === s.animeId);
      expect(fromSeed.length).toBeLessThanOrEqual(3);
    }
  });

  it("reports how many candidates it had to choose from", async () => {
    const res = await post({ seeds: THREE_SEEDS, exclude: [], completed: [] });
    expect(res.body.meta.candidates).toBeGreaterThan(res.body.data.length);
  });

  it("rejects a malformed body", async () => {
    expect((await post({ seeds: [{ animeId: -1, favorite: true, score: 9 }] })).status).toBe(400);
    expect((await post({ seeds: [{ animeId: 1, favorite: true, score: 99 }] })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("defaults the optional id lists", async () => {
    const res = await post({ seeds: THREE_SEEDS });
    expect(res.status).toBe(200);
  });
});
