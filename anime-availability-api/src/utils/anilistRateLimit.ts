// src/utils/anilistRateLimit.ts
// Global rate limiter for ALL AniList GraphQL calls.
// AniList is currently in degraded state: 30 req/min (normally 90).
// We limit to 25 req/min with a safety margin.
// Also caches GraphQL responses by query+variables hash.

import { hybridCache } from "./cache.js";

type AniListDefaultResponse = {
  data?: {
    Page?: {
      media?: unknown[];
      airingSchedules?: unknown[];
      pageInfo?: {
        total?: number;
        currentPage?: number;
        lastPage?: number;
      };
    };
    Media?: Record<string, unknown>;
  };
};
import { logger } from "./logger.js";

const MAX_REQUESTS_PER_MINUTE = 25;
const WINDOW_MS = 60_000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours for individual GraphQL queries

// Sliding window rate limiter
let requestTimestamps: number[] = [];

function waitForRateLimit(): Promise<void> {
  return new Promise((resolve) => {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    requestTimestamps = requestTimestamps.filter((ts) => now - ts < WINDOW_MS);

    if (requestTimestamps.length < MAX_REQUESTS_PER_MINUTE) {
      requestTimestamps.push(now);
      resolve();
      return;
    }

    // Calculate how long to wait until the oldest request falls out of the window
    const oldestInWindow = requestTimestamps[0];
    const waitMs = WINDOW_MS - (now - oldestInWindow) + 100; // +100ms safety
    logger.warn(
      `[anilist] Rate limit reached (${requestTimestamps.length}/${MAX_REQUESTS_PER_MINUTE}), waiting ${waitMs}ms`,
    );
    setTimeout(() => {
      requestTimestamps = requestTimestamps.filter(
        (ts) => Date.now() - ts < WINDOW_MS,
      );
      requestTimestamps.push(Date.now());
      resolve();
    }, waitMs);
  });
}

function hashQuery(query: string, variables: Record<string, unknown>): string {
  const payload = JSON.stringify({ query, variables });
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `anilist:gql:${Math.abs(hash).toString(36)}`;
}

/**
 * Rate-limited, cached AniList GraphQL fetch.
 * Use this INSTEAD of direct fetch(ANILIST_ENDPOINT, ...) everywhere.
 *
 * - Limits to 25 req/min globally (below AniList's degraded 30/min)
 * - Caches each unique query+variables for 6 hours
 * - On 429, reads Retry-After header and waits
 * - On failure, returns null (caller handles gracefully)
 */
export async function anilistFetch<T = AniListDefaultResponse>(
  query: string,
  variables: Record<string, unknown>,
  endpoint: string = "https://graphql.anilist.co",
): Promise<T | null> {
  const cacheKey = hashQuery(query, variables);

  // 1. Check cache first — skip rate limit entirely
  const cached = await hybridCache.get(cacheKey);
  if (cached) {
    return cached as T;
  }

  // 2. Wait for rate limit slot
  await waitForRateLimit();

  // 3. Make the request
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    // 4. Handle 429 Too Many Requests
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") || 60);
      logger.error(
        `[anilist] 429 Too Many Requests — waiting ${retryAfter}s before retry`,
      );
      await new Promise((r) => setTimeout(r, retryAfter * 1000));

      // Retry once after waiting
      const retryRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!retryRes.ok) {
        logger.error(`[anilist] Retry failed with status ${retryRes.status}`);
        return null;
      }

      const retryJson = await retryRes.json();
      if (retryJson?.data) {
        await hybridCache.set(cacheKey, retryJson, CACHE_TTL_MS);
      }
      return retryJson as T;
    }

    // 5. Handle other errors
    if (!res.ok) {
      logger.error(
        `[anilist] HTTP ${res.status} for query: ${query.slice(0, 80)}...`,
      );
      return null;
    }

    // 6. Success — cache and return
    const json = await res.json();
    if (json?.data) {
      await hybridCache.set(cacheKey, json, CACHE_TTL_MS);
    }
    return json as T;
  } catch (err) {
    logger.error({ err }, `[anilist] Fetch failed`);
    return null;
  }
}
