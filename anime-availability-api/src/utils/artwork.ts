// src/utils/artwork.ts
import type { ArtworkCandidate } from "../types/animeCore.js";
import {
  tmdbSearch,
  tmdbBackdropUrl,
  isAnimeCandidate,
  getTmdbImages,
  resolveTmdbSeasonNumber,
  getTmdbSeasonImages,
} from "../services/tmdb.service.js";
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
) {
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
          console.log(`[artwork] Match encontrado usando: "${variant}"`);
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
    }
  } catch (e) {
    console.warn("[artwork] Resolution failed", e);
  }

  // Fallback global a AniList banner (cubre casos sin TMDB)
  if (!backdrop) {
    backdrop = media.bannerImage ?? null;
  }

  return { backdrop, logo, artworkCandidates, tmdbId };
}