/**
 * Calendar arithmetic in the app's fixed timezone (CDMX, UTC-6).
 *
 * This used to be one private helper inside the schedule controller that
 * produced today's bounds and nothing else. A weekly grid needs three more
 * things — which day a given timestamp belongs to, where a week starts, and
 * what to label each column — and none of them can be derived from a pair of
 * bounds after the fact.
 *
 * Everything here works on integers rather than `Date` objects on purpose. The
 * server's own timezone is unknown (Render sets UTC, a laptop does not), so any
 * method that reads local time is a bug waiting for a deploy. `Date.now()` is
 * UTC by definition; shifting it by six hours puts us on CDMX wall-clock, and
 * from there day boundaries are integer division.
 *
 * No DST handling because Mexico abolished it in 2022 — CDMX is UTC-6 all year.
 * If that changes, this file is the single place that has to know.
 */

const SECONDS_PER_DAY = 86400;
const CDMX_OFFSET_SECONDS = 6 * 3600;

/** Epoch day 0 (1970-01-01) was a Thursday, so index 0 must map to weekday 4. */
const EPOCH_DAY_WEEKDAY_OFFSET = 4;

export const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

/** Which CDMX calendar day a Unix timestamp falls on, as an epoch-day integer. */
export function cdmxDayIndex(unixSeconds: number): number {
  return Math.floor((unixSeconds - CDMX_OFFSET_SECONDS) / SECONDS_PER_DAY);
}

/** Midnight CDMX of an epoch-day index, in Unix seconds. */
export function cdmxDayStart(dayIndex: number): number {
  return dayIndex * SECONDS_PER_DAY + CDMX_OFFSET_SECONDS;
}

export function cdmxDayName(dayIndex: number): DayName {
  return DAY_NAMES[(dayIndex + EPOCH_DAY_WEEKDAY_OFFSET) % 7];
}

/** `YYYY-MM-DD` of an epoch-day index. Midnight CDMX is 06:00 UTC the same date. */
export function cdmxDateISO(dayIndex: number): string {
  return new Date(cdmxDayStart(dayIndex) * 1000).toISOString().slice(0, 10);
}

export function cdmxTodayIndex(now: number = Date.now()): number {
  return cdmxDayIndex(Math.floor(now / 1000));
}

/**
 * The inclusive epoch-day range to display.
 *
 * A single day is just today. A week is the *calendar* week containing today,
 * Sunday through Saturday — not the next seven days. Anchoring it to today
 * would slide the columns every morning and make "Tuesday" mean a different
 * position depending on when you looked, which defeats the point of a grid you
 * are supposed to read at a glance.
 */
export function cdmxRange(
  days: number,
  now: number = Date.now(),
): { firstDay: number; lastDay: number } {
  const today = cdmxTodayIndex(now);
  if (days <= 1) return { firstDay: today, lastDay: today };

  const weekday = (today + EPOCH_DAY_WEEKDAY_OFFSET) % 7;
  const firstDay = today - weekday;
  return { firstDay, lastDay: firstDay + 6 };
}

/** Unix-second bounds covering an inclusive epoch-day range. */
export function cdmxRangeBounds(
  firstDay: number,
  lastDay: number,
): { greater: number; lesser: number } {
  return {
    greater: cdmxDayStart(firstDay),
    lesser: cdmxDayStart(lastDay + 1) - 1,
  };
}
