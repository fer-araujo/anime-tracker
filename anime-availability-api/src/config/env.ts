import { config } from "dotenv";
import { logger } from "../utils/logger.js";
config();

const required: string[] = ["PORT"];
for (const k of required) {
  if (!process.env[k]) {
    logger.warn(`[env] Missing ${k} (using defaults if available)`);
  }
}

export const ENV = {
  PORT: Number(process.env.PORT || 3000),
  TMDB_KEY: process.env.TMDB_KEY || "",
  FANART_TV_KEY:
    process.env.FANART_TV_KEY || "55f7d6df186e9785f1b1fb85f89df381",
  ANILIST_URL: process.env.ANILIST_URL || "https://graphql.anilist.co",
  DEFAULT_COUNTRY: (process.env.DEFAULT_COUNTRY || "MX").toUpperCase(),

  // Cache persistence (@upstash/redis REST API requires both URL and token)
  REDIS_URL: process.env.REDIS_URL ?? undefined,
  REDIS_TOKEN: process.env.REDIS_TOKEN ?? undefined,

  // Cache TTL overrides (in seconds)
  CACHE_TTL_HERO: Number(process.env.CACHE_TTL_HERO ?? 21600), // 6h
  CACHE_TTL_SEASON: Number(process.env.CACHE_TTL_SEASON ?? 21600), // 6h
  CACHE_TTL_ANIME: Number(process.env.CACHE_TTL_ANIME ?? 7200), // 2h
  CACHE_TTL_TMDB_IMAGES: Number(process.env.CACHE_TTL_TMDB_IMAGES ?? 86400), // 24h
  CACHE_TTL_TMDB_SEARCH: Number(process.env.CACHE_TTL_TMDB_SEARCH ?? 86400), // 24h
  CACHE_TTL_FANART: Number(process.env.CACHE_TTL_FANART ?? 86400), // 24h

  // Circuit breaker bypass
  DISABLE_CIRCUIT_BREAKER: process.env.DISABLE_CIRCUIT_BREAKER === "true",
} as const;
