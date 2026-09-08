import { logger } from "../utils/logger.js";
import { hybridCache } from "../utils/cache.js";

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
  episodeNumber: number;
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
export async function asFetchTimetable(): Promise<AsTimetableEntry[]> {
  const auth = headers();
  if (!auth) return [];

  try {
    const res = await fetch(`${AS_BASE}/timetables/raw`, {
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
