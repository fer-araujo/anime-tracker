import { logger } from "../utils/logger.js";
import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import { setCacheControl, hybridCache } from "../utils/cache.js";
import { buildSeasonPageQuery } from "../graphql/queries/seasonPage.gql.js";
import { getCurrentSeasonYearLocal } from "../utils/season.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export async function getSeason(
  req: Request & { validated?: SeasonQuery },
  res: Response,
  next: NextFunction,
) {
  try {
    const defaultSeason = getCurrentSeasonYearLocal();
    const query = (req.validated || req.query) as SeasonQuery & {
      rank?: string;
    };

    const year = query.year || defaultSeason.year;
    const season = (query.season || defaultSeason.season).toUpperCase();
    const resolvedCountry = (
      query.country ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    // --- Cache: skip heavy enrichment for repeated requests ---
    const cacheKey = `season:${resolvedCountry}:${year}:${season}:${query.rank ?? "default"}`;
    const cached = await hybridCache.get(cacheKey);
    if (cached) {
      logger.info(`[season] Cache HIT for ${cacheKey}`);
      setCacheControl(res, "season");
      return res.json(cached);
    }

    // --- Determine TTL based on recency ---
    const now = new Date();
    const currentYear = now.getFullYear();
    const isCurrentYear = year === currentYear;
    const ttlMs = isCurrentYear
      ? 1000 * 60 * 60      // 1 hour for current year
      : 1000 * 60 * 60 * 24; // 24 hours for past/future years

    // --- Punto 3: "Populares" busca en todo el año, no solo una temporada ---
    const isPopularYearQuery = query.rank === "popular";
    const sortParam = isPopularYearQuery ? "POPULARITY_DESC"
      : query.rank === "trending" ? "TRENDING_DESC"
      : "POPULARITY_DESC";

    // Cuando rank=popular, omitimos el filtro `season` para abarcar el año completo.
    // Así "Animes populares" y "Trending esta temporada" no duplican contenido.
    const gql = buildSeasonPageQuery(isPopularYearQuery);

    const gqlVariables: Record<string, unknown> = {
      seasonYear: year,
      page: 1,
      sort: [sortParam],
    };
    if (!isPopularYearQuery) {
      gqlVariables.season = season;
    }

    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: gql,
        variables: gqlVariables,
      }),
    });

    if (!aniRes.ok)
      return res.status(aniRes.status).json({ error: "AniList Error" });

    const json = await aniRes.json();
    const rawMedia = json?.data?.Page?.media;

    if (!rawMedia || rawMedia.length === 0) {
      setCacheControl(res, 'season');
      return res.json({ meta: { season, year, count: 0 }, data: [] });
    }

    // --- MAGIA AQUÍ: Usamos la utilidad ---
    const uniqueItems = await formatAnimeList(
      rawMedia,
      resolvedCountry,
      season,
      year,
    );

    // Ordenar final
    uniqueItems.sort((a, b) => {
      const ar = a.meta?.rating ?? -1;
      const br = b.meta?.rating ?? -1;
      if (br !== ar) return br - ar;
      return a.title.localeCompare(b.title);
    });

    setCacheControl(res, 'season');

    const responseBody = {
      meta: {
        country: resolvedCountry,
        season,
        year,
        total: uniqueItems.length,
        source: "AniList + TMDB",
      },
      data: uniqueItems,
    };

    // Store in cache for future requests
    await hybridCache.set(cacheKey, responseBody, ttlMs);

    return res.json(responseBody);
  } catch (err) {
    next(err);
  }
}
