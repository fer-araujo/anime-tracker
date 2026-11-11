import {
  AS_IMAGE_BASE,
  asAnilistId,
  asBroadcastDelay,
  asEpisodeRange,
  type AsAnime,
  type AsTimetableEntry,
} from "../services/animeSchedule.service.js";
import type { TrackedBroadcast } from "../types/notifications.js";
import type { FormattedAnime } from "./formatAnimeList.js";

/**
 * Timetable rows narrowed to the series a user follows.
 *
 * The timetable carries no ids, so each row is matched through its resolved
 * AnimeSchedule record. A row whose record has no AniList link is dropped: it
 * cannot be anything in the user's library.
 */
export function matchTrackedBroadcasts(
  rows: AsTimetableEntry[],
  tracked: Set<number>,
  records: Map<string, AsAnime>,
  now: number,
): TrackedBroadcast[] {
  const matched: TrackedBroadcast[] = [];
  for (const row of rows) {
    const anilistId = asAnilistId(records.get(row.route));
    if (anilistId === null || !tracked.has(anilistId)) continue;

    const at = Date.parse(row.episodeDate);
    matched.push({
      anilistId,
      airingAt: Math.floor(at / 1000),
      range: asEpisodeRange(row),
      route: row.route,
      upcoming: at > now,
      delay: asBroadcastDelay(row),
    });
  }
  return matched;
}

/**
 * The title and poster a broadcast is shown with.
 *
 * The card cache first, since it has the Spanish title the rest of the app
 * shows. A series nobody has opened yet is not in it — a finale fetched a
 * moment ago by route is the usual case — and then the AnimeSchedule record the
 * request already holds supplies both, rather than a bare "#135865". No
 * upstream call is made to decorate a row.
 */
export function broadcastLabel(
  broadcast: Pick<TrackedBroadcast, "anilistId" | "route">,
  cards: Map<number, FormattedAnime>,
  records: Map<string, AsAnime>,
): { title: string; poster: string | null } {
  const card = cards.get(broadcast.anilistId);
  const source = records.get(broadcast.route);
  return {
    title:
      card?.title ??
      source?.names?.english ??
      source?.title ??
      `#${broadcast.anilistId}`,
    poster:
      card?.images?.poster ??
      (source?.imageVersionRoute
        ? `${AS_IMAGE_BASE}${source.imageVersionRoute}`
        : null),
  };
}
