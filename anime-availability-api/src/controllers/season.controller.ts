import type { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { ENV } from "../config/env.js";
import { SeasonQuery } from "../models/schema.js";
import { tmdbSearch, isAnimeCandidate } from "../services/tmdb.service.js";
import { htmlToText, shorten } from "../utils/sanitize.js";
import { extractStudio } from "../utils/extractStudio.js";
import { resolveProvidersForAnimeDetailed } from "../utils/resolveProviders.js";
import { normalizeTitle } from "../utils/tmdb.enrich.js"; // <--- IMPORTACIÓN CLAVE

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

export async function getSeason(
  req: Request & { validated?: SeasonQuery },
  res: Response,
  next: NextFunction,
) {
  try {
    const defaultSeason = getCurrentSeasonYearLocal();
    // Aseguramos que 'rank' venga del query, tipado rápido
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

    // 1. LÓGICA DE RANKING
    // Si el front pide "trending", usamos TRENDING_DESC, si no, POPULARITY_DESC
    const sortParam =
      query.rank === "trending" ? "TRENDING_DESC" : "POPULARITY_DESC";

    // 2. QUERY DINÁMICA
    // Agregamos $sort a la definición y lo usamos en media()
    const gql = `
      query ($season: MediaSeason, $seasonYear: Int, $page: Int, $sort: [MediaSort]) {
        Page(page: $page, perPage: 50) {
          pageInfo { hasNextPage lastPage }
          media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: $sort, isAdult: false) {
            id
            idMal
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
            studios(isMain: true) {
              edges { isMain node { name } }
            }
          }
        }
      }
    `;

    // 3. PASAR LA VARIABLE
    const variables = {
      season,
      seasonYear: year,
      page: 1,
      sort: [sortParam], // AniList espera un Array de sorts
    };

    // Fetch a AniList
    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables }),
    });

    if (!aniRes.ok) {
      return res.status(aniRes.status).json({ error: "AniList Error" });
    }

    const json = await aniRes.json();
    const data = json?.data?.Page;
    if (!data?.media) {
      return res.json({ meta: { season, year, count: 0 }, data: [] });
    }

    // Procesamos cada anime en paralelo con límite
    const items = await Promise.all(
      data.media.map(async (anime: any) => {
        return limit(async () => {
          const titleObj = anime.title || {};
          const title =
            titleObj.english ??
            titleObj.romaji ??
            titleObj.native ??
            "Untitled";

          // --- CORRECCIÓN: Buscamos ID de TMDB usando el título LIMPIO ---
          const searchTitle = normalizeTitle(title);
          const queryTerm = searchTitle.length > 0 ? searchTitle : title;

          let tmdbId: number | null = null;
          try {
            // Buscamos "jujutsu kaisen" en lugar de "jujutsu kaisen 2nd season"
            const tmdbResults = await tmdbSearch("tv", queryTerm);

            // Priorizamos resultados que sean Anime
            const bestTmdb =
              tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];
            tmdbId = bestTmdb?.id ?? null;
          } catch (e) {
            console.warn(`TMDB Season search fail for ${title}`, e);
          }

          // Resolvemos providers usando el ID correcto de TMDB
          const providers = await resolveProvidersForAnimeDetailed(
            anime.id,
            resolvedCountry,
            tmdbId,
            title,
          );

          const synopsis = htmlToText(anime.description);
          const synopsisShort = shorten(synopsis, 140);
          const mainStudio = extractStudio(anime.studios);

          const nextEpisodeAtISO = anime.nextAiringEpisode?.airingAt
            ? new Date(anime.nextAiringEpisode.airingAt * 1000).toISOString()
            : null;

          const type = anime.format ?? null;

          // Calculamos "releaseDate" aproximado para ordenar si hiciera falta
          const releaseDate = nextEpisodeAtISO || null;

          return {
            id: { anilist: anime.id, tmdb: tmdbId },
            title,
            images: {
              poster:
                anime.coverImage?.extraLarge ?? anime.coverImage?.large ?? null,
              backdrop: anime.bannerImage ?? null, // Usamos banner como backdrop por defecto en season list
            },
            providers: providers.providers,
            meta: {
              genres: anime.genres ?? [],
              rating:
                typeof anime.averageScore === "number"
                  ? anime.averageScore / 10
                  : null,
              synopsis,
              synopsisShort,
              synopsisHTML: null, // Opcional si lo necesitas
              year: year,
              season: season,
              episodes: anime.episodes ?? null,
              isAdult: false, // Filtramos isAdult: false en la query
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
                        (1000 * 60 * 60 * 24),
                    ),
                  )} days`
                : null,
            },
            releaseDate,
            sources: {},
          };
        });
      }),
    );

    // Filtrar duplicados y ordenar
    const uniqueItems = items
      .filter(
        (it, idx, self) =>
          self.findIndex((a) => a.id.anilist === it.id.anilist) === idx,
      )
      .sort((a, b) => {
        // Ordenar por Rating primero, luego alfabético
        const ar = a.meta?.rating ?? -1;
        const br = b.meta?.rating ?? -1;
        if (br !== ar) return br - ar;
        return a.title.localeCompare(b.title);
      });

    return res.json({
      meta: {
        country: resolvedCountry,
        season: season,
        year: year,
        total: uniqueItems.length,
        source: "AniList + TMDB",
      },
      data: uniqueItems,
    });
  } catch (err) {
    next(err);
  }
}
