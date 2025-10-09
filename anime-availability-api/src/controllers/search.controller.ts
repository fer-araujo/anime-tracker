import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { tmdbSearchTV, tmdbTVProviders, tmdbPosterUrl } from "../services/tmdb.service.js";
import { bestMatchFromTMDB } from "../services/match.service.js";
import { cache } from "../utils/cache.js";
import { flattenProviders } from "../utils/providers.js";
import { enrichFromMalAndKitsu } from "../utils/enrich.js";
import type { SearchQuery } from "../models/schema.js";

const PROVIDERS_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export async function searchTitle(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, country } = (req.validated || {}) as SearchQuery;
    const resolvedCountry = (country || ENV.DEFAULT_COUNTRY).toUpperCase();

    const results = await tmdbSearchTV(title);
    const best = bestMatchFromTMDB(results, { romaji: title, english: null, native: null });

    let providers: string[] = [];
    let poster: string | null = null;

    if (best?.id) {
      poster = tmdbPosterUrl(best.poster_path, "w342");

      const cacheKey = `providers:${best.id}:${resolvedCountry}`;
      const cached = cache.get<string[]>(cacheKey);
      if (cached) {
        providers = cached;
      } else {
        const p = await tmdbTVProviders(best.id, resolvedCountry);
        providers = flattenProviders(p || undefined);
        cache.set(cacheKey, providers, PROVIDERS_TTL_MS);
      }
    }

    // Enriquecimiento MAL + Kitsu (si falla, no rompe)
    const enrich = await enrichFromMalAndKitsu(title);

    const data = best?.id
      ? {
          ids: { tmdb: best.id, mal: enrich.sources.mal?.id ?? null, kitsu: enrich.sources.kitsu?.id ?? null },
          title: best.name ?? title,
          poster: poster ?? enrich.posterAlt ?? null,
          providers,
          meta: {
            genres: enrich.genres,
            rating: enrich.rating,
            synopsis: enrich.synopsis,
            episodes: enrich.episodes,
            startDate: enrich.startDate
          }
        }
      : null;

    res.json({
      meta: { country: resolvedCountry, query: title, source: "TMDb + MAL + Kitsu" },
      data
    });
  } catch (e) {
    next(e);
  }
}
