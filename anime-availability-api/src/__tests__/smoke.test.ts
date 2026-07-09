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

  it("GET /v1/nonexistent returns 404", async () => {
    const res = await request(app).get("/v1/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
