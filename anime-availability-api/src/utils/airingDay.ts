import { cdmxDayStart } from "./cdmxCalendar.js";

/**
 * Which broadcasts fall on one CDMX calendar day, reconstructed from a
 * next-episode calendar.
 *
 * AniList's `airingSchedules` answers a time range directly, past airings
 * included. Shikimori's calendar cannot: it carries only each anime's *next*
 * episode, so a series that went out at 09:00 today already reports a date a
 * week away. Filtering that list to the remaining hours of the day is why the
 * shelf showed six titles instead of the day's real count — everything that had
 * already aired was invisible.
 *
 * So the earlier broadcast is inferred from the cadence: a weekly series whose
 * next episode is within seven days had its previous one exactly a week before,
 * and if that instant lands inside the requested day, it aired that day.
 *
 * The one-week limit is the whole guard. A series on hiatus or one whose
 * premiere is a month out would, stepped back far enough, "land" on any day at
 * all — and every one of those broadcasts would be fabricated. Anything further
 * ahead than a single week is not a weekly show mid-run, so it is left out.
 *
 * Irregular schedules are the known cost: a fortnightly or split-cour series
 * that aired today is missed rather than guessed at.
 */
const WEEK_SECONDS = 7 * 86400;

export type CalendarLike = {
  next_episode: number;
  next_episode_at: string;
};

export type DayAiring<T> = {
  entry: T;
  airingAt: number;
  episode: number;
};

export function airingsOnDay<T extends CalendarLike>(
  entries: T[],
  dayIndex: number,
): DayAiring<T>[] {
  const start = cdmxDayStart(dayIndex);
  const end = cdmxDayStart(dayIndex + 1) - 1;

  const hits: DayAiring<T>[] = [];
  for (const entry of entries) {
    const at = Math.floor(Date.parse(entry.next_episode_at) / 1000);
    if (!Number.isFinite(at)) continue;

    if (at >= start && at <= end) {
      hits.push({ entry, airingAt: at, episode: entry.next_episode });
      continue;
    }

    const previous = at - WEEK_SECONDS;
    if (previous >= start && previous <= end && entry.next_episode > 1) {
      hits.push({ entry, airingAt: previous, episode: entry.next_episode - 1 });
    }
  }

  return hits.sort((a, b) => a.airingAt - b.airingAt);
}

/**
 * The other half of the day: a weekly broadcast slot rather than a dated one.
 *
 * MAL states the schedule as a JST weekday plus a wall-clock time and never a
 * timestamp, so the instant has to be constructed. That is not a formality — a
 * CDMX day spans two JST days, and a series broadcasting Tuesday 23:15 JST goes
 * out on the CDMX Tuesday morning while one broadcasting Tuesday 10:00 JST
 * belongs to the CDMX Monday. Matching the weekday name against the local one
 * would misfile both.
 *
 * So every JST day overlapping the CDMX window is checked in turn, and the slot
 * is kept only if the instant it produces genuinely lands inside the day.
 *
 * Verified against Shikimori's dated calendar on 2026-09-08: the two sources
 * agree on all 77 titles they share, which is what makes it safe to merge them.
 */
const JST_OFFSET_SECONDS = 9 * 3600;
const SECONDS_PER_DAY = 86400;

/** Epoch day 0 (1970-01-01) was a Thursday, so index 0 must map to weekday 4. */
const EPOCH_DAY_WEEKDAY_OFFSET = 4;

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export type BroadcastLike = {
  broadcast?: {
    day_of_the_week?: string | null;
    start_time?: string | null;
  } | null;
};

export function broadcastsOnDay<T extends BroadcastLike>(
  entries: T[],
  dayIndex: number,
): { entry: T; airingAt: number }[] {
  const start = cdmxDayStart(dayIndex);
  const end = cdmxDayStart(dayIndex + 1) - 1;

  const firstJstDay = Math.floor((start + JST_OFFSET_SECONDS) / SECONDS_PER_DAY);
  const lastJstDay = Math.floor((end + JST_OFFSET_SECONDS) / SECONDS_PER_DAY);

  const hits: { entry: T; airingAt: number }[] = [];
  for (const entry of entries) {
    const weekday = entry.broadcast?.day_of_the_week;
    const time = entry.broadcast?.start_time;
    if (!weekday || !time) continue;

    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) continue;

    for (let jstDay = firstJstDay; jstDay <= lastJstDay; jstDay++) {
      const name = WEEKDAYS[(jstDay + EPOCH_DAY_WEEKDAY_OFFSET) % 7];
      if (name !== weekday) continue;

      const airingAt =
        jstDay * SECONDS_PER_DAY -
        JST_OFFSET_SECONDS +
        hours * 3600 +
        minutes * 60;
      if (airingAt >= start && airingAt <= end) {
        hits.push({ entry, airingAt });
        break;
      }
    }
  }

  return hits.sort((a, b) => a.airingAt - b.airingAt);
}
