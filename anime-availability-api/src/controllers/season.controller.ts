// src/controllers/season.controller.ts
import type { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";
import {
  tmdbSearch,
  tmdbPosterUrl,
  tmdbBackdropUrl,
  isAnimeCandidate,
} from "../services/tmdb.service.js";
import type { AniMedia, AniTitle, TMDBSearchTVItem } from "../types/types.js";
import { htmlToText, shorten } from "../utils/sanitize.js";
import { extractStudio } from "../utils/extractStudio.js";
import {
  resolveProvidersForAnime,
  resolveProvidersForAnimeDetailed,
} from "../utils/resolveProviders.js";

const limit = pLimit(5);
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
  _season: string,
  year: number
): Promise<AniMedia[]> {
  const query = `
    query ($year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME
          seasonYear: $year
          format_in: [TV, ONA, MOVIE, OVA, SPECIAL, TV_SHORT]
          sort: [POPULARITY_DESC]
        ) {
          id
          title { romaji english native }
          season
          seasonYear
          episodes
          coverImage { extraLarge, large }
          bannerImage
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

  const body = { query, variables: { year, page: 1, perPage: 50 } };

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AniList seasonal error: ${res.status} - ${text}`);
  }

  const json = await res.json();
  const media = (json?.data?.Page?.media ?? []) as AniMedia[];
  return media;
}

async function fetchSeasonTrendingLite(
  season: string,
  year: number
): Promise<AniMedia[]> {
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME
          season: $season
          seasonYear: $year
          format_in: [TV, ONA, MOVIE, OVA, SPECIAL, TV_SHORT]
          sort: [TRENDING_DESC]
        ) {
          id
          title { romaji english native }
          season
          seasonYear
          episodes
          coverImage { extraLarge, large  }
          averageScore
          popularity
          favourites
          trending
          genres
          description
          isAdult
          startDate { year month day }
          nextAiringEpisode { episode airingAt }
          format
          status
          studios {
            edges { isMain node { name } }
          }
          bannerImage
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

function fuzzyDateToISO(
  fd?: { year?: number; month?: number; day?: number } | null
): string | null {
  if (!fd?.year) return null;
  const y = fd.year;
  const m = fd.month ?? 1;
  const d = fd.day ?? 1;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function stripCourAndPart(raw: string): string {
  return raw
    .replace(/\bCour\s*\d+\b/gi, "")
    .replace(/\bPart\s*\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function baseTitleCandidate(title: string) {
  return title
    .replace(/\b(vol(ume)?|season|cour|part)\s*\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeAniTitle(raw?: string | null): string | null {
  if (!raw) return null;
  return (
    baseTitleCandidate(
      raw.replace(/[^\p{Letter}\p{Number}\s]/gu, "").toLowerCase()
    )
      .replace(/\s{2,}/g, " ")
      .trim() || null
  );
}

function pickBestTmdbMatch(
  tmdbList: TMDBSearchTVItem[] | undefined,
  titles: AniTitle,
  seasonYear?: number | null
): TMDBSearchTVItem | undefined {
  if (!tmdbList || tmdbList.length === 0) return undefined;

  const animeOnly = tmdbList.filter(isAnimeCandidate);
  const basePool = animeOnly.length ? animeOnly : tmdbList;

  const candidateTitles = [titles.english, titles.romaji, titles.native].filter(
    Boolean
  ) as string[];

  const normalizedCandidates = candidateTitles
    .map((t) => normalizeAniTitle(t))
    .filter(Boolean) as string[];

  if (!normalizedCandidates.length) {
    return basePool[0];
  }

  const yearStr =
    typeof seasonYear === "number" && seasonYear > 1900
      ? String(seasonYear)
      : null;

  const buckets: {
    exact: TMDBSearchTVItem[];
    starts: TMDBSearchTVItem[];
    contains: TMDBSearchTVItem[];
  } = { exact: [], starts: [], contains: [] };

  for (const item of basePool) {
    const rawName = item.name || item.original_name || "";
    const nameNorm = normalizeAniTitle(rawName);
    if (!nameNorm) continue;

    for (const cand of normalizedCandidates) {
      if (nameNorm === cand) {
        buckets.exact.push(item);
        break;
      }
      if (nameNorm.startsWith(cand)) {
        buckets.starts.push(item);
        break;
      }
      if (nameNorm.includes(cand)) {
        buckets.contains.push(item);
        break;
      }
    }
  }

  const pickWithYear = (
    arr: TMDBSearchTVItem[]
  ): TMDBSearchTVItem | undefined => {
    if (!arr.length) return undefined;
    if (!yearStr) return arr[0];
    const withYear = arr.find(
      (it) =>
        typeof it.first_air_date === "string" &&
        it.first_air_date.slice(0, 4) === yearStr
    );
    return withYear ?? arr[0];
  };

  return (
    pickWithYear(buckets.exact) ??
    pickWithYear(buckets.starts) ??
    pickWithYear(buckets.contains) ??
    basePool[0]
  );
}

function inferKind(format?: string | null): "tv" | "movie" {
  return String(format).toUpperCase() === "MOVIE" ? "movie" : "tv";
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

    const rank = String(req.query.rank || "popular");

    const list =
      rank === "trending"
        ? await fetchSeasonTrendingLite(resolved.season, resolved.year)
        : await fetchSeasonAnimeLite(resolved.season, resolved.year);

    const items = await Promise.all(
      list.map((anime) =>
        limit(async () => {
          const titles = anime.title ?? {};
          const rawTitle =
            titles.english || titles.romaji || titles.native || "";

          const displayTitle = stripCourAndPart(rawTitle);

          const type = (anime as any)?.format ?? null;
          const kind = inferKind(type);

          // ✅ TMDB search según kind (tv/movie)
          let tmdbResults = await tmdbSearch(kind, rawTitle);
          if (!tmdbResults?.length) {
            const base = baseTitleCandidate(rawTitle);
            if (base && base !== rawTitle) {
              tmdbResults = await tmdbSearch(kind, base);
            }
          }

          const mainStudio = extractStudio(anime.studios);

          const bestMatch = pickBestTmdbMatch(
            tmdbResults || [],
            titles as AniTitle,
            anime.seasonYear ?? undefined
          );

          const posterAni =
            anime.coverImage?.extraLarge ?? anime.coverImage?.large ?? null;

          const posterTmdb =
            bestMatch?.poster_path && isAnimeCandidate(bestMatch)
              ? tmdbPosterUrl(bestMatch.poster_path, "w780")
              : null;

          const poster = posterAni ?? posterTmdb;

          const backdrop =
            bestMatch?.backdrop_path && isAnimeCandidate(bestMatch)
              ? tmdbBackdropUrl(bestMatch.backdrop_path, "w1280")
              : null;

          const banner = (anime as any)?.bannerImage ?? null;

          // ✅ Providers unificados usando el mismo kind
          const releaseDate =
            kind === "movie"
              ? (bestMatch as any)?.release_date ?? null
              : (bestMatch as any)?.first_air_date ?? null;

          // providers detallados
          const provResolved = await resolveProvidersForAnimeDetailed({
            kind,
            tmdbId: bestMatch?.id ?? null,
            title: rawTitle,
            country: resolvedCountry,
          });

          const providers = provResolved.providers;

          // availability
          const isFutureRelease =
            typeof releaseDate === "string" && releaseDate.length >= 10
              ? new Date(releaseDate).getTime() > Date.now()
              : false;

          const availability =
            providers.length > 0
              ? "available"
              : bestMatch?.id
              ? kind === "movie" && isFutureRelease
                ? "comingSoon"
                : provResolved.tmdbOk && provResolved.saOk
                ? "notAvailable"
                : "unknown"
              : "unknown";

          const altTitles = [
            rawTitle,
            ...[
              titles.english,
              titles.native,
              titles.romaji && titles.romaji !== rawTitle
                ? titles.romaji
                : null,
            ]
              .filter(Boolean)
              .filter((t) => t !== displayTitle && t !== rawTitle),
          ] as string[];

          const nextEpisodeAtISO =
            typeof anime.nextAiringEpisode?.airingAt === "number"
              ? new Date(anime.nextAiringEpisode.airingAt * 1000).toISOString()
              : null;

          const synopsisHtml = anime.description ?? null;
          const synopsisText = anime.description
            ? htmlToText(anime.description)
            : null;

          return {
            id: { anilist: anime.id, tmdb: bestMatch?.id ?? null },
            title: displayTitle,
            altTitles,
            poster,
            backdrop,
            banner,
            season: anime.season ?? resolved.season,
            year: anime.seasonYear ?? resolved.year,
            providers,
            availability,
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
              synopsisHtml,
              synopsis: synopsisText,
              synopsisShort: synopsisText ? shorten(synopsisText, 220) : null,
              episodes: anime.episodes ?? null,
              startDate: fuzzyDateToISO(anime.startDate),
              isAdult:
                typeof anime.isAdult === "boolean" ? anime.isAdult : null,
              nextEpisode: anime.nextAiringEpisode?.episode ?? null,
              nextEpisodeAt: nextEpisodeAtISO,
              status: anime.nextAiringEpisode ? "ongoing" : "finished",
              studio: mainStudio,
              type,
              progress: null,
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
            releaseDate,
            sources: {},
          };
        })
      )
    );

    const uniqueItems = items
      .filter(
        (it, idx, self) =>
          self.findIndex((a) => a.id.anilist === it.id.anilist) === idx
      )
      .sort((a, b) => {
        const ar = a.meta?.rating ?? -1;
        const br = b.meta?.rating ?? -1;
        if (br !== ar) return br - ar;
        return a.title.localeCompare(b.title);
      });

    return res.json({
      meta: {
        country: resolvedCountry,
        season: resolved.season,
        year: resolved.year,
        total: uniqueItems.length,
        source: "AniList + TMDb + StreamingAvailability (season core)",
      },
      data: uniqueItems,
    });
  } catch (err) {
    next(err);
  }
}
