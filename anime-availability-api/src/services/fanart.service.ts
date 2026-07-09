// src/services/fanart.service.ts
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";
import { fetchWithRetry } from "../utils/fetch.js";
import { withDedup } from "./tmdb.service.js";

const FANART_BASE = "https://api.fanart.tv/v3";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Individual image item from fanart.tv API response */
export interface FanartTvImage {
  id: string;
  url: string;
  likes: string;
  lang: string;
  season?: string;
}

/** Full response from GET /v3/tv/{tvdb_id} (relevant fields only) */
export interface FanartTvResponse {
  name: string;
  tvdb_id: number;
  hdtvlogo?: FanartTvImage[];
  clearlogo?: FanartTvImage[];
  showbackground?: (FanartTvImage & { width?: number; height?: number })[];
  seasonposter?: Record<string, FanartTvImage[]>;
  seasonbanner?: Record<string, FanartTvImage[]>;
  seasonthumb?: Record<string, FanartTvImage[]>;
}

/** Structured artwork result consumed by resolveHeroArtwork */
export interface FanartArtwork {
  logoUrl: string | null;
  backdropUrl: string | null;
  seasonPosters: { url: string; season: number; likes: number }[];
  seasonBanners: { url: string; season: number; likes: number }[];
  seasonThumbs: { url: string; season: number; likes: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterEnglishOrNoLang(items: FanartTvImage[]): FanartTvImage[] {
  return items.filter(
    (img) => img.lang === "en" || img.lang === "" || img.lang === "0" || !img.lang,
  );
}

function sortByLikes(items: FanartTvImage[]): FanartTvImage[] {
  return [...items].sort((a, b) => Number(b.likes) - Number(a.likes));
}

function firstUrl<T extends FanartTvImage>(items: T[]): string | null {
  const filtered = filterEnglishOrNoLang(items);
  const sorted = sortByLikes(filtered);
  return sorted.length > 0 ? sorted[0].url : null;
}

// ─── Core function ────────────────────────────────────────────────────────────

async function _fetchFanartTvArtwork(
  tvdbId: number,
): Promise<FanartArtwork | null> {
  const apiKey = ENV.FANART_TV_KEY;
  if (!apiKey) {
    logger.warn("[fanart] FANART_TV_KEY not configured");
    return null;
  }

  try {
    const url = `${FANART_BASE}/tv/${tvdbId}?api_key=${apiKey}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      logger.warn(
        { status: res.status, tvdbId },
        "[fanart] API returned non-200",
      );
      return null;
    }

    const data: FanartTvResponse = await res.json();
    if (!data) return null;

    // --- Logo: hdtvlogo or clearlogo, filtered and sorted ---
    const logoSources = [
      ...(data.hdtvlogo ?? []),
      ...(data.clearlogo ?? []),
    ];
    const logoUrl = firstUrl(logoSources);

    // --- Backdrop: showbackground, filtered and sorted ---
    const backdropUrl = firstUrl(data.showbackground ?? []);

    // --- Season artwork ---
    const seasonPosters: FanartArtwork["seasonPosters"] = [];
    const seasonBanners: FanartArtwork["seasonBanners"] = [];
    const seasonThumbs: FanartArtwork["seasonThumbs"] = [];

    if (data.seasonposter) {
      for (const [season, images] of Object.entries(data.seasonposter)) {
        for (const img of images) {
          seasonPosters.push({
            url: img.url,
            season: Number(season),
            likes: Number(img.likes),
          });
        }
      }
    }

    if (data.seasonbanner) {
      for (const [season, images] of Object.entries(data.seasonbanner)) {
        for (const img of images) {
          seasonBanners.push({
            url: img.url,
            season: Number(season),
            likes: Number(img.likes),
          });
        }
      }
    }

    if (data.seasonthumb) {
      for (const [season, images] of Object.entries(data.seasonthumb)) {
        for (const img of images) {
          seasonThumbs.push({
            url: img.url,
            season: Number(season),
            likes: Number(img.likes),
          });
        }
      }
    }

    return { logoUrl, backdropUrl, seasonPosters, seasonBanners, seasonThumbs };
  } catch (e) {
    logger.warn({ err: e, tvdbId }, "[fanart] Failed to fetch artwork");
    return null;
  }
}

// ─── Deduplicated export ──────────────────────────────────────────────────────

export const getFanartTvArtwork = withDedup(
  _fetchFanartTvArtwork,
  (tvdbId: number) => `fanartTv:${tvdbId}`,
);
