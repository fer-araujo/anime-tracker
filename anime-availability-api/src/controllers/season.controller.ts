import { logger } from "../utils/logger.js";
import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import type { SeasonQuery } from "../models/schema.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import type { AniMedia } from "../types/animeCore.js";
import { setCacheControl, hybridCache } from "../utils/cache.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import {
  buildSeasonPageQuery,
  LEFTOVER_MEDIA_GQL,
  SEASON_ARCHIVE_GQL,
} from "../graphql/queries/seasonPage.gql.js";
import { getCurrentSeasonYearLocal } from "../utils/season.js";

/**
 * "Still airing" is only a meaningful idea for the season happening right now.
 *
 * Asking which shows carried over into Winter 2019 is archaeology, not
 * browsing, and answering it would double the cost of every historical season
 * request for a section nobody reads. So the leftovers query runs for exactly
 * one view — the current one, which is also the most requested and the most
 * cached.
 */
function isCurrentSeasonView(
  rawSeason: string,
  year: number,
  current: { season: string; year: number },
): boolean {
  return rawSeason === current.season.toUpperCase() && year === current.year;
}

/**
 * Series still airing that belong to an earlier season.
 *
 * The season filter excludes them by construction — their `season`/`seasonYear`
 * point somewhere else — so a two-cour show that started last quarter simply
 * vanishes from the page it is still airing on. AniList has no "not in this
 * season" filter, so the exclusion happens here against the ids the season
 * query already returned.
 */
async function fetchLeftovers(
  enabled: boolean,
  seasonAnimeIds: number[],
  country: string,
  season: string | undefined,
  year: number,
) {
  if (!enabled) return [];

  const json = await anilistFetch(LEFTOVER_MEDIA_GQL, { page: 1 });
  const rawMedia = json?.data?.Page?.media as AniMedia[] | undefined;
  if (!rawMedia?.length) return [];

  const alreadyShown = new Set(seasonAnimeIds);
  const carried = rawMedia.filter((m) => !alreadyShown.has(m.id));
  if (carried.length === 0) return [];

  // Light enrichment: this is a secondary shelf below the season itself, and
  // the expensive per-item extras fill fields its cards never render. Provider
  // badges still resolve, which is the part that would be noticed missing.
  const formatted = await formatAnimeList(carried, country, season, year, "light");

  return formatted.sort((a, b) => {
    const ar = a.meta?.rating ?? -1;
    const br = b.meta?.rating ?? -1;
    if (br !== ar) return br - ar;
    return a.title.localeCompare(b.title);
  });
}

export async function getSeason(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const defaultSeason = getCurrentSeasonYearLocal();
    const query = (req.validated || req.query) as SeasonQuery & {
      rank?: string;
    };

    const year = query.year || defaultSeason.year;
    const rawSeason = (query.season || defaultSeason.season).toUpperCase();
    const season = rawSeason === "ALL" ? undefined : rawSeason;
    const isAllSeasons = rawSeason === "ALL";
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
      ? 1000 * 60 * 60 // 1 hour for current year
      : 1000 * 60 * 60 * 24; // 24 hours for past/future years

    // --- Punto 3: "Populares" busca en todo el año, no solo una temporada ---
    const isPopularYearQuery = query.rank === "popular";
    const sortParam = isPopularYearQuery
      ? "POPULARITY_DESC"
      : query.rank === "trending"
        ? "TRENDING_DESC"
        : "POPULARITY_DESC";

    // Cuando rank=popular o season=ALL, omitimos el filtro `season` para abarcar el año completo.
    const skipSeasonFilter = isPopularYearQuery || isAllSeasons;
    const gql = buildSeasonPageQuery(skipSeasonFilter);

    const gqlVariables: Record<string, unknown> = {
      seasonYear: year,
      page: 1,
      sort: [sortParam],
    };
    if (!skipSeasonFilter) {
      gqlVariables.season = season;
    }

    const aniJson = await anilistFetch(gql, gqlVariables);

    if (!aniJson) {
      return res.status(503).json({ error: "AniList unavailable" });
    }

    const rawMedia = aniJson?.data?.Page?.media as AniMedia[] | undefined;

    if (!rawMedia || rawMedia.length === 0) {
      setCacheControl(res, "season");
      return res.json({ meta: { country: resolvedCountry, season: rawSeason, year, total: 0, source: "AniList + TMDB" }, data: [], leftovers: [] });
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

    const leftovers = await fetchLeftovers(
      // A year-wide or all-seasons view has no "carried over from elsewhere"
      // to speak of — everything releasing is already inside the window.
      !skipSeasonFilter && isCurrentSeasonView(rawSeason, year, defaultSeason),
      uniqueItems.map((it) => it.id.anilist),
      resolvedCountry,
      season,
      year,
    );

    setCacheControl(res, "season");

    const responseBody = {
      meta: {
        country: resolvedCountry,
        season: rawSeason,
        year,
        total: uniqueItems.length,
        source: "AniList + TMDB",
      },
      data: uniqueItems,
      // Separate key, not merged into `data`: these belong to a different
      // heading on the page, and folding them in would silently change the
      // meaning of `total` for every existing consumer.
      leftovers,
    };

    // Store in cache for future requests
    await hybridCache.set(cacheKey, responseBody, ttlMs);

    return res.json(responseBody);
  } catch (err) {
    next(err);
  }
}

const ARCHIVE_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;

/** Oldest year worth offering: AniList's seasonal coverage thins out before this. */
const ARCHIVE_EARLIEST_YEAR = 1960;

/**
 * How many years one request may cover.
 *
 * Each year costs exactly one AniList call (four aliased pages in a single
 * document), and this app shares a 25 requests/minute budget across every
 * endpoint. Twelve years is a generous screenful; letting a caller ask for
 * eighty would drain the limiter and stall unrelated traffic behind it.
 */
const ARCHIVE_MAX_YEARS = 12;
const ARCHIVE_DEFAULT_YEARS = 6;

type ArchivePage = {
  pageInfo?: { total?: number | null } | null;
  media?:
    | {
        id?: number | null;
        title?: { romaji?: string | null; english?: string | null } | null;
        coverImage?: {
          extraLarge?: string | null;
          large?: string | null;
        } | null;
        bannerImage?: string | null;
      }[]
    | null;
};

/**
 * Season index: how much aired each season, and one cover to represent it.
 *
 * The cover is not decoration. Without it this is a table of numbers, and the
 * whole reason to browse an archive is recognising a season by the show that
 * defined it — so the most popular title of each season is what fronts it.
 */
export async function getSeasonArchive(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentYear = getCurrentSeasonYearLocal().year;

    const requestedFrom = Number(req.query.from);
    const from =
      Number.isInteger(requestedFrom) &&
      requestedFrom >= ARCHIVE_EARLIEST_YEAR &&
      requestedFrom <= currentYear
        ? requestedFrom
        : currentYear;

    const requestedYears = Number(req.query.years);
    const years =
      Number.isInteger(requestedYears) && requestedYears > 0
        ? Math.min(requestedYears, ARCHIVE_MAX_YEARS)
        : ARCHIVE_DEFAULT_YEARS;

    const cacheKey = `season:archive:${from}:${years}`;
    const cached = await hybridCache.get(cacheKey);
    if (cached) {
      setCacheControl(res, "season");
      return res.json(cached);
    }

    // Descending: the archive reads newest first, same as the page renders it.
    const yearList: number[] = [];
    for (let y = from; y > from - years && y >= ARCHIVE_EARLIEST_YEAR; y--) {
      yearList.push(y);
    }

    // Sequential, not Promise.all: `anilistFetch` funnels everything through a
    // shared sliding-window limiter, so firing these in parallel would not make
    // them arrive sooner — it would only queue them somewhere less visible.
    const data: {
      year: number;
      seasons: {
        season: string;
        count: number;
        cover: string | null;
        title: string | null;
      }[];
    }[] = [];

    for (const year of yearList) {
      const json = await anilistFetch<Record<string, ArchivePage>>(
        SEASON_ARCHIVE_GQL,
        { year },
      );
      const payload = (json as { data?: Record<string, ArchivePage> })?.data;
      if (!payload) continue;

      data.push({
        year,
        seasons: ARCHIVE_SEASONS.map((season) => {
          const page = payload[season];
          const top = page?.media?.[0];
          return {
            season,
            count: page?.pageInfo?.total ?? 0,
            cover:
              top?.coverImage?.extraLarge ??
              top?.coverImage?.large ??
              top?.bannerImage ??
              null,
            title: top?.title?.english ?? top?.title?.romaji ?? null,
          };
        }),
      });
    }

    if (data.length === 0) {
      return res.status(503).json({ error: "AniList unavailable" });
    }

    const responseBody = { meta: { from, years: data.length }, data };

    // A season that has already ended never gains or loses entries, and the
    // current one moves slowly enough that a day-stale count is harmless.
    await hybridCache.set(cacheKey, responseBody, 1000 * 60 * 60 * 24);
    setCacheControl(res, "season");
    return res.json(responseBody);
  } catch (err) {
    next(err);
  }
}
