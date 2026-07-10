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
 * 1. BACKDROPS (PRIORIDAD):
 *    - fanart.tv showbackground gana por calidad (mejor curado para anime).
 *    - TMDB root-level es el fallback curado/mainstream.
 *    - Season-specific backdrops SIEMPRE se evalúan con premium quality gate.
 *    - Season banners/posters de fanart.tv van a artworkCandidates (galería),
 *      NO al hero backdrop (son angostos, no aptos para hero).
 *    - AniList bannerImage es el último recurso global.
 *
 * 2. LOGOS (CASCADA ESTRICTA):
 *    - Paso 1: Intentar logo de temporada (solo secuelas).
 *    - Paso 2: fanart.tv logo si existe.
 *    - Paso 3: Logo base del TV Show desde TMDB root.
 *    - Paso 4: null (frontend usa texto plano).
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
      // PASO 1.5: fanart.tv — Additional artwork for TV shows
      // Backdrop: fanart.tv showbackground WINS over TMDB (better quality
      // and curation for most anime). Season banners/posters/thumbs go
      // to artworkCandidates ONLY (they're narrow banners, not hero-grade).
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

              // Backdrop: fanart.tv showbackground wins over TMDB (quality)
              if (fanartData.backdropUrl) {
                backdrop = fanartData.backdropUrl;
              }

              // Artwork candidates: ALL fanart showbackgrounds + season art
              const fanartCandidates: any[] = [];

              // All showbackgrounds (gallery alternatives)
              for (const sb of fanartData.backdropCandidates) {
                fanartCandidates.push({
                  url_original: sb.url,
                  width: sb.width ?? null,
                  is_textless: true,
                  source: "fanart-tv",
                  likes: sb.likes,
                });
              }

              // Season-specific art (banners/posters/thumbs — gallery only)
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
      // PASO 3: BACKDROP DE TEMPORADA (hero + detail) — Siempre activo
      // ----------------------------------------------------------------
      // Busca backdrop específico de la temporada. PREMIUM quality gate:
      // width >= 1920 (true 2k/4k), aspect >= 1.6 (cinematic widescreen).
      // Si pasa, sobreescribe fanart.tv y TMDB root. Si no, se queda
      // el backdrop existente (fanart.tv > TMDB root > AniList banner).
      // ----------------------------------------------------------------
      if (kind === "tv" && tmdbId) {
        const seasonNumber = await resolveTmdbSeasonNumber(
          tmdbId,
          aniStartDate?.year,
          aniStartDate?.month,
        );

        if (seasonNumber) {
          const seasonImages = await getTmdbSeasonImages(tmdbId, seasonNumber);

          if (seasonImages?.backdrops?.length) {
            // PREMIUM quality gate: 2k resolución + cinematic widescreen
            const usableBackdrops = seasonImages.backdrops
              .filter((img: any) => {
                if (!img.width || img.width < 1920) return false;
                const aspect = img.width / (img.height || 1);
                return aspect >= 1.6;
              })
              .sort(
                (a: any, b: any) =>
                  ((b.vote_average || 0) * (b.vote_count || 0)) -
                  ((a.vote_average || 0) * (a.vote_count || 0)),
              );

            if (usableBackdrops.length > 0) {
              backdrop = tmdbBackdropUrl(usableBackdrops[0].file_path, "original") ?? null;
              logger.info(
                `[artwork] PREMIUM season-specific backdrop (S${seasonNumber}) for "${searchTitle}"`,
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