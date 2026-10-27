/**
 * ISO-8601 week number and week-year of an instant, in UTC.
 *
 * AnimeSchedule numbers its timetables this way — `?week=37&year=2026` is
 * Monday 7 to Sunday 13 September — and the week-year is not always the
 * calendar year: 1 January 2021 belongs to week 53 of 2020. Computing "last
 * week" by subtracting one from the week number breaks on exactly that
 * boundary, so callers subtract seven days from the instant instead and ask
 * this for the week it lands in.
 */
export function isoWeek(ms: number): { week: number; year: number } {
  const d = new Date(ms);
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // ISO weeks belong to the year that holds their Thursday.
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);

  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { week, year };
}

const DAY_MS = 86_400_000;

/**
 * Every ISO week an instant range touches, oldest first, without duplicates.
 *
 * AnimeSchedule's weeks run Monday 00:00 to Sunday 23:59 *UTC* (measured: week
 * 41 of 2026 ends with a 22:40Z Sunday row), while this app's day is CDMX's.
 * The CDMX Sunday from 18:00 onwards is already Monday in UTC — the next ISO
 * week — so "the week of now" silently dropped every Sunday-evening broadcast
 * from a lookup that had to reach the end of the CDMX day. Walking the range a
 * UTC day at a time and asking each day's week is the general answer; the end
 * instant is checked on its own so a range ending mid-day is never cut short.
 */
export function isoWeeksBetween(
  fromMs: number,
  toMs: number,
): { week: number; year: number }[] {
  const weeks = new Map<string, { week: number; year: number }>();
  const add = (ms: number) => {
    const w = isoWeek(ms);
    weeks.set(`${w.year}-${w.week}`, w);
  };

  if (!(toMs >= fromMs)) return [];
  const firstDay = Math.floor(fromMs / DAY_MS) * DAY_MS;
  for (let ms = firstDay; ms <= toMs; ms += DAY_MS) add(ms);
  add(toMs);

  return [...weeks.values()];
}
