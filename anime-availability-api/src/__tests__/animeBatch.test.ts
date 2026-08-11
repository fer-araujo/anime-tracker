import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { UNKNOWN_ANILIST_ID } from "./setup.js";
import { ANIME_BATCH_GQL } from "../graphql/queries/animeBatch.gql.js";
import { MEDIA_CARD_FIELDS } from "../graphql/fragments/mediaCard.gql.js";

/** The exact payload that took the lists page down in production. */
const REAL_LIST_IDS = [
  178789, 135865, 210031, 202269, 182255, 186497, 169580, 196219, 198409,
  169582, 192800, 181444, 169583, 174653, 146493,
];

describe("ANIME_BATCH_GQL", () => {
  it("asks for one page by id_in, not one alias per id", () => {
    // Aliases cost 35 complexity each against AniList's cap of 500, so the
    // query died at fifteen ids while the endpoint advertised fifty. The shape
    // of this query is the fix, which makes it worth asserting directly.
    expect(ANIME_BATCH_GQL).toContain("id_in: $ids");
    expect(ANIME_BATCH_GQL).not.toMatch(/a\d+:\s*Media\(id:/);
  });

  it("shares the field set with every other card endpoint", () => {
    // The hand-written alias string never asked for source, popularity,
    // favourites or externalLinks, so the batch served null for fields that
    // were populated everywhere else.
    expect(ANIME_BATCH_GQL).toContain(MEDIA_CARD_FIELDS);
  });

  it("pages to AniList's maximum, matching the endpoint's own id ceiling", () => {
    expect(ANIME_BATCH_GQL).toContain("perPage: 50");
  });
});

describe("POST /v1/anime/batch", () => {
  it("handles the fifteen ids that returned 503 in production", async () => {
    const res = await request(app)
      .post("/v1/anime/batch")
      .send({ ids: REAL_LIST_IDS });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data)).toHaveLength(REAL_LIST_IDS.length);
  });

  it("survives past the fourteen-id complexity cliff", async () => {
    // Fourteen aliases passed and fifteen did not; anything at or above that
    // boundary is the regression worth pinning.
    for (const size of [14, 15, 30, 50]) {
      const ids = Array.from({ length: size }, (_, i) => 1000 + i);
      const res = await request(app).post("/v1/anime/batch").send({ ids });

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data)).toHaveLength(size);
    }
  });

  it("returns the known ids when one of them does not resolve", async () => {
    // The alias query answered HTTP 404 here and nulled every sibling, so one
    // dead entry in a user's list erased the whole page rather than itself.
    const res = await request(app)
      .post("/v1/anime/batch")
      .send({ ids: [21, UNKNOWN_ANILIST_ID, 1] });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(["1", "21"]);
  });

  it("keys the response by anilist id so callers can look ids up directly", async () => {
    const res = await request(app).post("/v1/anime/batch").send({ ids: [21] });
    expect(res.body.data["21"].id.anilist).toBe(21);
  });

  it("rejects more than fifty ids at the route rather than truncating silently", async () => {
    // The route validates max(50) and the controller slices to the same bound.
    // Belt and braces, but the route is the one that answers: a caller asking
    // for eighty gets told, instead of receiving fifty and assuming it got all.
    const ids = Array.from({ length: 80 }, (_, i) => 2000 + i);
    const res = await request(app).post("/v1/anime/batch").send({ ids });

    expect(res.status).toBe(400);
  });

  it("accepts exactly fifty", async () => {
    const ids = Array.from({ length: 50 }, (_, i) => 3000 + i);
    const res = await request(app).post("/v1/anime/batch").send({ ids });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data)).toHaveLength(50);
  });

  it("still rejects an empty or missing id list", async () => {
    expect((await request(app).post("/v1/anime/batch").send({ ids: [] })).status).toBe(400);
    expect((await request(app).post("/v1/anime/batch").send({})).status).toBe(400);
  });
});
