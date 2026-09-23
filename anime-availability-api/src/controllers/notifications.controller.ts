import type { Request, Response, NextFunction } from "express";
import type {
  EpisodeNotification,
  NotificationsRequest,
} from "../types/notifications.js";
import { setCacheControl } from "../utils/cache.js";
import { getCachedAnimeRecords } from "../utils/formatAnimeList.js";
import {
  AS_IMAGE_BASE,
  asAnimeForRoutes,
  asFetchRecentTimetable,
} from "../services/animeSchedule.service.js";

/**
 * How far back the bell can see.
 *
 * The timetable is read for the running ISO week and the one before it, so a
 * full seven days is always answerable — including on a Monday, when the
 * running week alone holds a few hours of broadcasts. That was the first
 * version's bug: it read only the running week and promised a week it did not
 * have. A notification older than this is not news anyway; someone returning
 * after a month gets the last week's releases, not a backlog to dismiss unread.
 */
const MAX_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Episodes released since the user last looked.
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

    const timetable = await asFetchRecentTimetable(now);

    // Strictly in the past. A broadcast scheduled for tonight has not
    // happened, and announcing it as released would be a lie the user can
    // check.
    const aired = timetable.filter((row) => {
      const at = Date.parse(row.episodeDate);
      return Number.isFinite(at) && at <= now && at > from;
    });

    // Resolved per route rather than read off the ongoing index alone: a
    // series drops out of that index the moment its finale airs, which is how
    // a last episode — the one most waited for — never reached the bell.
    const records = await asAnimeForRoutes(aired.map((row) => row.route));

    const matches: {
      animeId: number;
      episode: number;
      airedAt: number;
      route: string;
    }[] = [];
    for (const row of aired) {
      const airedAt = Date.parse(row.episodeDate);
      const anilistId = Number(
        records.get(row.route)?.websites?.aniList?.match(/anime\/(\d+)/)?.[1] ??
          NaN,
      );
      if (!Number.isFinite(anilistId) || !watching.has(anilistId)) continue;

      matches.push({
        animeId: anilistId,
        episode: row.episodeNumber,
        airedAt,
        route: row.route,
      });
    }

    // Newest first: the bell is read from the top and the most recent episode
    // is the one being looked for.
    matches.sort((a, b) => b.airedAt - a.airedAt);

    // Titles and posters come from the per-anime cache, which every surface
    // that has rendered these cards already filled. No upstream call is made to
    // decorate a notification.
    const cards = await getCachedAnimeRecords(matches.map((m) => m.animeId));

    // The card cache first, since it has the Spanish title the rest of the app
    // shows. A series nobody has opened yet is not in it — a finale fetched a
    // moment ago by route is the usual case — and then the AnimeSchedule record
    // this request already holds supplies both, rather than a bare "#135865".
    const data: EpisodeNotification[] = matches.map((m) => {
      const card = cards.get(m.animeId);
      const source = records.get(m.route);
      return {
        animeId: m.animeId,
        episode: m.episode,
        airedAt: new Date(m.airedAt).toISOString(),
        title:
          card?.title ??
          source?.names?.english ??
          source?.title ??
          `#${m.animeId}`,
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
