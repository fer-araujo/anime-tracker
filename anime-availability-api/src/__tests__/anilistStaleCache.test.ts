import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { hybridCache } from "../utils/cache.js";

/**
 * On 2026-09-06 AniList answered 403 to every request and the app went blank.
 * The service was healthy — it simply had nothing to serve. These pin the
 * behaviour that keeps it serving something.
 */

const OK = { data: { Media: { id: 1, title: { romaji: "Cowboy Bebop" } } } };

const respond = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Each test needs its own query text so it gets its own cache key. */
let n = 0;
const uniqueQuery = () => `query Q${n++} { Media(id: 1) { id } }`;

/**
 * Warm the cache, then age the clock past the fresh TTL.
 *
 * Without this the second call short-circuits on the fresh copy and the stale
 * path is never reached — a test that passes without testing anything.
 */
const SIX_HOURS = 1000 * 60 * 60 * 6;
async function warmThenExpire(query: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(200, OK)));
  await anilistFetch(query, {});
  vi.setSystemTime(Date.now() + SIX_HOURS + 60_000);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => vi.useRealTimers());

describe("anilistFetch — surviving an upstream outage", () => {
  it("keeps a copy that outlives the fresh entry", async () => {
    const q = uniqueQuery();
    const set = vi.spyOn(hybridCache, "set");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(200, OK)));

    await anilistFetch(q, {});

    const keys = set.mock.calls.map((c) => String(c[0]));
    const ttls = set.mock.calls.map((c) => Number(c[2]));
    expect(keys.some((k) => k.startsWith("stale:"))).toBe(true);
    expect(keys.some((k) => !k.startsWith("stale:"))).toBe(true);
    // The point of the second copy is that it lasts longer than the first.
    expect(Math.max(...ttls)).toBeGreaterThan(Math.min(...ttls));
    set.mockRestore();
  });

  it("serves the stale copy when the upstream 403s", async () => {
    // The actual outage: not a timeout, an immediate refusal.
    const q = uniqueQuery();
    await warmThenExpire(q);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(403, { errors: [] })));
    const result = await anilistFetch(q, {});

    expect(result).toEqual(OK);
  });

  it("serves the stale copy when the request throws", async () => {
    // DNS failure, connection refused, or the 8s timeout firing.
    const q = uniqueQuery();
    await warmThenExpire(q);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    expect(await anilistFetch(q, {})).toEqual(OK);
  });

  it("returns null on a cold cache rather than inventing data", async () => {
    // Serving stale must never become making something up. A season nobody has
    // opened has no copy, and saying so is the only honest answer.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(403, {})));

    expect(await anilistFetch(uniqueQuery(), {})).toBeNull();
  });

  it("tells the caller the answer was stale", async () => {
    const q = uniqueQuery();
    await warmThenExpire(q);

    const onStale = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(500, {})));
    await anilistFetch(q, {}, undefined, { onStale });

    expect(onStale).toHaveBeenCalledOnce();
  });

  it("does not report staleness when the upstream is healthy", async () => {
    const onStale = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(200, OK)));

    await anilistFetch(uniqueQuery(), {}, undefined, { onStale });

    expect(onStale).not.toHaveBeenCalled();
  });

  it("never reaches the network while a fresh copy exists", async () => {
    // The stale tier must not change the ordinary path: fresh still short-
    // circuits before the rate limiter.
    const q = uniqueQuery();
    const fetchMock = vi.fn().mockResolvedValue(respond(200, OK));
    vi.stubGlobal("fetch", fetchMock);

    await anilistFetch(q, {});
    await anilistFetch(q, {});

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
