// src/utils/formatAnimeList.ts
import { logger } from "../utils/logger.js";
import pLimit from "p-limit";
import { getTitleVariations } from "./tmdb.enrich.js"; // NUEVO
import {
  tmdbSearch,
  isAnimeCandidate,
  getTmdbSynopsis,
  getTmdbSpecificSynopsis,
  getTmdbImages,
  tmdbBackdropUrl,
  tmdbPosterUrl,
} from "../services/tmdb.service.js";
import { resolveProvidersForAnimeDetailed } from "./resolveProviders.js";
import { enrichFromMalAndKitsu } from "./enrich.js";
import { shikiSearchAnime, shikiGetScreenshots } from "../services/shikimori.service.js";
import { htmlToText, shorten } from "./sanitize.js";
import { extractStudio } from "./extractStudio.js";

const limit = pLimit(5);

export async function formatAnimeList(
  rawAnimeList: any[],
  country: string,
  baseSeason?: string,
  baseYear?: number,
) {
  const items = await Promise.all(
    rawAnimeList.map(async (anime) => {
      return limit(async () => {
        // 1. Título seguro
        const titleObj = anime.title || {};
        const title =
          titleObj.english ?? titleObj.romaji ?? titleObj.native ?? "Untitled";

        const kind = anime.format === "MOVIE" ? "movie" : "tv";

        // 2. Búsqueda en TMDB (Con Cascada Inteligente)
        let tmdbId: number | null = null;
        try {
          const titleVariants = getTitleVariations(title);
          if (titleVariants.length === 0) titleVariants.push(title);

          for (const variant of titleVariants) {
            const tmdbResults = await tmdbSearch(kind, variant);
            if (tmdbResults && tmdbResults.length > 0) {
              const bestTmdb =
                tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];
              if (bestTmdb) {
                tmdbId = bestTmdb.id;
                break; // Encontramos match, rompemos el ciclo
              }
            }
          }
        } catch (e) {
          logger.warn({ err: e }, `[formatAnimeList] TMDB search fail for ${title}`);
        }

        // 2b. Fallback: Kitsu/MAL cuando TMDB no encontró match
        let malKitsuFallback: Awaited<ReturnType<typeof enrichFromMalAndKitsu>> | null = null;
        let shikiScreenshot: string | null = null;
        if (!tmdbId) {
          malKitsuFallback = await enrichFromMalAndKitsu(title).catch(() => null);

          // Shikimori screenshots como backdrop fallback
          try {
            const shikiResults = await shikiSearchAnime(title, 1);
            if (shikiResults?.[0]?.id) {
              const screenshots = await shikiGetScreenshots(shikiResults[0].id, 1);
              shikiScreenshot = screenshots?.[0]?.original ?? null;
            }
          } catch (e) {
            logger.warn({ err: e }, `[formatAnimeList] Shikimori search fail for ${title}`);
          }
        }

        const yearFromSeason = anime.seasonYear;
        const isRealeasing = anime.status === "RELEASING";

        // 3. Proveedores (Pasamos el título crudo, la función ya hace la magia por dentro)
        const providers = await resolveProvidersForAnimeDetailed(
          anime.id,
          country,
          tmdbId,
          title,
          yearFromSeason,
          kind,
          isRealeasing,
        );

        // Sinopsis en español — season-aware (si hay tmdbId)
        const spanishSynopsis = tmdbId
          ? await getTmdbSpecificSynopsis(tmdbId, kind, "es-MX", anime.seasonYear, anime.startDate?.month, anime.nextAiringEpisode?.airingAt)
          : null;

        // 3b. TMDB images de alta calidad (2k/4k) — misma fuente que anime detail page
        let tmdbBackdrop: string | null = null;
        let tmdbPoster: string | null = null;
        if (tmdbId) {
          try {
            const imagesData = await getTmdbImages(tmdbId, kind);
            if (imagesData) {
              // Backdrop: filtrar >=1920px, ordenado por calidad
              const backdrops = (imagesData.backdrops ?? [])
                .filter((img: any) => !img.width || img.width >= 1920)
                .sort((a: any, b: any) => {
                  const scoreA = (a.iso_639_1 === null ? 50 : 0) + a.vote_average * 5 + (a.vote_count ?? 0);
                  const scoreB = (b.iso_639_1 === null ? 50 : 0) + b.vote_average * 5 + (b.vote_count ?? 0);
                  return scoreB - scoreA;
                });
              if (backdrops[0]) tmdbBackdrop = tmdbBackdropUrl(backdrops[0].file_path) ?? null;

              // Poster: mismo filtro, usar original para máxima calidad
              const posters = (imagesData.posters ?? [])
                .sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
              if (posters[0]) tmdbPoster = tmdbPosterUrl(posters[0].file_path, "original") ?? null;
            }
          } catch (e) {
            logger.warn({ err: e, tmdbId }, `[formatAnimeList] TMDB images fail for ${title}`);
          }
        }

        // 4. Meta datos limpios
        const hasSpanish = !!spanishSynopsis;
        const synopsis = htmlToText(spanishSynopsis || anime.description || "");
        const synopsisShort = shorten(synopsis, 140);
        const synopsisLang = synopsis ? (hasSpanish ? "es" : "en") : null;
        const mainStudio = extractStudio(anime.studios);

        const nextEpisodeAtISO = anime.nextAiringEpisode?.airingAt
          ? new Date(anime.nextAiringEpisode.airingAt * 1000).toISOString()
          : null;

        return {
          id: {
            anilist: anime.id,
            tmdb: tmdbId,
            mal: malKitsuFallback?.sources?.mal?.id ?? null,
            kitsu: malKitsuFallback?.sources?.kitsu?.id ?? null,
          },
          title,
          images: {
            poster:
              tmdbPoster
              ?? anime.coverImage?.extraLarge
              ?? anime.coverImage?.large
              ?? malKitsuFallback?.posterAlt
              ?? null,
            backdrop:
              tmdbBackdrop
              ?? anime.bannerImage
              ?? shikiScreenshot
              ?? null,
          },
          providers: providers.providers,
          meta: {
            genres: anime.genres ?? [],
            rating:
              typeof anime.averageScore === "number"
                ? anime.averageScore / 10
                : malKitsuFallback?.rating ?? null,
            synopsis,
            synopsisShort,
            synopsisLang,
            year: anime.seasonYear ?? baseYear ?? null,
            season: anime.season ?? baseSeason ?? null,
            episodes: anime.episodes ?? malKitsuFallback?.episodes ?? null,
            isAdult: anime.isAdult ?? false,
            nextEpisode: anime.nextAiringEpisode?.episode ?? null,
            nextEpisodeAt: nextEpisodeAtISO,
            status:
              anime.status ??
              (anime.nextAiringEpisode ? "ongoing" : "finished"),
            studio: mainStudio,
            type: anime.format ?? null,
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
        };
      });
    }),
  );

  // 5. Filtrar duplicados por ID de AniList
  return items.filter(
    (it, idx, self) =>
      self.findIndex((a) => a.id.anilist === it.id.anilist) === idx,
  );
}
