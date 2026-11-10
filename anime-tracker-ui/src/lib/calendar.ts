import { STATUS_LABELS } from "@/constants/tracking";
import { API_BASE } from "@/lib/api";
import { CDMX_TIME_ZONE } from "@/lib/episodes";
import { STATUS_BAR_COLORS, STATUS_BAR_ORDER } from "@/lib/lists";
import type { StatusByAnimeId, TrackingStatus } from "@/types/anime";
import type {
  AiringCalendar,
  CalendarDay,
  CalendarStatusFilter,
  CalendarView,
  CalendarWeek,
} from "@/types/calendar";
import type { FilterChipOption } from "@/types/view";

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

/** The page's address for a week and a filter, leaving out the defaults. */
export function calendarHref(
  week: CalendarWeek,
  status: CalendarStatusFilter,
): string {
  const params = new URLSearchParams();
  if (week !== 0) params.set("week", String(week));
  if (status !== "all") params.set("status", status);
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

/**
 * Anything that is not a known status shows everything. Checked against the
 * bar's order because that list is the one complete roster of statuses.
 */
export function normalizeStatusFilter(
  raw: string | null | undefined,
): CalendarStatusFilter {
  return STATUS_BAR_ORDER.find((s) => s === raw) ?? "all";
}

/**
 * The chips for this week: "Todos", then each status that has something on
 * screen, in the bar's order so the colours read the same as on /lists. A
 * status with nothing this week gets no chip, since choosing it would empty
 * the grid.
 */
export function calendarStatusChips(
  days: CalendarDay[],
  statuses: StatusByAnimeId,
): FilterChipOption<CalendarStatusFilter>[] {
  const counts = new Map<TrackingStatus, number>();
  let total = 0;
  for (const day of days) {
    for (const entry of day.items) {
      total += 1;
      const status = statuses.get(entry.animeId);
      if (status) counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }
  return [
    { key: "all", label: "Todos", count: total },
    ...STATUS_BAR_ORDER.filter((s) => counts.has(s)).map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      count: counts.get(s) ?? 0,
      swatch: STATUS_BAR_COLORS[s],
    })),
  ];
}

export function filterCalendarByStatus(
  days: CalendarDay[],
  statuses: StatusByAnimeId,
  filter: CalendarStatusFilter,
): CalendarDay[] {
  if (filter === "all") return days;
  return days.map((day) => ({
    ...day,
    items: day.items.filter((e) => statuses.get(e.animeId) === filter),
  }));
}
