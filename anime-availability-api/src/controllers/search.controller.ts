// src/controllers/search.controller.ts
import { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";
import { ENV } from "../config/env.js";
import {
  tmdbSearchTV,
  tmdbTVProviders,
  tmdbPosterUrl,
  TMDBSearchTVItem,
} from "../services/tmdb.service.js";
import { cache } from "../utils/cache.js";
import { flattenProviders } from "../utils/providers.js";
import { enrichFromMalAndKitsu } from "../utils/enrich.js";
import type { SearchQuery } from "../models/schema.js";

const PROVIDERS_TTL_MS = 1000 * 60 * 60 * 12;
const limitC = pLimit(5);

// --- helper: decide si un resultado de TMDb pinta a “anime”
function isAnimeCandidate(item: TMDBSearchTVItem) {
  const hasAnimation = item.genre_ids?.includes(16); // 16 = Animation
  const isJP =
    item.original_language === "ja" ||
    (item.origin_country || []).includes("JP");
  return Boolean(hasAnimation && isJP);
}

export async function searchTitle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { title, country } = (req.validated || {}) as SearchQuery;
    const resolvedCountry = (country || ENV.DEFAULT_COUNTRY).toUpperCase();

    const limit = Math.max(1, Math.min(Number(req.query.limit ?? 12), 25));
    const doEnrich = String(req.query.enrich || "0") === "1";
    const onlyAnime = String(req.query.onlyAnime || "1") === "1"; // por defecto SÍ filtra

    // 1) Buscar en TMDb
    const results = await tmdbSearchTV(title);

    // 2) Filtrar solo anime (si onlyAnime=1)
    const filtered = onlyAnime ? results.filter(isAnimeCandidate) : results;

    const subset = filtered.slice(0, limit);

    // 3) Mapear
    const data = await Promise.all(
      subset.map((item) =>
        limitC(async () => {
          const titleCandidate = item.name || item.original_name || title;

          // Providers (cache)
          const cacheKey = `providers:${item.id}:${resolvedCountry}`;
          let providers = cache.get<string[]>(cacheKey);
          if (!providers) {
            const p = await tmdbTVProviders(item.id, resolvedCountry);
            providers = flattenProviders(p || undefined);
            cache.set(cacheKey, providers, PROVIDERS_TTL_MS);
          }

          // Poster TMDb
          let poster: string | null = tmdbPosterUrl(item.poster_path, "w342");

          // Enrich opcional
          let meta:
            | {
                genres?: string[];
                rating?: number | null;
                synopsis?: string | null;
                episodes?: number | null;
                startDate?: string | null;
              }
            | undefined;
          let malId: number | null = null;
          let kitsuId: string | null = null;

          if (doEnrich) {
            const enrich = await enrichFromMalAndKitsu(titleCandidate);
            poster = poster ?? enrich.posterAlt ?? null;
            meta = {
              genres: enrich.genres,
              rating: enrich.rating,
              synopsis: enrich.synopsis,
              episodes: enrich.episodes ?? null,
              startDate: enrich.startDate ?? null,
            };
            malId = enrich.sources.mal?.id ?? null;
            kitsuId = enrich.sources.kitsu?.id ?? null;
          }

          return {
            ids: { tmdb: item.id, mal: malId, kitsu: kitsuId },
            title: titleCandidate,
            poster,
            providers,
            ...(meta ? { meta } : {}),
          };
        })
      )
    );

    res.json({
      meta: {
        country: resolvedCountry,
        query: title,
        total: data.length,
        source: `TMDb${doEnrich ? " + MAL + Kitsu" : ""}`,
        onlyAnime,
      },
      data,
    });
  } catch (e) {
    next(e);
  }
}
