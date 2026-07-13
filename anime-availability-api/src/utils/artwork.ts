// src/utils/artwork.ts
import { logger } from "../utils/logger.js";
import type { ArtworkCandidate } from "../types/animeCore.js";
import type { TMDBSearchTVItem } from "../types/types.js";
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

/** TMDB image item within /images response */
interface TmdbImageItem {
  file_path: string;
  width?: number;
  height?: number;
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
  aspect_ratio?: number;
}

/** A single artwork candidate entry used in artworkCandidates array */
interface ArtworkCandidateEntry {
  url_original: string | undefined;
  width?: number | null;
  is_textless: boolean;
  source?: string;
  likes?: number;
  season?: number;
}

/** Return shape of resolveHeroArtwork */
interface ResolveHeroResult {
  backdrop: string | null;
  logo: string | null;
  artworkCandidates: ArtworkCandidateEntry[];
  tmdbId: number | null;
}

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
  media: { bannerImage?: string | null; coverImage?: { extraLarge?: string | null; large?: string | null } | null },
  aniStartDate?: { year?: number | null; month?: number | null } | null,
  _opts?: { allowSeasonBackdrop?: boolean },
): Promise<ResolveHeroResult> {
  let tmdbId: number | null = null;
  let backdrop: string | null = null;
  let logo: string | null = null;
  let artworkCandidates: ArtworkCandidateEntry[] = [];
  let bestTmdb: TMDBSearchTVItem | undefined;

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

    if (bestTmdb?.id) {
      tmdbId = bestTmdb.id;

      // ----------------------------------------------------------------
      // PASO 1: BACKDROPS + LOGO BASE — Siempre desde /tv/{id}/images (raíz)
      // ----------------------------------------------------------------
      const imagesData = await getTmdbImages(tmdbId, kind);

      if (imagesData) {
        // Backdrops root level
        if (imagesData.backdrops?.length) {
          const highQualityArt = imagesData.backdrops
            .filter((img: TmdbImageItem) => (img.width ?? 0) >= 1920)
            .sort((a: TmdbImageItem, b: TmdbImageItem) => {
              const scoreA =
                (a.iso_639_1 === null ? 50 : 0) +
                (a.vote_average ?? 0) * 5 +
                (a.vote_count ?? 0);
              const scoreB =
                (b.iso_639_1 === null ? 50 : 0) +
                (b.vote_average ?? 0) * 5 +
                (b.vote_count ?? 0);
              return scoreB - scoreA;
            });

          artworkCandidates = highQualityArt.map((img: TmdbImageItem) => ({
            url_original: tmdbBackdropUrl(img.file_path, "original"),
            width: img.width,
            is_textless: img.iso_639_1 === null,
          }));

          if (highQualityArt[0]) {
            backdrop =
              tmdbBackdropUrl(highQualityArt[0].file_path, "w1280") ?? null;
          }
        }

        // Logo base del TV Show
        if (imagesData.logos?.length) {
          const bestLogo = imagesData.logos
            .filter((l: TmdbImageItem) => l.iso_639_1 === "en" || l.iso_639_1 === null)
            .sort((a: TmdbImageItem, b: TmdbImageItem) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0];

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
              const fanartCandidates: ArtworkCandidateEntry[] = [];

              for (const sb of fanartData.backdropCandidates) {
                fanartCandidates.push({
                  url_original: sb.url,
                  width: sb.width ?? null,
                  is_textless: true,
                  source: "fanart-tv",
                  likes: sb.likes,
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
      if (isSeasonSequel(searchTitle) && kind === "tv" && tmdbId) {
        const seasonNumber = await resolveTmdbSeasonNumber(
          tmdbId,
          aniStartDate?.year,
          aniStartDate?.month,
        );

        if (seasonNumber) {
          const seasonImages = await getTmdbSeasonImages(tmdbId, seasonNumber);

          if (seasonImages?.logos?.length) {
            const bestSeasonLogo = seasonImages.logos
              .filter((l: TmdbImageItem) => l.iso_639_1 === "en" || l.iso_639_1 === null)
              .sort((a: TmdbImageItem, b: TmdbImageItem) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0];
            if (bestSeasonLogo) {
              logo = tmdbImageUrl(bestSeasonLogo.file_path, "original");
            }
          }
        }
      }

      // ----------------------------------------------------------------
      // PASO 3: BACKDROP DE TEMPORADA — Siempre activo
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
            const usableBackdrops = seasonImages.backdrops
              .filter((img: TmdbImageItem) => {
                if (!img.width || img.width < 1920) return false;
                const aspect = img.width / (img.height || 1);
                return aspect >= 1.6;
              })
              .sort(
                (a: TmdbImageItem, b: TmdbImageItem) =>
                  ((b.vote_average ?? 0) * (b.vote_count ?? 0)) -
                  ((a.vote_average ?? 0) * (a.vote_count ?? 0)),
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