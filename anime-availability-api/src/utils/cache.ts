import { ENV } from "../config/env.js";
import { logger } from "./logger.js";

// ─── Existing TTLCache (unchanged) ───────────────────────────────────────────

export type TTLValue<T> = { value: T; expiresAt: number };

export class TTLCache<K, V> {
  private store = new Map<K, TTLValue<V>>();
  constructor(private defaultTtlMs = 1000 * 60 * 60) {}

  set(key: K, value: V, ttlMs = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get(key: K): V | undefined {
    const item = this.store.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return item.value;
  }
}

export const memoryCache = new TTLCache<string, unknown>(1000 * 60 * 60 * 12);

// ─── Cache Adapter Interface ─────────────────────────────────────────────────

export interface CacheAdapter {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T, ttlMs: number): Promise<void> | void;
  /** Milliseconds the key has left; undefined when unknown or unbounded. */
  remainingMs?(key: string): Promise<number | undefined>;
}

/**
 * How long a value read back from Redis may live in memory when Redis cannot
 * say how long it has left. Short on purpose: memory is checked first and never
 * asks Redis again, so whatever this is, the value is frozen for that long.
 */
const PROMOTION_FALLBACK_TTL_MS = 1000 * 60;

// ─── Hybrid Cache (memory + optional Redis) ──────────────────────────────────

export class HybridCache {
  private redis: CacheAdapter | null = null;
  private memory = new TTLCache<string, unknown>(1000 * 60 * 60 * 12);
  private redisInitAttempted = false;

  /**
   * Lazily initialise the Redis adapter. Returns null if REDIS_URL is not
   * set or if the import fails (e.g. @upstash/redis not installed).
   */
  private async getRedis(): Promise<CacheAdapter | null> {
    if (this.redisInitAttempted) return this.redis;
    this.redisInitAttempted = true;

    const redisUrl = ENV.REDIS_URL;
    const redisToken = ENV.REDIS_TOKEN;
    if (!redisUrl || !redisToken) return null;

    try {
      const { Redis } = await import("@upstash/redis");
      const client = new Redis({ url: redisUrl, token: redisToken });
      this.redis = {
        async get<T>(key: string): Promise<T | undefined> {
          const raw = await client.get(key);
          return raw === null ? undefined : (raw as T);
        },
        async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
          await client.set(key, value, { px: ttlMs });
        },
        async remainingMs(key: string): Promise<number | undefined> {
          // -2: no such key, -1: no expiry. Neither is a lifetime to copy.
          const ms = await client.pttl(key);
          return ms > 0 ? ms : undefined;
        },
      };
      logger.info("[cache] Redis adapter initialised");
    } catch (err) {
      logger.warn(
        { err },
        "[cache] Failed to initialise Redis adapter, falling back to memory-only",
      );
    }
    return this.redis;
  }

  async get<T>(key: string): Promise<T | undefined> {
    // Fast path: memory first
    const mem = this.memory.get(key) as T | undefined;
    if (mem !== undefined) return mem;

    // Slow path: try Redis
    const redis = await this.getRedis();
    if (redis) {
      const val = await redis.get<T>(key);
      if (val !== undefined) {
        // Promoted for whatever Redis says it has left, never a fixed span.
        // This used to be twelve hours for every key, so after a restart the
        // first read of a 15-minute timetable or a 5-minute "airing today"
        // payload pinned it in memory for up to twelve hours, and the bell and
        // the shelf kept answering from that snapshot while the process lived.
        const left = await Promise.resolve(redis.remainingMs?.(key)).catch(
          () => undefined,
        );
        this.memory.set(key, val as unknown, left ?? PROMOTION_FALLBACK_TTL_MS);
      }
      return val;
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // Always write to memory
    this.memory.set(key, value, ttlMs);

    // Best-effort write to Redis
    const redis = await this.getRedis();
    if (redis) {
      await Promise.resolve(redis.set(key, value, ttlMs)).catch(
        (err: unknown) => {
          logger.warn({ err }, `[cache] Redis set failed for key "${key}"`);
        },
      );
    }
  }
}

export const hybridCache = new HybridCache();

// ─── Cache-Control Helper ────────────────────────────────────────────────────

export type CacheType = "hero" | "season" | "anime" | "schedule";

const CACHE_CONTROL_MAP: Record<CacheType, string> = {
  hero: "public, s-maxage=21600, stale-while-revalidate=86400",
  season: "public, s-maxage=3600, stale-while-revalidate=43200",
  anime: "public, s-maxage=7200, stale-while-revalidate=43200",
  schedule: "public, s-maxage=1800, stale-while-revalidate=3600",
};

export function setCacheControl(
  res: {
    setHeader?: (name: string, value: string) => void;
    header?: (name: string, value: string) => void;
  },
  type: CacheType,
): void {
  const value = CACHE_CONTROL_MAP[type];
  if (res.setHeader) {
    res.setHeader("Cache-Control", value);
  } else {
    res.header?.("Cache-Control", value);
  }
}
