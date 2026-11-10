import type { Request, Response, NextFunction } from "express";
import type {
  CalendarDay,
  CalendarRequest,
  CalendarResponse,
} from "../types/calendar.js";
import { setCacheControl } from "../utils/cache.js";
import { compareCalendarEntries } from "../utils/calendarOrder.js";
import {
  bucketByCdmxDay,
  cdmxDateISO,
  cdmxDayIndex,
  cdmxDayName,
  cdmxRange,
  cdmxRangeBounds,
  cdmxTodayIndex,
} from "../utils/cdmxCalendar.js";
import { collapseSameDayDrops } from "../utils/episodeDrops.js";
import { getCachedAnimeRecords } from "../utils/formatAnimeList.js";
import {
  broadcastLabel,
  matchTrackedBroadcasts,
} from "../utils/trackedBroadcasts.js";
import {
  asAnimeForRoutes,
  asFetchTimetableRange,
} from "../services/animeSchedule.service.js";

const WEEK_MS = 7 * 86_400_000;

/**
 * One CDMX week of broadcasts, narrowed to the anime the user has given a
 * status.
 *
 * The client sends the ids, for the reason `getNotifications` documents: the
 * only Supabase credential here bypasses RLS. Which status each id has stays on
 * the client as well, since it only decides the colour an entry is painted.
 *
 * The timetable is the same one the bell reads, so the two cannot disagree, and
 * nothing here reaches AniList, TMDB or the metered RapidAPI endpoint.
 */
export async function getCalendar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { animeIds, week } = req.validated as CalendarRequest;
    const now = Date.now();

    // Moving the clock rather than the day index keeps `cdmxRange` the single
    // definition of where a week starts.
    const { firstDay, lastDay } = cdmxRange(7, now + week * WEEK_MS);
    const today = cdmxTodayIndex(now);
    const meta: CalendarResponse["meta"] = {
      firstDate: cdmxDateISO(firstDay),
      lastDate: cdmxDateISO(lastDay),
      today: today >= firstDay && today <= lastDay ? cdmxDateISO(today) : null,
      week,
      timezone: "America/Mexico_City",
    };

    const tracked = new Set(animeIds);
    const { greater, lesser } = cdmxRangeBounds(firstDay, lastDay);
    const timetable = tracked.size
      ? await asFetchTimetableRange(greater * 1000, lesser * 1000 + 999)
      : [];

    // A real week holds well over a hundred broadcasts, so none at all is a
    // failed fetch, and calling that an empty calendar would be untrue.
    if (tracked.size > 0 && timetable.length === 0) {
      return res.status(503).json({ error: "Calendar unavailable" });
    }

    const daysWithData = new Set(
      timetable.map((row) =>
        cdmxDayIndex(Math.floor(Date.parse(row.episodeDate) / 1000)),
      ),
    );

    const records = await asAnimeForRoutes(timetable.map((row) => row.route));
    const broadcasts = collapseSameDayDrops(
      matchTrackedBroadcasts(timetable, tracked, records, now),
    );
    const cards = await getCachedAnimeRecords(
      broadcasts.map((b) => b.anilistId),
    );

    const byDay = bucketByCdmxDay(
      broadcasts,
      firstDay,
      lastDay,
      (b) => b.airingAt,
    );

    const data: CalendarDay[] = [...byDay].map(([day, rows]) => ({
      date: cdmxDateISO(day),
      day: cdmxDayName(day),
      status: tracked.size === 0 || daysWithData.has(day) ? "ok" : "unavailable",
      // Sorted here, after labelling, because a tie is broken by the title the
      // user reads, which the timetable row does not have.
      items: rows
        .map((b) => ({
          animeId: b.anilistId,
          airingAt: new Date(b.airingAt * 1000).toISOString(),
          range: b.range,
          ...broadcastLabel(b, cards, records),
        }))
        .sort(compareCalendarEntries),
    }));

    setCacheControl(res);
    return res.json({ meta, data } satisfies CalendarResponse);
  } catch (err) {
    next(err);
  }
}
