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
