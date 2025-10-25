import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { SearchQuery } from "../models/schema.js";
import { searchAnime } from "../services/search.service.js";

const NAME_ALIASES: Record<string, string> = {
  Disney: "Disney+",
  "Disney+": "Disney+",
  "Disney Plus": "Disney+",
  "Star+": "Disney+",
  "Star Plus": "Disney+",
  Hulu: "Disney+",
  "Netflix (Basic)": "Netflix",
  "Amazon Prime": "Amazon Prime Video",
  "Prime Video": "Amazon Prime Video",
  "HBO Max": "Max",
  HBO: "Max",
  "Crunchyroll Amazon Channel": "Crunchyroll",
  CR: "Crunchyroll",
};

function normalizeProviderNames(names: string[]) {
  return Array.from(
    new Map(
      names.map((n) => [NAME_ALIASES[n] ?? n, NAME_ALIASES[n] ?? n])
    ).keys()
  ).sort((a, b) => a.localeCompare(b));
}

export async function searchTitle(
  req: Request & { validated?: SearchQuery },
  res: Response,
  next: NextFunction
) {
  try {
    const { title, country } = ((req.validated || req.body) ??
      {}) as SearchQuery & { country?: string };
    if (!title || title.trim().length < 1) {
      return res.status(400).json({ error: "Missing title" });
    }

    const resolvedCountry = (
      country ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();
    const limitParam = Number(req.query.limit ?? 12);
    const limit = Math.max(5, Math.min(limitParam, 15));

    const result = await searchAnime({
      query: title,
      region: resolvedCountry,
      limit,
    });

    const data = result.results.map((r) => {
      const providerNames = (r.providers ?? [])
        .map((p: any) => (typeof p === "string" ? p : p?.name))
        .filter((x: any): x is string => Boolean(x));

      return {
        ids: {
          tmdb: r.idMap.tmdb ?? null,
          anilist: r.idMap.anilist ?? null,
          mal: r.idMap.mal ?? null,
          kitsu: r.idMap.kitsu ?? null,
        },
        title: r.title,
        poster: r.poster ?? null,
        backdrop: r.backdrop ?? null,
        banner: r.banner ?? null,
        providers: normalizeProviderNames(providerNames),
        meta: {
          year: r.year ?? null,
          season: r.season ?? null,
          episodes: r.episodes ?? null,
          airingStatus: r.airingStatus ?? null,
          score: r.score ?? null,
          popularity: r.popularity ?? null,
          favourites: r.favourites ?? null,
          genres: r.genres ?? [],
          synopsis: r.synopsis ?? null,
          startDate: r.startDateISO ?? null,
          isAdult: typeof r.isAdult === "boolean" ? r.isAdult : null,
          nextEpisode: r.nextEpisode ?? null,
          nextEpisodeAt: r.nextEpisodeAtISO ?? null,
          status: r.nextEpisodeAtISO ? "ongoing" : "finished",
          studio: r.studio ?? null,
          type: r.type ?? null,
          progress: null, // pendiente de user-list
          nextAiring: r.nextEpisodeAtISO ? null : null, // lo puedes formatear en FE si quieres
        },
      };
    });

    return res.json({
      meta: {
        country: resolvedCountry,
        query: title,
        total: data.length,
        source: "AniList + TMDB (providers/poster)",
      },
      data,
    });
  } catch (error) {
    next(error);
  }
}
