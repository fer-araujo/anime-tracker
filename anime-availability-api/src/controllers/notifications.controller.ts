import type { Request, Response, NextFunction } from "express";
import type {
  EpisodeNotification,
  EpisodeRange,
  NotificationsRequest,
  SameDayDrop,
} from "../types/notifications.js";
import { setCacheControl } from "../utils/cache.js";
import { getCachedAnimeRecords } from "../utils/formatAnimeList.js";
import { cdmxDayIndex, cdmxTodayIndex } from "../utils/cdmxCalendar.js";
import { collapseSameDayDrops } from "../utils/episodeDrops.js";
import {
  AS_IMAGE_BASE,
  asAnilistId,
  asAnimeForRoutes,
  asEpisodeRange,
  asFetchRecentTimetable,
} from "../services/animeSchedule.service.js";

/**
 * How far back the bell can see.
 *
 * The timetable is read for every ISO week the last seven days touch, so a
 * full seven days is always answerable — including on a Monday, when the
 * running week alone holds a few hours of broadcasts. That was the first
 * version's bug: it read only the running week and promised a week it did not
 * have. A notification older than this is not news anyway; someone returning
 * after a month gets the last week's releases, not a backlog to dismiss unread.
 */
const MAX_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Episodes released since the user last looked, plus what is still due today.
 *
 * The client sends what it already knows — the anime it is watching and the
 * instant the bell was last opened — rather than the server reading
 * `user_anime`. That table is protected by RLS, and the only Supabase
 * credential this service holds is the admin one, which bypasses RLS entirely.
 * Using it for user data would mean authenticating the user here just to avoid
 * leaking someone else's library. The client already has both facts and the
 * RLS already works; sending them is simpler and safer than rebuilding the
 * authorisation.
 *
 * The source is the airing timetable, cached per week. That matters: a bell
 * polled on every page load must not cost an upstream request per poll.
 */
export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = (req.validated || req.body) as NotificationsRequest;

    const watching = new Set(body.animeIds);
    if (watching.size === 0) {
      setCacheControl(res, "schedule");
      return res.json({ data: [] });
    }

    const now = Date.now();
    const sinceMs = Date.parse(body.since);
    const floor = now - MAX_LOOKBACK_MS;
    // An unparseable or ancient timestamp reads as "show me the last week"
    // rather than as an error: the bell is not worth failing a page over.
    const from = Number.isFinite(sinceMs) ? Math.max(sinceMs, floor) : floor;
    const today = cdmxTodayIndex(now);

    const timetable = await asFetchRecentTimetable(now);

    // Aired, or due later *today*. The bell used to list only what had already
    // gone out, so tonight's episode was invisible all day and appeared only
    // once a page happened to load after it aired. Listing it from midnight
    // CDMX is useful; listing next week's is a calendar, so the future is cut
    // at the end of the current CDMX day — checked here on the timestamp, not
    // trusted to how far the timetable happened to be read.
    const relevant = timetable.filter((row) => {
      const at = Date.parse(row.episodeDate);
      if (!Number.isFinite(at) || at <= from) return false;
      return at <= now || cdmxDayIndex(Math.floor(at / 1000)) === today;
    });

    // Resolved per route rather than read off the ongoing index alone: a
    // series drops out of that index the moment its finale airs, which is how
    // a last episode — the one most waited for — never reached the bell.
    const records = await asAnimeForRoutes(relevant.map((row) => row.route));

    const rows: (SameDayDrop & {
      range: EpisodeRange;
      route: string;
      upcoming: boolean;
    })[] = [];
    for (const row of relevant) {
      const anilistId = asAnilistId(records.get(row.route));
      if (anilistId === null || !watching.has(anilistId)) continue;

      const at = Date.parse(row.episodeDate);
      rows.push({
        anilistId,
        airingAt: Math.floor(at / 1000),
        range: asEpisodeRange(row),
        route: row.route,
        upcoming: at > now,
      });
    }

    // One entry per series per day, collapsed separately for what has aired
    // and what has not. Merged, a double broadcast with one half out and one
    // half pending would have to be called either released — a lie the user
    // can check — or upcoming, hiding an episode that is already watchable.
    const released = collapseSameDayDrops(rows.filter((r) => !r.upcoming));
    const pending = collapseSameDayDrops(rows.filter((r) => r.upcoming));

    // Released newest first, since the bell is read from the top and the most
    // recent episode is the one being looked for; then today's pending ones,
    // soonest first.
    released.sort((a, b) => b.airingAt - a.airingAt);
    pending.sort((a, b) => a.airingAt - b.airingAt);
    const matches = [...released, ...pending];

    // Titles and posters come from the per-anime cache, which every surface
    // that has rendered these cards already filled. No upstream call is made to
    // decorate a notification.
    const cards = await getCachedAnimeRecords(matches.map((m) => m.anilistId));

    // The card cache first, since it has the Spanish title the rest of the app
    // shows. A series nobody has opened yet is not in it — a finale fetched a
    // moment ago by route is the usual case — and then the AnimeSchedule record
    // this request already holds supplies both, rather than a bare "#135865".
    const data: EpisodeNotification[] = matches.map((m) => {
      const card = cards.get(m.anilistId);
      const source = records.get(m.route);
      return {
        animeId: m.anilistId,
        episode: m.range.to,
        range: m.range,
        airedAt: new Date(m.airingAt * 1000).toISOString(),
        upcoming: m.upcoming,
        title:
          card?.title ??
          source?.names?.english ??
          source?.title ??
          `#${m.anilistId}`,
        poster:
          card?.images?.poster ??
          (source?.imageVersionRoute
            ? `${AS_IMAGE_BASE}${source.imageVersionRoute}`
            : null),
      };
    });

    setCacheControl(res, "schedule");
    return res.json({ data });
  } catch (err) {
    next(err);
  }
}
