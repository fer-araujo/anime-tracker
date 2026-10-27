import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config/env.js", () => ({
  ENV: { REDIS_URL: "https://redis.test", REDIS_TOKEN: "t" },
}));

const redisStore = new Map<string, unknown>();
const pttl = vi.fn<(key: string) => Promise<number>>();
vi.mock("@upstash/redis", () => ({
  Redis: class {
    async get(key: string) {
      return redisStore.get(key) ?? null;
    }
    async set(key: string, value: unknown) {
      redisStore.set(key, value);
    }
    pttl(key: string) {
      return pttl(key);
    }
  },
}));

const { HybridCache } = await import("../utils/cache.js");

beforeEach(() => {
  redisStore.clear();
  pttl.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse("2026-10-22T16:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HybridCache promotion from Redis", () => {
  it("keeps a promoted value only as long as Redis had left for it", async () => {
    // A fresh process (Render wakes from sleep) finds a timetable in Redis
    // with ten minutes to live. Memory must not outlive that.
    redisStore.set("animeschedule:timetable:2026-43", ["old"]);
    pttl.mockResolvedValue(10 * 60_000);
    const cache = new HybridCache();

    expect(await cache.get("animeschedule:timetable:2026-43")).toEqual(["old"]);

    redisStore.set("animeschedule:timetable:2026-43", ["new"]);
    vi.setSystemTime(Date.now() + 11 * 60_000);

    expect(await cache.get("animeschedule:timetable:2026-43")).toEqual(["new"]);
  });

  it("falls back to a short lifetime when Redis cannot say", async () => {
    redisStore.set("k", 1);
    pttl.mockResolvedValue(-1);
    const cache = new HybridCache();

    await cache.get("k");
    redisStore.set("k", 2);
    vi.setSystemTime(Date.now() + 2 * 60_000);

    expect(await cache.get("k")).toBe(2);
  });
});
