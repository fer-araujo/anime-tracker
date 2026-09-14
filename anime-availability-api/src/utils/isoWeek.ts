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
