// src/controllers/home.controller.ts
import { Request, Response, NextFunction } from "express";
import { memoryCache } from "../utils/cache.js";
import { tmdbSearchTV } from "../services/tmdb.service.js";
import { resolveArtwork } from "../utils/artwork.js";
import { ENV } from "../config/env.js";

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
  english?: string;
  romaji?: string;
  native?: string;
}) {
  return t?.english ?? t?.romaji ?? t?.native ?? "Untitled";
}
function seasonYearNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const season =
    m <= 3 ? "WINTER" : m <= 6 ? "SPRING" : m <= 9 ? "SUMMER" : "FALL";
  return { season, year: y };
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

// AniList query para trending de ESTA temporada (y año), más campos para filtrar por fecha
async function fetchTrendingSeasonStrict(): Promise<any[]> {
  const { season, year, start, end } = currentSeasonWindow();
  const ck = `anilist:trend:${season}:${year}:v3`;
  const cached = memoryCache.get(ck);
  if (cached) return cached as any[];

  const query = `
    query ($season: MediaSeason!, $year: Int!, $perPage: Int!) {
      Page(page: 1, perPage: $perPage) {
        media(
          type: ANIME
          season: $season
          seasonYear: $year
          format_in: [TV, ONA, MOVIE, OVA, SPECIAL, TV_SHORT]
          sort: [TRENDING_DESC]
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
          trending
          isAdult
          coverImage { extraLarge large medium }
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
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`AniList trending ${res.status}`);

  const json = await res.json();
  const raw: any[] = json?.data?.Page?.media ?? [];

  // Filtro adicional por ventana de fechas (para los que vienen con season/year incorrectos o vacíos):
  const toNum = (fd: any) =>
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
      // si season/year coinciden, pasa
      if (m.season === season && m.seasonYear === year) return true;
      // si no, intenta por rango de fechas (títulos sin season/year correctos)
      const sd = toNum(m.startDate);
      return sd ? sd >= startNum && sd <= endNum : false;
    });

  memoryCache.set(ck, filtered, 1000 * 60 * 30);
  return filtered;
}

/* GET /home/hero — mismo set que el shelf, pero SOLO items con arte 16:9 real */

export async function getHomeHero(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const serverOrigin = `${req.protocol}://${req.get("host")}`;

    const trending = await fetchTrendingSeasonStrict(); // tu función con TRENDING_DESC

    const mapped = await Promise.all(
      trending.map(async (m: any) => {
        const title = preferTitle(m.title);

        // 1) resolver tmdbId primero
        let tmdbId: number | null = null;
        try {
          const hit = (await tmdbSearchTV(title))?.[0];
          if (hit) tmdbId = hit.id;
        } catch {}

        // 2) resolver artwork SOLO landscape
        const art = await resolveArtwork(
          title,
          { bannerImage: m.bannerImage, tmdbId, coverImage: m.coverImage },
          { serverOrigin, requireLandscape: true }
        );

        const backdrop = art.backdrop;
        const artworkCandidates = art.artworkCandidates ?? [];

        const synopsis = stripHtml(m.description);
        const synopsisShort =
          synopsis && synopsis.length > 280
            ? synopsis.slice(0, 277) + "…"
            : synopsis;

        return {
          id: { anilist: m.id, tmdb: tmdbId },
          title,
          poster: m.coverImage?.large ?? m.coverImage?.medium ?? null,
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
              m?.studios?.edges?.find((e: any) => e?.isMain)?.node?.name ??
              null,
            type: m.format ?? null,
            episodes: m.episodes ?? null,
            progress: null,
            nextAiring: null,
            nextEpisodeAt: m?.nextAiringEpisode?.airingAt
              ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()
              : null,
          },
        };
      })
    );

    // filtra nulos (sin wide) y limita a 5
    const data = mapped.filter(Boolean).slice(0, 5);

    res.json({ meta: { total: data.length, source: "AniList+TMDB" }, data });
  } catch (e) {
    next(e);
  }
}
