import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("API smoke tests", () => {
  it("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /v1/home/hero returns 200 with data", async () => {
    const res = await request(app).get("/v1/home/hero");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /v1/season?rank=popular returns 200", async () => {
    const res = await request(app).get("/v1/season?rank=popular");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });

  it("GET /v1/anime/:id returns 200 for valid ID", async () => {
    const res = await request(app).get("/v1/anime/21");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });

  it("GET /v1/anime/invalid returns 400 for non-numeric ID", async () => {
    const res = await request(app).get("/v1/anime/invalid");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /v1/anime/batch returns 200 with data for valid IDs", async () => {
    const res = await request(app)
      .post("/v1/anime/batch")
      .send({ ids: [21, 22, 23] })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Object.keys(res.body.data)).toHaveLength(3);
  });

  it("POST /v1/anime/batch returns 400 for empty ids", async () => {
    const res = await request(app)
      .post("/v1/anime/batch")
      .send({ ids: [] })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });

  it("POST /v1/anime/batch returns 400 for missing ids", async () => {
    const res = await request(app)
      .post("/v1/anime/batch")
      .send({})
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });

  it("GET /v1/season?season=ALL&year=2025 returns 200 with no season filter", async () => {
    const res = await request(app).get("/v1/season?season=ALL&year=2025");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.meta.season).toBe("ALL");
  });

  it("GET /v1/nonexistent returns 404", async () => {
    const res = await request(app).get("/v1/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
