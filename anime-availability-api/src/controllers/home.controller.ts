// src/controllers/home.controller.ts
import type { Request, Response, NextFunction } from "express";
import { memoryCache } from "../utils/cache.js";
import { ENV } from "../config/env.js";
import type { AniMedia } from "../types/animeCore.js";
import { resolveHeroArtwork } from "../utils/artwork.js";

/* helpers */
function stripHtml(input?: string | null) {
  if (!input) return null;
  const withBreaks = input.replace(/<br\s*\/?>/gi, "\n");
  const noTags = withBreaks.replace(/<\/?[^>]+(>|$)/g, "");
  const withoutSource = noTags.replace(/\(?\[?source:[^\)\]]+[\)\]]?/gi, "");
  return withoutSource
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function preferTitle(t?: {
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
}) {
  return t?.english ?? t?.romaji ?? t?.native ?? "Untitled";
}

function currentSeasonWindow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const season =
    m <= 3 ? "WINTER" : m <= 6 ? "SPRING" : m <= 9 ? "SUMMER" : "FALL";

  const start =
    season === "WINTER"
      ? `${y}0101`
      : season === "SPRING"
      ? `${y}0401`
      : season === "SUMMER"
      ? `${y}0701`
      : `${y}1001`;

  const end =
    season === "WINTER"
      ? `${y}0331`
      : season === "SPRING"
      ? `${y}0630`
      : season === "SUMMER"
      ? `${y}0930`
      : `${y}1231`;

  return { season, year: y, start, end };
}

// 🔹 AniList query para POPULARITY_DESC de ESTA temporada
async function fetchSeasonPopularStrict(): Promise<AniMedia[]> {
  const { season, year, start, end } = currentSeasonWindow();
  const ck = `anilist:hero-popular:${season}:${year}:v1`;
  const cached = memoryCache.get(ck);
  if (cached) return cached as AniMedia[];

  const query = `
    query ($season: MediaSeason!, $year: Int!, $perPage: Int!) {
      Page(page: 1, perPage: $perPage) {
        media(
          type: ANIME
          season: $season
          seasonYear: $year
          format_in: [TV, ONA, MOVIE, OVA, SPECIAL, TV_SHORT]
          sort: [POPULARITY_DESC]
          status_in: [RELEASING, NOT_YET_RELEASED]
        ) {
          id
          title { romaji english native }
          season
          seasonYear
          format
          status
          description
          averageScore
          popularity
          favourites
          isAdult
          coverImage { extraLarge large }
          bannerImage
          startDate { year month day }
          nextAiringEpisode { airingAt }
          genres
          studios { edges { isMain node { name } } }
        }
      }
    }
  `;

  const body = { query, variables: { season, year, perPage: 50 } };

  const res = await fetch(ENV.ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`AniList hero popular ${res.status}`);

  const json = await res.json();
  const raw: AniMedia[] = json?.data?.Page?.media ?? [];

  const toNum = (fd: AniMedia["startDate"]) =>
    fd?.year
      ? Number(
          `${fd.year}${String(fd.month ?? 1).padStart(2, "0")}${String(
            fd.day ?? 1
          ).padStart(2, "0")}`
        )
      : null;

  const startNum = Number(start);
  const endNum = Number(end);

  const filtered = raw
    .filter((m) => !m.isAdult)
    .filter((m) => {
      if (m.season === season && m.seasonYear === year) return true;
      const sd = toNum(m.startDate ?? null);
      return sd ? sd >= startNum && sd <= endNum : false;
    });

  memoryCache.set(ck, filtered, 1000 * 60 * 30);
  return filtered;
}

/* GET /home/hero — hero = títulos más popular de la temporada */

export async function getHomeHero(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const popular = await fetchSeasonPopularStrict();

    const heroItems: any[] = [];

    for (const m of popular) {
      if (heroItems.length >= 5) break; // 🔹 TOP 5 con backdrop bueno

      const title =
        m.title?.english ?? m.title?.romaji ?? m.title?.native ?? "Untitled";

      const { backdrop, artworkCandidates } = await resolveHeroArtwork(title, {
        bannerImage: m.bannerImage,
        coverImage: m.coverImage ?? undefined,
      });

      if (!backdrop) continue; // si no hay backdrop decente, saltamos

      const synopsis = stripHtml(m.description);
      const synopsisShort =
        synopsis && synopsis.length > 280
          ? synopsis.slice(0, 277) + "…"
          : synopsis;

      heroItems.push({
        id: { anilist: m.id, tmdb: null },
        title,
        poster: m.coverImage?.large ?? null,
        backdrop,
        banner: m.bannerImage ?? null,
        artworkCandidates,
        providers: [],
        meta: {
          genres: m.genres ?? [],
          rating:
            typeof m.averageScore === "number" ? m.averageScore / 10 : null,
          synopsis,
          synopsisShort,
          synopsisHTML: null,
          year: m.seasonYear ?? null,
          season: m.season ?? null,
          popularity: m.popularity ?? null,
          favourites: m.favourites ?? null,
          score:
            typeof m.averageScore === "number" ? m.averageScore / 10 : null,
          startDate: null,
          isAdult: !!m.isAdult,
          isNew: null,
          status: m.nextAiringEpisode ? "ongoing" : "finished",
          studio:
            m?.studios?.edges?.find((e: any) => e?.isMain)?.node?.name ?? null,
          type: m.format ?? null,
          episodes: m.episodes ?? null,
          progress: null,
          nextAiring: null,
          nextEpisodeAt: m?.nextAiringEpisode?.airingAt
            ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()
            : null,
        },
      });
    }

    return res.json({
      meta: {
        total: heroItems.length,
        source: "AniList POPULARITY_DESC + TMDB (hero)",
      },
      data: heroItems,
    });
  } catch (e) {
    next(e);
  }
}

