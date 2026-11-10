import type { CalendarSortable } from "../types/calendar.js";

const toMinute = (iso: string | null) =>
  iso === null ? null : Math.floor(Date.parse(iso) / 60_000);

/**
 * The order of one calendar day: by airing time, then alphabetically.
 *
 * Compared to the minute because the page prints minutes: two entries that both
 * read "23:30" are a tie to the person looking at them, whatever their seconds.
 * The title is the one displayed, so `es` collation applies — accents and case
 * do not separate titles, and `numeric` keeps "Season 2" ahead of "Season 10".
 *
 * An entry with no known time goes last rather than first: it cannot be placed,
 * and must not sit above the ones that can. The id is only a final tiebreak, so
 * the order cannot flicker between two responses.
 */
export function compareCalendarEntries(
  a: CalendarSortable,
  b: CalendarSortable,
): number {
  const aMinute = toMinute(a.airingAt);
  const bMinute = toMinute(b.airingAt);

  if (aMinute !== bMinute) {
    if (aMinute === null) return 1;
    if (bMinute === null) return -1;
    return aMinute - bMinute;
  }

  return (
    a.title.localeCompare(b.title, "es", {
      sensitivity: "base",
      numeric: true,
    }) || a.animeId - b.animeId
  );
}
