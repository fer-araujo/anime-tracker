import { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";
import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import {
  tmdbSearchTV,
  tmdbTVProviders,
  tmdbPosterUrl,
  tmdbBackdropUrl,
  tmdbImageUrl,
} from "../services/tmdb.service.js";
import { enrichFromMalAndKitsu } from "../utils/enrich.js";
import { AniMedia, AniTitle, TMDBSearchTVItem } from "../types/types.js";

const limit = pLimit(5);
const PROVIDERS_TTL_MS = 1000 * 60 * 60 * 12;
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

async function fetchSeasonAnimeLite(
  season: string,
  year: number
): Promise<AniMedia[]> {
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, type: ANIME) {
          id
          title { romaji english native }
          season
          seasonYear
          episodes
          coverImage { large medium }
          averageScore
          popularity
          favourites
          genres
          description
          isAdult
          startDate { year month day }
          nextAiringEpisode { episode airingAt }
          format
          studios {
            edges {
              isMain
              node { name }
            }
          }
        }
      }
    }
  `;
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

function baseTitleCandidate(title: string) {
  return title
    .replace(/\b(vol(ume)?|season|part)\s*\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fuzzyDateToISO(
  fd?: { year?: number; month?: number; day?: number } | null
): string | null {
  if (!fd?.year) return null;
  const y = fd.year,
    m = fd.month ?? 1,
    d = fd.day ?? 1;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function pickBestTmdbMatch(
  tmdbList: TMDBSearchTVItem[],
  titles: AniTitle,
  seasonYear?: number | null
): TMDBSearchTVItem | undefined {
  const candidates = (
    [titles.english, titles.romaji, titles.native].filter(Boolean) as string[]
  ).map((t) => t.toLowerCase());

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
      (i) =>
        typeof i.first_air_date === "string" &&
        i.first_air_date.slice(0, 4) === String(seasonYear)
    );
    if (byYear) return byYear;
  }
  return ordered[0];
}

export async function getSeason(
  req: Request & { validated?: SeasonQuery },
  res: Response,
  next: NextFunction
) {
  try {
    const { country, season, year } = ((req.validated || req.body) ??
      {}) as SeasonQuery;
    const resolvedCountry = (
      country ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    const current = getCurrentSeasonYearLocal();
    const resolved = {
      season: (season ?? current.season).toUpperCase(),
      year: Number.isFinite(year as number) ? (year as number) : current.year,
    };

    const list = await fetchSeasonAnimeLite(resolved.season, resolved.year);

    const items = await Promise.all(
      list.map((anime) =>
        limit(async () => {
          const titles = anime.title ?? {};
          const mainTitle =
            titles.english || titles.romaji || titles.native || "";

          let usedBaseTitle = false;
          let tmdbResults = await tmdbSearchTV(mainTitle);

          if (!tmdbResults?.length) {
            const base = baseTitleCandidate(mainTitle);
            if (base && base !== mainTitle) {
              usedBaseTitle = true;
              tmdbResults = await tmdbSearchTV(base);
            }
          }

          const mainStudio =
            anime?.studios?.edges?.find((e: any) => e?.isMain)?.node?.name ??
            anime?.studios?.edges?.[0]?.node?.name ??
            null;

          const type =
            (anime as any)?.format /* TV | ONA | MOVIE | OVA | SPECIAL ... */ ??
            null;

          const bestMatch = pickBestTmdbMatch(
            tmdbResults || [],
            titles,
            anime.seasonYear ?? undefined
          );

          // NUEVO: backdrop/hero para HERO BANNER (prioriza backdrop 16:9)
          const posterLg = bestMatch?.poster_path
            ? tmdbPosterUrl(bestMatch.poster_path, "w780") // nítido para hero/card
            : anime.coverImage?.large ?? anime.coverImage?.medium ?? null;

          // nuevo: backdrop amplio
          const backdrop = bestMatch?.backdrop_path
            ? tmdbBackdropUrl(bestMatch.backdrop_path, "w1280")
            : null;

          // opcional: AniList tiene banner horizontal ideal para hero
          // agrega "bannerImage" en tu GQL (Media.bannerImage) y úsalo aquí:
          const banner = (anime as any)?.bannerImage ?? null;
          let providers: string[] = [];
          if (bestMatch?.id) {
            const cacheKey = `providers:${bestMatch.id}:${resolvedCountry}`;
            const cached = memoryCache.get(cacheKey) as string[] | undefined;

            if (cached) {
              providers = cached;
            } else {
              const provList = await tmdbTVProviders(
                bestMatch.id,
                resolvedCountry
              );
              const names = (provList ?? []).map((p) => p.name);
              providers = normalizeProviderNames(names);
              memoryCache.set(cacheKey, providers, PROVIDERS_TTL_MS);
            }
          }

          const altTitles = [
            titles.english,
            titles.native,
            titles.romaji && titles.romaji !== mainTitle ? titles.romaji : null,
          ]
            .filter(Boolean)
            .filter((t) => t !== mainTitle) as string[];

          const nextEpisodeAtISO =
            typeof anime.nextAiringEpisode?.airingAt === "number"
              ? new Date(anime.nextAiringEpisode.airingAt * 1000).toISOString()
              : null;

          return {
            id: { anilist: anime.id, tmdb: bestMatch?.id ?? null },
            title: mainTitle,
            altTitles,
            poster: posterLg,
            backdrop,
            banner,
            season: anime.season ?? resolved.season,
            year: anime.seasonYear ?? resolved.year,
            providers,
            meta: {
              genres: anime.genres ?? [],
              rating:
                typeof anime.averageScore === "number"
                  ? anime.averageScore / 10
                  : null,
              popularity:
                typeof (anime as any).popularity === "number"
                  ? (anime as any).popularity
                  : null,
              favourites:
                typeof (anime as any).favourites === "number"
                  ? (anime as any).favourites
                  : null,
              synopsis: anime.description ?? null,
              episodes: anime.episodes ?? null,
              startDate: fuzzyDateToISO(anime.startDate),
              isAdult:
                typeof anime.isAdult === "boolean" ? anime.isAdult : null,
              nextEpisode: anime.nextAiringEpisode?.episode ?? null,
              nextEpisodeAt: nextEpisodeAtISO,
              status: anime.nextAiringEpisode ? "ongoing" : "finished",
              studio: mainStudio,
              type,
              progress: null, // esto vendrá de user-list más adelante
              nextAiring: anime.nextAiringEpisode?.airingAt
                ? `in ${Math.max(
                    1,
                    Math.round(
                      (anime.nextAiringEpisode.airingAt * 1000 - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )} days`
                : null,
            },
            sources: {},
          };
        })
      )
    );

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
                  genres: it.meta?.genres?.length
                    ? it.meta.genres
                    : enrich.genres,
                  rating: it.meta?.rating ?? enrich.rating,
                  synopsis: it.meta?.synopsis ?? enrich.synopsis,
                  episodes: it.meta?.episodes ?? enrich.episodes ?? null,
                  startDate: it.meta?.startDate ?? enrich.startDate ?? null,
                  status: it.meta?.status ?? null,
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

    const uniqueItems = enriched
      .filter(
        (it, idx, self) =>
          self.findIndex((a) => a.id.anilist === it.id.anilist) === idx
      )
      .sort((a, b) => {
        const ar = a.meta?.rating ?? -1;
        const br = b.meta?.rating ?? -1;
        if (br !== ar) return br - ar; // ⭐ primero mayor rating
        return a.title.localeCompare(b.title); // tie-breaker por título
      });

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
  } catch (err) {
    next(err);
  }
}
