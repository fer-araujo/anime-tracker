import { API_BASE } from "@/lib/api";
import { CDMX_TIME_ZONE } from "@/lib/episodes";
import type {
  AiringCalendar,
  CalendarDay,
  CalendarView,
  CalendarWeek,
} from "@/types/calendar";

/**
 * Long, because somebody opened this page on purpose and the alternative is an
 * error screen: Render's free tier takes most of a minute to wake.
 */
const CALENDAR_TIMEOUT_MS = 60_000;

export async function fetchAiringCalendar(
  animeIds: number[],
  week: CalendarWeek,
): Promise<AiringCalendar> {
  const res = await fetch(`${API_BASE}/calendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ animeIds, week }),
    signal: AbortSignal.timeout(CALENDAR_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  return res.json();
}

/** Anything the API would not answer falls back to the current week. */
export function normalizeCalendarWeek(
  raw: string | null | undefined,
): CalendarWeek {
  return raw === "-1" ? -1 : raw === "1" ? 1 : 0;
}

/** The neighbouring week, held to the three the API answers. */
export function shiftCalendarWeek(
  week: CalendarWeek,
  by: -1 | 1,
): CalendarWeek {
  return Math.max(-1, Math.min(1, week + by)) as CalendarWeek;
}

/**
 * Formats a CDMX calendar date, which is a label and not an instant.
 *
 * Read as UTC on purpose. `new Date("2026-10-22")` is midnight UTC, still the
 * 21st in Mexico, so formatting it in local time puts every column a day early.
 */
function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "Jue" and "22", the two halves of a day heading. */
export function formatDayLabel(date: string): {
  weekday: string;
  day: string;
} {
  // es-MX abbreviates with a trailing dot ("jue."), which is noise in a heading.
  const weekday = formatDate(date, { weekday: "short" }).replace(".", "");
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    day: formatDate(date, { day: "numeric" }),
  };
}

/** "Del 18 al 24 de octubre", naming both months only when they differ. */
export function formatWeekRange(firstDate: string, lastDate: string): string {
  const sameMonth = firstDate.slice(0, 7) === lastDate.slice(0, 7);
  const start = formatDate(
    firstDate,
    sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" },
  );
  return `Del ${start} al ${formatDate(lastDate, { day: "numeric", month: "long" })}`;
}

const CDMX_DAY_OF_MONTH = new Intl.DateTimeFormat("es-MX", {
  timeZone: CDMX_TIME_ZONE,
  day: "numeric",
});

/** Today's day of the month in CDMX, whatever zone the browser is in. */
export function cdmxDayOfMonth(now: number = Date.now()): string {
  return CDMX_DAY_OF_MONTH.format(now);
}

/** The day a phone opens on: today, or else the first one with something on it. */
export function pickInitialDay(
  days: CalendarDay[],
  today: string | null,
): string | null {
  return (
    today ?? days.find((d) => d.items.length > 0)?.date ?? days[0]?.date ?? null
  );
}

/**
 * Whether it is true that nothing airs this week. A day that failed to load
 * might have had something, so its silence proves nothing.
 */
export function isWeekEmpty(days: CalendarDay[]): boolean {
  return days.every((d) => d.status === "ok" && d.items.length === 0);
}

export function resolveCalendarView(state: {
  loading: boolean;
  hasTrackedAnime: boolean;
  failed: boolean;
  hasCalendar: boolean;
}): CalendarView {
  if (state.loading) return "loading";
  // Ahead of the error: with nothing tracked there was no request to fail.
  if (!state.hasTrackedAnime) return "untracked";
  if (state.failed || !state.hasCalendar) return "error";
  return "ready";
}
