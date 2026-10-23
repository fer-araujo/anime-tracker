import type { EpisodeRange } from "../types/notifications.js";
import { logger } from "../utils/logger.js";
import { hybridCache } from "../utils/cache.js";
import { isoWeeksBetween } from "../utils/isoWeek.js";
import { cdmxDayStart, cdmxTodayIndex } from "../utils/cdmxCalendar.js";

const AS_BASE = "https://animeschedule.net/api/v3";

/** Verified against their CDN; `imageVersionRoute` is the path under it. */
export const AS_IMAGE_BASE =
  "https://img.animeschedule.net/production/assets/public/img/";

/** One broadcast, as the weekly timetable reports it. */
export type AsTimetableEntry = {
  title: string;
  route: string;
  /** An exact instant, not a weekly slot — this is why the source is worth it. */
  episodeDate: string;
  /** The last episode this row releases. */
  episodeNumber: number;
  /**
   * The first episode of a multi-episode release; absent on an ordinary one.
   *
   * This is how a Netflix-style season drop arrives: Cyberpunk: Edgerunners 2
   * is a single row on 2026-10-20 with `episodeNumber: 10`,
   * `subtractedEpisodeNumber: 1` and `episodes: 10`, not ten rows. Measured over
   * every 2026 timetable up to week 43 (6,515 rows): the field appears only on
   * such rows — double premieres (`2` from `1`), split finales (`13` from `12`)
   * and whole seasons — so reading `episodeNumber` alone announced a season
   * drop as "episode 10".
   */
  subtractedEpisodeNumber?: number | null;
  episodes?: number | null;
  lengthMin?: number | null;
  donghua?: boolean;
  airingStatus?: string | null;
};

/** A series record, which is where the ids and the card metadata live. */
export type AsAnime = {
  route: string;
  title: string;
  names?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  description?: string | null;
  genres?: { name: string }[] | null;
  studios?: { name: string }[] | null;
  mediaTypes?: { name: string }[] | null;
  lengthMin?: number | null;
  season?: { year?: string | null; season?: string | null } | null;
  imageVersionRoute?: string | null;
  /** `averageScore` is already on AniList's 0–100 scale. */
  stats?: { averageScore?: number | null } | null;
  websites?: { aniList?: string | null; mal?: string | null } | null;
};

/**
 * The AniList id a series record links to, or null when it links nowhere.
 *
 * The timetable carries no ids, so this link is the only bridge to the user's
 * library. One reading of it, shared by the adapter and the notification bell:
 * two copies of the regex were already in the tree, and the first to be
 * "fixed" would have made the bell and the shelf disagree about a series.
 */
export function asAnilistId(record: AsAnime | null | undefined): number | null {
  const id = Number(record?.websites?.aniList?.match(/anime\/(\d+)/)?.[1] ?? NaN);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * The episodes a timetable row releases. See `subtractedEpisodeNumber` for why
 * `episodeNumber` alone is not the answer. A start past the end would be a
 * corrupt row; it is read as the single episode the row names.
 */
export function asEpisodeRange(row: AsTimetableEntry): EpisodeRange {
  const to = row.episodeNumber;
  const start = row.subtractedEpisodeNumber;
  const from = typeof start === "number" && start > 0 && start <= to ? start : to;
  return { from, to, total: row.episodes ?? null };
}

function headers(): Record<string, string> | null {
  const token = process.env.ANIMESCHEDULE_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/**
 * The week's broadcasts, with real timestamps.
 *
 * This is the only source measured that answers "what airs today" the way
 * AniList did. Shikimori's calendar lists 93 of the 253 series it calls ongoing
 * and MAL records a broadcast day for 112 of 377, and neither schedules
 * donghua — 44 of the 154 entries here are donghua, which is most of what a
 * viewer noticed missing from the shelf.
 *
 * `raw` is the Japanese broadcast. `sub` exists too and is a different question
 * ("when do subtitles land"), so mixing them would put the same episode on the
 * shelf twice under two different times.
 */
export async function asFetchTimetable(week?: {
  week: number;
  year: number;
}): Promise<AsTimetableEntry[]> {
  const auth = headers();
  if (!auth) return [];

  // Without a week the API answers the running *UTC* ISO week. Callers with a
  // CDMX range go through asFetchTimetableRange, which always names the week.
  const query = week ? `?week=${week.week}&year=${week.year}` : "";
  try {
    const res = await fetch(`${AS_BASE}/timetables/raw${query}`, {
      headers: auth,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`[animeschedule] timetable HTTP ${res.status}`);
      return [];
    }
    return (await res.json()) as AsTimetableEntry[];
  } catch (err) {
    logger.warn({ err }, "[animeschedule] timetable fetch failed");
    return [];
  }
}

const INDEX_KEY = "animeschedule:ongoing-index";
const INDEX_TTL_MS = 1000 * 60 * 60 * 24;

/**
 * Every ongoing series keyed by route, which is how a timetable row is resolved.
 *
 * The timetable carries no ids at all, so without this the entries cannot be
 * matched to anything in the user's library. This record does carry them —
 * `websites.aniList` is a link to the AniList page — which means this source
 * needs no id translation and loses nothing to a stale mapping table: 179 of
 * 179 ongoing entries resolve, against the 91% the offline database covers.
 *
 * Paged 18 at a time by the API, so it costs ten requests. It is cached for a
 * day because the set of airing series changes on a seasonal boundary, not
 * hourly, while the timetable that consumes it is fetched fresh.
 */
export async function asFetchOngoingIndex(): Promise<Map<string, AsAnime>> {
  const auth = headers();
  if (!auth) return new Map();

  const cached = await hybridCache.get<AsAnime[]>(INDEX_KEY);
  if (cached) return new Map(cached.map((a) => [a.route, a]));

  const collected: AsAnime[] = [];
  let expected = 0;
  try {
    for (let page = 1; page <= 15; page++) {
      const res = await fetch(
        `${AS_BASE}/anime?airing-statuses=ongoing&page=${page}`,
        { headers: auth, signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) {
        logger.warn(`[animeschedule] index HTTP ${res.status} on page ${page}`);
        break;
      }
      const json = (await res.json()) as {
        totalAmount?: number;
        anime?: AsAnime[];
      };
      expected = json.totalAmount ?? expected;
      const batch = json.anime ?? [];
      collected.push(...batch);
      if (!batch.length || collected.length >= expected) break;
    }
  } catch (err) {
    logger.warn({ err }, "[animeschedule] index fetch failed");
  }

  // A partial index still resolves the routes it did reach, but caching it for
  // a day would freeze the gap in place, so only a complete one is stored.
  if (expected > 0 && collected.length >= expected) {
    await hybridCache.set(INDEX_KEY, collected, INDEX_TTL_MS);
  }
  return new Map(collected.map((a) => [a.route, a]));
}

/**
 * Short, because the running week is still being filled in: a delay announced
 * this afternoon has to reach the bell before the episode it moved would have
 * aired.
 */
const TIMETABLE_TTL_MS = 1000 * 60 * 15;

/**
 * Every broadcast between two instants, inclusive, read from as many weekly
 * timetables as the range touches.
 *
 * The API answers one UTC ISO week at a time, and every caller's range is
 * drawn in CDMX days — which never line up with those weeks. Asking for "the
 * week of now" lost the CDMX Sunday evening (already next week in UTC) and,
 * after 18:00 that Sunday, lost the whole day instead. So the weeks are derived
 * from the range (see `isoWeeksBetween`) and the rows filtered back to it by
 * exact timestamp: whatever the week split, the answer is the range asked for.
 *
 * Each week is cached under its own key, so the notification bell — polled on
 * every page load — costs no upstream request once warm, and a range that
 * reaches into the next week pays for it once per TTL, not per poll.
 */
export async function asFetchTimetableRange(
  fromMs: number,
  toMs: number,
): Promise<AsTimetableEntry[]> {
  const results = await Promise.all(
    isoWeeksBetween(fromMs, toMs).map(async (week) => {
      const key = `animeschedule:timetable:${week.year}-${week.week}`;
      const cached = await hybridCache.get<AsTimetableEntry[]>(key);
      if (cached) return cached;

      const rows = await asFetchTimetable(week);
      // An empty answer is a failed fetch or a missing token, not a quiet week;
      // caching it would keep the bell blind for the whole TTL.
      if (rows.length) await hybridCache.set(key, rows, TIMETABLE_TTL_MS);
      return rows;
    }),
  );

  return results.flat().filter((row) => {
    const at = Date.parse(row.episodeDate);
    return Number.isFinite(at) && at >= fromMs && at <= toMs;
  });
}

/**
 * The last seven days and the rest of today, CDMX.
 *
 * Seven days back because "the last seven days" is what the bell promises;
 * reading only the running week once meant a bell opened on a Monday saw a few
 * hours of broadcasts and nothing from the weekend. To the end of the CDMX day
 * because today's remaining broadcasts are listed in the bell as upcoming.
 */
export async function asFetchRecentTimetable(
  now: number = Date.now(),
): Promise<AsTimetableEntry[]> {
  const endOfToday = cdmxDayStart(cdmxTodayIndex(now) + 1) * 1000 - 1;
  return asFetchTimetableRange(now - 7 * 86_400_000, endOfToday);
}

const ROUTE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ROUTE_MISS_TTL_MS = 1000 * 60 * 60 * 24;
/** Per call. The API throttled a burst of ~30 requests while this was measured. */
const MAX_ROUTE_LOOKUPS = 20;
const LOOKUP_CONCURRENCY = 5;

/**
 * Series records for a set of timetable routes, including ones the ongoing
 * index has already dropped.
 *
 * The index is "what is airing now", and a series leaves it the moment its last
 * episode goes out. The timetable keeps that broadcast, so the finale — the one
 * episode people are most waiting for — came back with no AniList id and was
 * silently discarded: Youjo Senki II episode 12 aired on 2026-09-23 and never
 * reached the notification bell or the airing shelf. Premieres fall into the
 * same gap from the other side, until a day-old cached index catches up.
 *
 * So the index answers first and a per-series lookup covers the rest. There
 * are only a handful of such routes in a week, and an id never changes, so each
 * lookup is cached for a month. A route the API does not know is cached too,
 * for a day, as a record with no AniList link — the adapter already drops those
 * — so a dead route is not asked about again on every poll.
 */
export async function asAnimeForRoutes(
  routes: string[],
): Promise<Map<string, AsAnime>> {
  const index = await asFetchOngoingIndex();
  const found = new Map<string, AsAnime>();
  const missing: string[] = [];

  for (const route of new Set(routes)) {
    const record = index.get(route);
    if (record) found.set(route, record);
    else missing.push(route);
  }

  const auth = headers();
  if (!auth || missing.length === 0) return found;

  const lookup = async (route: string) => {
    const key = `animeschedule:route:${route}`;
    const cached = await hybridCache.get<AsAnime>(key);
    if (cached) {
      found.set(route, cached);
      return;
    }
    try {
      const res = await fetch(
        `${AS_BASE}/anime/${encodeURIComponent(route)}`,
        { headers: auth, signal: AbortSignal.timeout(8000) },
      );
      if (res.status === 404) {
        await hybridCache.set(
          key,
          { route, title: route, websites: null },
          ROUTE_MISS_TTL_MS,
        );
        return;
      }
      if (!res.ok) {
        logger.warn(`[animeschedule] route ${route} HTTP ${res.status}`);
        return;
      }
      const record = (await res.json()) as AsAnime;
      found.set(route, record);
      await hybridCache.set(key, record, ROUTE_TTL_MS);
    } catch (err) {
      logger.warn({ err }, `[animeschedule] route ${route} lookup failed`);
    }
  };

  // Capped and in small groups. Past the cap, the remaining routes resolve on
  // later requests as the cache fills — at the start of a season, when dozens
  // premiere at once, that is the difference between a slow first poll and a
  // throttled one.
  const queue = missing.slice(0, MAX_ROUTE_LOOKUPS);
  for (let i = 0; i < queue.length; i += LOOKUP_CONCURRENCY) {
    await Promise.all(queue.slice(i, i + LOOKUP_CONCURRENCY).map(lookup));
  }

  return found;
}
