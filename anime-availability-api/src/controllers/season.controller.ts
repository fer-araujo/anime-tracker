import type { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

function getCurrentSeasonYearLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 1 && m <= 3) return { season: "WINTER" as const, year: y };
  if (m >= 4 && m <= 6) return { season: "SPRING" as const, year: y };
  if (m >= 7 && m <= 9) return { season: "SUMMER" as const, year: y };
  return { season: "FALL" as const, year: y };
}

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

    const sortParam =
      query.rank === "trending" ? "TRENDING_DESC" : "POPULARITY_DESC";

    const gql = `
      query ($season: MediaSeason, $seasonYear: Int, $page: Int, $sort: [MediaSort]) {
        Page(page: $page, perPage: 50) {
          media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: $sort, isAdult: false) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description
            episodes
            status
            format
            genres
            averageScore
            nextAiringEpisode { episode airingAt }
            studios(isMain: true) { edges { isMain node { name } } }
          }
        }
      }
    `;

    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: gql,
        variables: { season, seasonYear: year, page: 1, sort: [sortParam] },
      }),
    });

    if (!aniRes.ok)
      return res.status(aniRes.status).json({ error: "AniList Error" });

    const json = await aniRes.json();
    const rawMedia = json?.data?.Page?.media;

    if (!rawMedia || rawMedia.length === 0) {
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

    return res.json({
      meta: {
        country: resolvedCountry,
        season,
        year,
        total: uniqueItems.length,
        source: "AniList + TMDB",
      },
      data: uniqueItems,
    });
  } catch (err) {
    next(err);
  }
}
