// src/utils/artwork.ts
import { logger } from "../utils/logger.js";
import type { ArtworkCandidate } from "../types/animeCore.js";
import {
  tmdbSearch,
  tmdbBackdropUrl,
  isAnimeCandidate,
  getTmdbImages,
  resolveTmdbSeasonNumber,
  getTmdbSeasonImages,
  getTmdbExternalIds,
} from "../services/tmdb.service.js";
import { getFanartTvArtwork } from "../services/fanart.service.js";
import { getTitleVariations, isSeasonSequel } from "./tmdb.enrich.js";

export type BasicAniListMedia = {
  bannerImage?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
  } | null;
  format?: string | null;
};

export function pickBestBackdrop(
  candidates: ArtworkCandidate[] | undefined,
  opts?: { requireLandscape?: boolean; minAspect?: number },
): { backdrop: string | null; artworkCandidates: ArtworkCandidate[] } {
  const { requireLandscape = false, minAspect = 1.45 } = opts ?? {};

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { backdrop: null, artworkCandidates: [] };
  }

  const wide = candidates.filter((c) => (c.aspect ?? 0) >= minAspect);
  if (requireLandscape && wide.length === 0) {
    return { backdrop: null, artworkCandidates: candidates };
  }

  const usable = wide.length > 0 ? wide : candidates;
  const best = usable[0];
  const url = best.url_1280 ?? best.url_orig ?? best.url_780 ?? null;

  return { backdrop: url, artworkCandidates: candidates };
}

// Helper para URL de imagen normal (para logos)
const tmdbImageUrl = (path: string | null, size = "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/**
 * Resuelve artwork (backdrop, logo, tmdbId) para un anime.
 *
 * REGLAS ARQUITECTÓNICAS (aplicar estrictamente):
 *
 * 1. BACKDROPS (FORZAR RAÍZ):
 *    - Prohibido extraer backdrops específicos de temporada.
 *    - Siempre usar el backdrop principal del TV Show (/tv/{id}/images)
 *      para mantener proporciones correctas y estética cinemática en TODAS
 *      las temporadas, incluyendo secuelas.
 *
 * 2. LOGOS (CASCADA ESTRICTA):
 *    - Paso 1: Intentar logo específico de la temporada solicitada.
 *    - Paso 2: Si no existe, heredar logo principal del TV Show (root level).
 *    - Paso 3: Retornar null SÓLO si ambos fallan (frontend usa texto plano).
 */
export async function resolveHeroArtwork(
  searchTitle: string,
  kind: "tv" | "movie",
  media: { bannerImage?: string | null; coverImage?: any },
  aniStartDate?: { year?: number; month?: number } | null,
  opts?: { allowSeasonBackdrop?: boolean },
): Promise<{ backdrop: string | null; logo: string | null; artworkCandidates: any[]; tmdbId: number | null }> {
  let tmdbId: number | null = null;
  let backdrop: string | null = null;
  let logo: string | null = null;
  let artworkCandidates: any[] = [];
  let bestTmdb: any = null;

  try {
    // Búsqueda TMDB (siempre necesitamos el tmdbId para providers)
    const titleVariants = getTitleVariations(searchTitle);

    for (const variant of titleVariants) {
      const tmdbResults = await tmdbSearch(kind, variant);
      if (tmdbResults && tmdbResults.length > 0) {
        bestTmdb = tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];

        if (bestTmdb) {
          logger.info(`[artwork] Match encontrado usando: "${variant}"`);
          break;
        }
      }
    }

    if (bestTmdb && bestTmdb.id) {
      tmdbId = bestTmdb.id;

      // ----------------------------------------------------------------
      // PASO 1: BACKDROPS + LOGO BASE — Siempre desde /tv/{id}/images (raíz)
      // ----------------------------------------------------------------
      // REGLA: Prohibido usar backdrops de temporada específica. Todas las
      // temporadas (incluyendo secuelas) usan el backdrop principal del TV
      // Show para mantener consistencia visual y proporciones correctas.
      // ----------------------------------------------------------------
      const imagesData = await getTmdbImages(tmdbId as number, kind);

      if (imagesData) {
        // Backdrops root level
        if (imagesData.backdrops?.length > 0) {
          const highQualityArt = imagesData.backdrops
            .filter((img: any) => img.width >= 1920)
            .sort((a: any, b: any) => {
              const scoreA =
                (a.iso_639_1 === null ? 50 : 0) +
                a.vote_average * 5 +
                a.vote_count;
              const scoreB =
                (b.iso_639_1 === null ? 50 : 0) +
                b.vote_average * 5 +
                b.vote_count;
              return scoreB - scoreA;
            });

          artworkCandidates = highQualityArt.map((img: any) => ({
            url_original: tmdbBackdropUrl(img.file_path, "original"),
            width: img.width,
            is_textless: img.iso_639_1 === null,
          }));

          if (highQualityArt[0]) {
            backdrop =
              tmdbBackdropUrl(highQualityArt[0].file_path, "w1280") ?? null;
          }
        }

        // Logo base del TV Show (Paso 2 de cascada para secuelas)
        if (imagesData.logos?.length > 0) {
          const bestLogo = imagesData.logos
            .filter((l: any) => l.iso_639_1 === "en" || l.iso_639_1 === null)
            .sort((a: any, b: any) => b.vote_average - a.vote_average)[0];

          if (bestLogo) {
            logo = tmdbImageUrl(bestLogo.file_path, "original");
          }
        }
      }

      // Fallback al backdrop del search result si TMDB images no devolvió nada
      if (!backdrop && bestTmdb.backdrop_path) {
        backdrop = tmdbBackdropUrl(bestTmdb.backdrop_path, "w1280") ?? null;
      }

      // ----------------------------------------------------------------
      // PASO 1.5: fanart.tv — Primary artwork source for TV shows
      // fanart.tv wins per category (logo, backdrop). TMDB fills gaps
      // for any category where fanart.tv returns no data.
      // Movies (kind === "movie") are skipped entirely.
      // ----------------------------------------------------------------
      if (kind === "tv" && tmdbId) {
        try {
          const extIds = await getTmdbExternalIds(tmdbId);
          const tvdbId = extIds?.tvdb_id;

          if (tvdbId) {
            const fanartData = await getFanartTvArtwork(tvdbId);

            if (fanartData) {
              // Logo: fanart.tv wins if it has one, else keep TMDB logo
              if (fanartData.logoUrl) {
                logo = fanartData.logoUrl;
              }

              // Backdrop: fanart.tv showbackground wins if it exists
              if (fanartData.backdropUrl) {
                backdrop = fanartData.backdropUrl;
              }

              // Artwork candidates: fanart.tv backdrops + season art
              // prepended to TMDB candidates array
              const fanartCandidates: any[] = [];

              if (fanartData.backdropUrl) {
                fanartCandidates.push({
                  url_original: fanartData.backdropUrl,
                  width: null,
                  is_textless: true,
                  source: "fanart-tv",
                });
              }

              for (const sp of fanartData.seasonPosters) {
                fanartCandidates.push({
                  url_original: sp.url,
                  width: null,
                  is_textless: true,
                  source: "fanart-tv-seasonposter",
                  season: sp.season,
                });
              }
              for (const sb of fanartData.seasonBanners) {
                fanartCandidates.push({
                  url_original: sb.url,
                  width: null,
                  is_textless: true,
                  source: "fanart-tv-seasonbanner",
                  season: sb.season,
                });
              }
              for (const st of fanartData.seasonThumbs) {
                fanartCandidates.push({
                  url_original: st.url,
                  width: null,
                  is_textless: true,
                  source: "fanart-tv-seasonthumb",
                  season: st.season,
                });
              }

              if (fanartCandidates.length > 0) {
                artworkCandidates = [
                  ...fanartCandidates,
                  ...artworkCandidates,
                ];
              }
            }
          } else {
            logger.debug(
              { tmdbId, searchTitle },
              "[artwork] TVDB ID not found, skipping fanart.tv",
            );
          }
        } catch (e) {
          logger.warn(
            { err: e, tmdbId, searchTitle },
            "[artwork] fanart.tv integration failed, falling back to TMDB",
          );
        }
      }

      // ----------------------------------------------------------------
      // PASO 2: SECUELA — Solo override de logo desde temporada específica
      // ----------------------------------------------------------------
      // El backdrop SIEMPRE es root; solo el logo puede ser específico
      // de temporada (Paso 1 de cascada de logos).
      // ----------------------------------------------------------------
      if (isSeasonSequel(searchTitle) && kind === "tv" && tmdbId) {
        const seasonNumber = await resolveTmdbSeasonNumber(
          tmdbId,
          aniStartDate?.year,
          aniStartDate?.month,
        );

        if (seasonNumber) {
          const seasonImages = await getTmdbSeasonImages(tmdbId, seasonNumber);

          // Logo: Paso 1 — si existe logo de temporada, prevalece sobre el root
          if (seasonImages?.logos?.length) {
            const bestSeasonLogo = seasonImages.logos
              .filter((l: any) => l.iso_639_1 === "en" || l.iso_639_1 === null)
              .sort((a: any, b: any) => b.vote_average - a.vote_average)[0];
            if (bestSeasonLogo) {
              logo = tmdbImageUrl(bestSeasonLogo.file_path, "original");
            }
          }
        }
      }

      // ----------------------------------------------------------------
      // PASO 3: BACKDROP DE TEMPORADA (solo detail pages, con quality gate)
      // ----------------------------------------------------------------
      // Cuando allowSeasonBackdrop=true (anime detail pages), intentamos
      // backdrop específico de la temporada. Quality gate: width >= 1280
      // y aspect ratio >= 1.5 (landscape). Si no pasa, queda el root.
      // ----------------------------------------------------------------
      if (opts?.allowSeasonBackdrop && kind === "tv" && tmdbId) {
        const seasonNumber = await resolveTmdbSeasonNumber(
          tmdbId,
          aniStartDate?.year,
          aniStartDate?.month,
        );

        if (seasonNumber) {
          const seasonImages = await getTmdbSeasonImages(tmdbId, seasonNumber);

          if (seasonImages?.backdrops?.length) {
            // Quality gate: filtrar por resolución mínima y aspecto landscape
            const usableBackdrops = seasonImages.backdrops
              .filter((img: any) => {
                if (!img.width || img.width < 1280) return false;
                const aspect = img.width / (img.height || 1);
                return aspect >= 1.5;
              })
              .sort(
                (a: any, b: any) =>
                  ((b.vote_average || 0) * (b.vote_count || 0)) -
                  ((a.vote_average || 0) * (a.vote_count || 0)),
              );

            if (usableBackdrops.length > 0) {
              backdrop = tmdbBackdropUrl(usableBackdrops[0].file_path, "w1280") ?? null;
              logger.info(
                `[artwork] Using season-specific backdrop (S${seasonNumber}) for "${searchTitle}"`,
              );
            }
          }
        }
      }
    }
  } catch (e) {
    logger.warn({ err: e }, "[artwork] Resolution failed");
  }

  // Fallback global a AniList banner (cubre casos sin TMDB)
  if (!backdrop) {
    backdrop = media.bannerImage ?? null;
  }

  return { backdrop, logo, artworkCandidates, tmdbId };
}