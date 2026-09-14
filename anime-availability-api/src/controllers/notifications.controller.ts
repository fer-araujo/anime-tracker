import type { Request, Response, NextFunction } from "express";
import type {
  EpisodeNotification,
  NotificationsRequest,
} from "../types/notifications.js";
import { setCacheControl } from "../utils/cache.js";
import { getCachedAnimeRecords } from "../utils/formatAnimeList.js";
import {
  asFetchOngoingIndex,
  asFetchTimetable,
} from "../services/animeSchedule.service.js";

/**
 * How far back the bell can see.
 *
 * The timetable covers the running week, so nothing older than that is
 * answerable from it — and a notification about an episode from three weeks ago
 * is not news anyway. Someone returning after a long absence gets the last
 * week's releases, not a backlog they would dismiss unread.
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
 * The source is the airing timetable, which is the same data the "Emisión de
 * Hoy" shelf reads and already cached. That matters: a bell polled on every
 * page load must not cost an upstream request per poll.
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

    const [timetable, index] = await Promise.all([
      asFetchTimetable(),
      asFetchOngoingIndex(),
    ]);

    const matches: { animeId: number; episode: number; airedAt: number }[] = [];
    for (const row of timetable) {
      const airedAt = Date.parse(row.episodeDate);
      // Strictly in the past. A broadcast scheduled for tonight has not
      // happened, and announcing it as released would be a lie the user can
      // check.
      if (!Number.isFinite(airedAt) || airedAt > now || airedAt <= from) {
        continue;
      }

      const anilistId = Number(
        index.get(row.route)?.websites?.aniList?.match(/anime\/(\d+)/)?.[1] ??
          NaN,
      );
      if (!Number.isFinite(anilistId) || !watching.has(anilistId)) continue;

      matches.push({ animeId: anilistId, episode: row.episodeNumber, airedAt });
    }

    // Newest first: the bell is read from the top and the most recent episode
    // is the one being looked for.
    matches.sort((a, b) => b.airedAt - a.airedAt);

    // Titles and posters come from the per-anime cache, which every surface
    // that has rendered these cards already filled. No upstream call is made to
    // decorate a notification.
    const records = await getCachedAnimeRecords(matches.map((m) => m.animeId));

    const data: EpisodeNotification[] = matches.map((m) => {
      const record = records.get(m.animeId);
      return {
        animeId: m.animeId,
        episode: m.episode,
        airedAt: new Date(m.airedAt).toISOString(),
        title: record?.title ?? `#${m.animeId}`,
        poster: record?.images?.poster ?? null,
      };
    });

    setCacheControl(res, "schedule");
    return res.json({ data });
  } catch (err) {
    next(err);
  }
}
