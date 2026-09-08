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
  season: string | undefined,
  year: number,
  limit = 50,
): Promise<ShikiSeasonEntry[]> {
  const url = new URL(`${SHIKI_BASE}/api/animes`);
  // No season means the caller asked for a whole year or for "most popular"
  // outright — `rank=popular` and `season=ALL` both drop the season filter, and
  // sending `undefined_2026` returns nothing instead of everything.
  if (season) {
    url.searchParams.set("season", shikiSeason(season, year));
  } else {
    url.searchParams.set("season", String(year));
  }
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

/**
 * Anime by airing status, for the homepage shelves.
 *
 * `ongoing` is a weaker answer than "airing today": the per-episode timetable
 * lives in the detail endpoint, one call per anime, which is fifty requests for
 * one shelf. Currently-airing is what a degraded shelf can honestly show.
 */
export async function shikiFetchByStatus(
  status: "ongoing" | "anons",
  limit = 20,
): Promise<ShikiSeasonEntry[]> {
  const url = new URL(`${SHIKI_BASE}/api/animes`);
  url.searchParams.set("status", status);
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("order", "popularity");

  try {
    const res = await fetch(url.toString(), {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`[shikimori] status=${status} HTTP ${res.status}`);
      return [];
    }
    return (await res.json()) as ShikiSeasonEntry[];
  } catch (err) {
    logger.warn({ err }, `[shikimori] status=${status} fetch failed`);
    return [];
  }
}

/**
 * Several anime in one request, by MAL id.
 *
 * Shikimori accepts a comma-separated `ids`, so a fifty-id batch costs one call
 * rather than fifty — the same shape the AniList batch has, which is what makes
 * this a viable substitute for it rather than a slow imitation.
 */
export async function shikiFetchByIds(
  malIds: number[],
): Promise<ShikiSeasonEntry[]> {
  if (malIds.length === 0) return [];

  const url = new URL(`${SHIKI_BASE}/api/animes`);
  url.searchParams.set("ids", malIds.slice(0, 50).join(","));
  url.searchParams.set("limit", "50");

  try {
    const res = await fetch(url.toString(), {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`[shikimori] ids HTTP ${res.status}`);
      return [];
    }
    return (await res.json()) as ShikiSeasonEntry[];
  } catch (err) {
    logger.warn({ err }, "[shikimori] ids fetch failed");
    return [];
  }
}

/** Everything Shikimori knows about one anime, by MAL id. */
export type ShikiAnimeDetail = ShikiSeasonEntry & {
  english?: string[] | null;
  japanese?: string[] | null;
  description?: string | null;
  duration?: number | null;
  next_episode_at?: string | null;
  genres?: { id: number; name: string; russian: string }[] | null;
  studios?: { id: number; name: string }[] | null;
};

export async function shikiFetchDetail(
  malId: number,
): Promise<ShikiAnimeDetail | null> {
  try {
    const res = await fetch(`${SHIKI_BASE}/api/animes/${malId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ShikiAnimeDetail;
  } catch (err) {
    logger.warn({ err }, `[shikimori] detail ${malId} failed`);
    return null;
  }
}

/** One upcoming broadcast, as Shikimori's calendar reports it. */
export type ShikiCalendarEntry = {
  next_episode: number;
  next_episode_at: string;
  duration?: number | null;
  anime: ShikiSeasonEntry;
};

/**
 * The airing calendar: every anime with a scheduled next episode, in one call.
 *
 * This is what makes "airing today" answerable without a fallback source. The
 * per-anime detail endpoint also carries `next_episode_at`, but reading it that
 * way is one request per title — fifty to fill one shelf.
 */
export async function shikiFetchCalendar(): Promise<ShikiCalendarEntry[]> {
  try {
    const res = await fetch(`${SHIKI_BASE}/api/calendar`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`[shikimori] calendar HTTP ${res.status}`);
      return [];
    }
    return (await res.json()) as ShikiCalendarEntry[];
  } catch (err) {
    logger.warn({ err }, "[shikimori] calendar fetch failed");
    return [];
  }
}
