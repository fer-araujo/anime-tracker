import { logger } from "../utils/logger.js";

const SHIKI_BASE = "https://shikimori.one";

/**
 * Shikimori rejects requests without one and answers 301 to the bare host.
 * Identifying the client honestly is what their docs ask for.
 */
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "anime-tracker",
};

/**
 * A season entry as Shikimori's list endpoint returns it.
 *
 * Deliberately thin — this is everything that endpoint gives. No genres, no
 * studios, no synopsis; those need one detail call per anime, which is 50 calls
 * to paint a season. The season fallback pairs this with what the per-anime
 * cache already holds instead.
 */
export type ShikiSeasonEntry = {
  id: number;
  name: string;
  russian?: string | null;
  image?: { original?: string | null; preview?: string | null } | null;
  url?: string | null;
  kind?: string | null;
  score?: string | null;
  status?: string | null;
  episodes?: number | null;
  episodes_aired?: number | null;
  aired_on?: string | null;
};

/** Shikimori spells a season `summer_2026`. */
function shikiSeason(season: string, year: number): string {
  return `${season.toLowerCase()}_${year}`;
}

/**
 * A season from Shikimori, for when AniList will not answer.
 *
 * Chosen over Jikan after measuring both during the 2026-09-06 outage: Jikan's
 * `/seasons` and `/recommendations` were returning 504 while Shikimori answered
 * 200 on every endpoint we need.
 *
 * **The ids are MAL ids, not AniList ids.** Shikimori mirrors MAL's numbering —
 * `/animes/52991` is Frieren, and its AniList id (154587) is a 404 there. Every
 * caller has to translate before these can touch the user's library.
 */
export async function shikiFetchSeason(
  season: string,
  year: number,
  limit = 50,
): Promise<ShikiSeasonEntry[]> {
  const url = new URL(`${SHIKI_BASE}/api/animes`);
  url.searchParams.set("season", shikiSeason(season, year));
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("order", "popularity");

  try {
    const res = await fetch(url.toString(), {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`[shikimori] season HTTP ${res.status}`);
      return [];
    }
    return (await res.json()) as ShikiSeasonEntry[];
  } catch (err) {
    logger.warn({ err }, "[shikimori] season fetch failed");
    return [];
  }
}
