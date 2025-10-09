import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import pLimit from "p-limit";
import {
  fetchSeasonAnime,
  getCurrentSeasonYear,
} from "../services/anilist.service.js";
import {
  tmdbSearchTV,
  tmdbTVProviders,
  tmdbPosterUrl,
} from "../services/tmdb.service.js";
import { bestMatchFromTMDB } from "../services/match.service.js";
import { cache } from "../utils/cache.js";
import { SeasonQuery } from "../models/schema.js";
import { enrichFromMalAndKitsu } from "../utils/enrich.js";

const limit = pLimit(5);
const PROVIDERS_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export async function getSeason(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { country, season, year } = (req.validated || {}) as SeasonQuery;
    const resolvedCountry = (country || ENV.DEFAULT_COUNTRY).toUpperCase();
    const resolved = {
      season: season ?? getCurrentSeasonYear().season,
      year: year ?? getCurrentSeasonYear().year,
    };

    // 1) Obtener lista de animes desde AniList
    const list = await fetchSeasonAnime({
      season: resolved.season,
      year: resolved.year,
    });

    // 2) Mapear cada anime y limpiar info
    const items = await Promise.all(
      list.map(async (anime) => {
        const titles = anime.title;
        const baseTitle =
          titles.english || titles.romaji || titles.native || "";

        // Buscar en TMDb
        const searchResults = await tmdbSearchTV(baseTitle);
        const best = bestMatchFromTMDB(searchResults, titles);

        let allProviders: string[] = [];
        let poster: string | null = null;

        if (best?.id) {
          poster = tmdbPosterUrl(best.poster_path, "w342");

          const cacheKey = `providers:${best.id}:${resolvedCountry}`;
          const cached = cache.get<string[]>(cacheKey);
          if (cached) {
            allProviders = cached;
          } else {
            const p = await limit(() =>
              tmdbTVProviders(best.id, resolvedCountry)
            );
            const merged = [
              ...(p?.flatrate || []).map((x) => x.provider_name),
              ...(p?.rent || []).map((x) => x.provider_name),
              ...(p?.buy || []).map((x) => x.provider_name),
            ];
            allProviders = Array.from(new Set(merged));
            cache.set(cacheKey, allProviders, PROVIDERS_TTL_MS);
          }
        }

        const altTitles = [
          titles.english,
          titles.native,
          titles.romaji !== baseTitle ? titles.romaji : null,
        ]
          .filter(Boolean)
          .filter((t) => t !== baseTitle);

        return {
          id: { anilist: anime.id, tmdb: best?.id ?? null },
          title: baseTitle,
          altTitles,
          poster,
          season: anime.season ?? resolved.season,
          year: anime.seasonYear ?? resolved.year,
          providers: allProviders,
          meta: {},
          sources: {},
        };
      })
    );

    const doEnrich = String(req.query.enrich || "0") === "1";
    const enrichedItems = await Promise.all(
      items.map(async (it) => {
        if (!doEnrich) return it;

        const enrich = await enrichFromMalAndKitsu(it.title);
        return {
          ...it,
          // si no hubo póster de TMDb, usa alternos de Kitsu/MAL
          poster: it.poster ?? enrich.posterAlt ?? null,
          meta: {
            ...(it.meta || {}),
            genres: enrich.genres,
            rating: enrich.rating,
            synopsis: enrich.synopsis,
            episodes: enrich.episodes ?? null,
            startDate: enrich.startDate ?? null,
          },
          sources: {
            ...(it.sources || {}),
            mal: enrich.sources.mal ?? null,
            kitsu: enrich.sources.kitsu ?? null,
          },
        };
      })
    );

    // 3) Limpiar duplicados y ordenar alfabéticamente
    const uniqueItems = enrichedItems
      .filter(
        (it, idx, self) =>
          self.findIndex((a) => a.id.anilist === it.id.anilist) === idx
      )
      .sort((a, b) => a.title.localeCompare(b.title));

    res.json({
      meta: {
        country: resolvedCountry,
        season: resolved.season,
        year: resolved.year,
        total: uniqueItems.length,
        source: "AniList + TMDb + (MAL+Kitsu opt-in)",
      },
      data: uniqueItems,
    });
  } catch (e) {
    next(e);
  }
}
