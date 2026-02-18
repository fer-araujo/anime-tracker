// src/utils/artwork.ts
import type { ArtworkCandidate } from "../types/animeCore.js";
import {
  tmdbSearch,
  tmdbBackdropUrl,
  isAnimeCandidate,
  getTmdbImages,
} from "../services/tmdb.service.js";

export type BasicAniListMedia = {
  bannerImage?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
  } | null;
  format?: string | null; // opcional, por si quieres inferir kind aquí
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

export async function resolveHeroArtwork(
  searchTitle: string,
  media: { bannerImage?: string | null; coverImage?: any },
) {
  let tmdbId: number | null = null;
  let backdrop: string | null = null;
  let logo: string | null = null; // <--- NUEVO CAMPO
  let artworkCandidates: any[] = [];

  try {
    const tmdbResults = await tmdbSearch("tv", searchTitle);
    const bestTmdb = tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];

    if (bestTmdb) {
      tmdbId = bestTmdb.id;

      // Pedimos Backdrops y Logos
      const imagesData = await getTmdbImages(tmdbId, "tv");

      if (imagesData) {
        // --- 1. BACKDROPS ---
        if (imagesData.backdrops?.length > 0) {
          const highQualityArt = imagesData.backdrops
            .filter((img: any) => img.width >= 1920)
            .sort((a: any, b: any) => {
              // Prioridad: Sin texto > Votos > Voto promedio
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
              tmdbBackdropUrl(highQualityArt[0].file_path, "original") ?? null;
          }
        }

        // --- 2. LOGOS (NUEVO) ---
        // Buscamos el mejor logo (PNG)
        if (imagesData.logos?.length > 0) {
          // Filtramos logos en inglés (suelen ser los internacionales) o sin idioma
          // Ordenamos por votos para sacar el oficial más bonito
          const bestLogo = imagesData.logos
            .filter((l: any) => l.iso_639_1 === "en" || l.iso_639_1 === null)
            .sort((a: any, b: any) => b.vote_average - a.vote_average)[0];

          if (bestLogo) {
            logo = tmdbImageUrl(bestLogo.file_path, "original");
          }
        }
      }

      // Fallback Backdrop
      if (!backdrop && bestTmdb.backdrop_path) {
        backdrop = tmdbBackdropUrl(bestTmdb.backdrop_path, "original") ?? null;
      }
    }
  } catch (e) {
    console.warn("Artwork resolution failed", e);
  }

  // Fallback final a AniList banner
  if (!backdrop) {
    backdrop = media.bannerImage ?? null;
  }

  // Regresamos todo, incluyendo candidates y logo
  return { backdrop, logo, artworkCandidates, tmdbId };
}
