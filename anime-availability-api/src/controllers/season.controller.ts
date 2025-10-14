// src/controllers/season.controller.ts
import { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";
import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js"; // ✅ usa tu util centralizada

import {
  tmdbSearchTV,
  tmdbTVProviders,
  tmdbPosterUrl,
} from "../services/tmdb.service.js";

import { enrichFromMalAndKitsu } from "../utils/enrich.js";
import { AniMedia, AniTitle, TMDBSearchTVItem } from "../types/types.js";

const limit = pLimit(5);
const PROVIDERS_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const ANILIST_ENDPOINT = "https://graphql.anilist.co";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers locales (sin depender de otros services)
// ──────────────────────────────────────────────────────────────────────────────

function getCurrentSeasonYearLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1..12
  if (m >= 1 && m <= 3) return { season: "WINTER" as const, year: y };
  if (m >= 4 && m <= 6) return { season: "SPRING" as const, year: y };
  if (m >= 7 && m <= 9) return { season: "SUMMER" as const, year: y };
  return { season: "FALL" as const, year: y };
}

async function fetchSeasonAnimeLite(season: string, year: number): Promise<AniMedia[]> {
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, type: ANIME) {
          id
          title { romaji english native }
          season
          seasonYear
          episodes
        }
      }
    }
  `;
  // Pedimos 50; si quieres más, se puede paginar
  const body = { query, variables: { season, year, page: 1, perPage: 50 } };

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AniList seasonal error: ${res.status}`);

  const json = await res.json();
  const media = (json?.data?.Page?.media ?? []) as AniMedia[];
  return media;
}

// ❌ Eliminado: NAME_ALIASES y normalizeProviderNames locales
// ✅ Usaremos normalizeProviderNames importada de ../utils/providers.js

function pickBestTmdbMatch(
  tmdbList: TMDBSearchTVItem[],
  titles: AniTitle,
  seasonYear?: number | null
): TMDBSearchTVItem | undefined {
  const candidates = ([
    titles.english,
    titles.romaji,
    titles.native,
  ].filter(Boolean) as string[]).map((t) => t.toLowerCase());

  const starts: TMDBSearchTVItem[] = [];
  const contains: TMDBSearchTVItem[] = [];

  for (const item of tmdbList) {
    const name = (item.name || item.original_name || "").toLowerCase();
    if (!name) continue;
    if (candidates.some((t) => name.startsWith(t))) starts.push(item);
    else if (candidates.some((t) => name.includes(t))) contains.push(item);
  }
  const ordered = [...starts, ...contains];
  if (ordered.length === 0) return tmdbList[0];

  if (seasonYear) {
    const byYear = ordered.find(
      (i) => typeof i.first_air_date === "string" && i.first_air_date.slice(0, 4) === String(seasonYear)
    );
    if (byYear) return byYear;
  }
  return ordered[0];
}

// ──────────────────────────────────────────────────────────────────────────────
// Controller principal
// ──────────────────────────────────────────────────────────────────────────────

export async function getSeason(
  req: Request & { validated?: SeasonQuery },
  res: Response,
  next: NextFunction
) {
  try {
    // 1) Parámetros y defaults
    const { country, season, year } = ((req.validated || req.body) ?? {}) as SeasonQuery;
    const resolvedCountry = (country || ENV.DEFAULT_COUNTRY || "MX").toUpperCase();

    const current = getCurrentSeasonYearLocal();
    const resolved = {
      season: (season ?? current.season).toUpperCase(),
      year: Number.isFinite(year as number) ? (year as number) : current.year,
    };

    // 2) Obtener lista estacional desde AniList (ligero)
    const list = await fetchSeasonAnimeLite(resolved.season, resolved.year);

    // 3) Para cada anime: TMDB (search + best match + poster), providers (cache 12h)
    const items = await Promise.all(
      list.map((anime) =>
        limit(async () => {
          const titles = anime.title ?? {};
          const baseTitle = titles.english || titles.romaji || titles.native || "";

          // Buscar en TMDB y elegir mejor candidato
          const tmdbResults = await tmdbSearchTV(baseTitle);
          const best = pickBestTmdbMatch(tmdbResults, titles, anime.seasonYear ?? undefined);

          // Poster prefer TMDB
          const poster = best?.poster_path ? tmdbPosterUrl(best.poster_path, "w342") : null;

          // Providers (ProviderInfo[]) con cache por país
          let providers: string[] = [];
          if (best?.id) {
            const cacheKey = `providers:${best.id}:${resolvedCountry}`;
            const cached = memoryCache.get(cacheKey) as string[] | undefined;
            if (cached) {
              providers = cached;
            } else {
              const provList = await tmdbTVProviders(best.id, resolvedCountry); // ProviderInfo[]
              const names = (provList ?? []).map((p) => p.name);
              providers = normalizeProviderNames(names); // ✅ usa tu util central
              memoryCache.set(cacheKey, providers, PROVIDERS_TTL_MS);
            }
          }

          const altTitles = [
            titles.english,
            titles.native,
            titles.romaji && titles.romaji !== baseTitle ? titles.romaji : null,
          ]
            .filter(Boolean)
            .filter((t) => t !== baseTitle) as string[];

          return {
            id: { anilist: anime.id, tmdb: best?.id ?? null },
            title: baseTitle,
            altTitles,
            poster,
            season: anime.season ?? resolved.season,
            year: anime.seasonYear ?? resolved.year,
            providers,
            meta: {},
            sources: {},
          };
        })
      )
    );

    // 4) Enriquecimiento opcional (?enrich=1) con MAL/Kitsu
    const doEnrich = String(req.query.enrich ?? "0") === "1";
    const enriched = doEnrich
      ? await Promise.all(
          items.map((it) =>
            limit(async () => {
              const enrich = await enrichFromMalAndKitsu(it.title);
              return {
                ...it,
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
          )
        )
      : items;

    // 5) Deduplicar por anilistId y ordenar alfabéticamente
    const uniqueItems = enriched
      .filter((it, idx, self) => self.findIndex((a) => a.id.anilist === it.id.anilist) === idx)
      .sort((a, b) => a.title.localeCompare(b.title));

    // 6) Responder
    return res.json({
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
