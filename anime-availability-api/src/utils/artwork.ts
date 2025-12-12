// src/utils/artwork.ts
import type { ArtworkCandidate } from "../types/animeCore.js";
import { tmdbSearch, tmdbBackdropUrl, isAnimeCandidate } from "../services/tmdb.service.js";

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
  opts?: { requireLandscape?: boolean; minAspect?: number }
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

function inferKindFromFormat(format?: string | null): "tv" | "movie" {
  return String(format).toUpperCase() === "MOVIE" ? "movie" : "tv";
}

async function fetchTmdbArtworkByTitle(
  title: string,
  kind: "tv" | "movie"
): Promise<ArtworkCandidate[]> {
  try {
    const hits = await tmdbSearch(kind, title);
    if (!hits || !hits.length) return [];

    const best = hits.find(isAnimeCandidate) ?? hits[0];
    if (!(best as any).backdrop_path) return [];

    const url1280 = tmdbBackdropUrl((best as any).backdrop_path, "w1280");
    const url780 = tmdbBackdropUrl((best as any).backdrop_path, "w780") ?? url1280;
    const urlOrig =
      tmdbBackdropUrl((best as any).backdrop_path, "original") ?? url1280 ?? url780;

    if (!url1280 && !url780 && !urlOrig) return [];

    return [
      {
        url_780: url780 ?? url1280 ?? urlOrig ?? null,
        url_1280: url1280 ?? url780 ?? urlOrig ?? null,
        url_orig: urlOrig ?? url1280 ?? url780 ?? null,
        aspect: 16 / 9,
        source: "tmdb-backdrop",
      },
    ];
  } catch (err) {
    console.warn("[tmdb] artwork error for title:", title, err);
    return [];
  }
}

export async function resolveHeroArtwork(
  title: string,
  media: BasicAniListMedia
): Promise<{ backdrop: string | null; artworkCandidates: ArtworkCandidate[] }> {
  const kind = inferKindFromFormat(media?.format);

  const tmdbCandidates = await fetchTmdbArtworkByTitle(title, kind);

  const { backdrop, artworkCandidates } = pickBestBackdrop(tmdbCandidates, {
    requireLandscape: true,
  });

  if (backdrop) return { backdrop, artworkCandidates };

  return pickBestBackdrop(tmdbCandidates, { requireLandscape: false });
}
