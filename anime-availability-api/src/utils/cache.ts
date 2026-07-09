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
}

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
      };
      logger.info("[cache] Redis adapter initialised");
    } catch (err) {
      logger.warn({ err }, "[cache] Failed to initialise Redis adapter, falling back to memory-only");
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
        // Promote to memory (use default TTL — callers set via set())
        this.memory.set(key, val as unknown, 1000 * 60 * 60 * 12);
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
      await Promise.resolve(redis.set(key, value, ttlMs)).catch((err: unknown) => {
        logger.warn({ err }, `[cache] Redis set failed for key "${key}"`);
      });
    }
  }
}

export const hybridCache = new HybridCache();

// ─── Cache-Control Helper ────────────────────────────────────────────────────

export type CacheType = "hero" | "season" | "anime";

const CACHE_CONTROL_MAP: Record<CacheType, string> = {
  hero:   "public, s-maxage=21600, stale-while-revalidate=86400",
  season: "public, s-maxage=3600, stale-while-revalidate=43200",
  anime:  "public, s-maxage=7200, stale-while-revalidate=43200",
};

export function setCacheControl(res: { setHeader?: (name: string, value: string) => void; header?: (name: string, value: string) => void }, type: CacheType): void {
  const value = CACHE_CONTROL_MAP[type];
  res.setHeader?.("Cache-Control", value) ?? res.header?.("Cache-Control", value);
}
