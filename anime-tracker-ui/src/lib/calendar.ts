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

/**
 * How often the calendar re-reads the clock. Only the CDMX date is drawn from
 * it, so a minute late at midnight is invisible; `useNow` also catches up the
 * moment a backgrounded tab comes back.
 */
export const CALENDAR_CLOCK_MS = 60_000;

const CDMX_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: CDMX_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's CDMX date as `YYYY-MM-DD`, the same form the API labels days with. */
export function cdmxDateKey(now: number = Date.now()): string {
  // Assembled from parts: no locale promises a `YYYY-MM-DD` layout.
  const parts = Object.fromEntries(
    CDMX_DATE.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * The Sunday that starts the week `week` weeks away from `today`, matching the
 * API's Sunday-to-Saturday grid. Pure date arithmetic on a CDMX label, read
 * as UTC for the same reason as `formatDate`.
 */
export function calendarWeekStart(today: string, week: CalendarWeek): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay() + week * 7);
  return date.toISOString().slice(0, 10);
}

/**
 * Today, if the week on screen contains it. Read from the browser's clock
 * rather than the answer's `meta.today`, which froze at the moment it was
 * fetched: a cached week, or a tab left open past midnight, would keep
 * highlighting yesterday.
 */
export function calendarToday(
  meta: AiringCalendar["meta"],
  today: string,
): string | null {
  return today >= meta.firstDate && today <= meta.lastDate ? today : null;
}

const isString = (v: unknown): v is string => typeof v === "string";
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

function isCalendarEntry(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.animeId === "number" &&
    isString(v.title) &&
    (v.poster === null || isString(v.poster)) &&
    isString(v.airingAt) &&
    isRecord(v.range) &&
    typeof v.range.from === "number" &&
    typeof v.range.to === "number"
  );
}

function isCalendarDay(v: unknown): boolean {
  return (
    isRecord(v) &&
    isString(v.date) &&
    (v.status === "ok" || v.status === "unavailable") &&
    Array.isArray(v.items) &&
    v.items.every(isCalendarEntry)
  );
}

/**
 * Whether a stored value can be drawn as a calendar. Down to each entry,
 * because the cards read `range` and `airingAt` unguarded: a payload from an
 * older build, or edited by hand, must fall back to loading, not crash.
 */
export function isAiringCalendar(v: unknown): v is AiringCalendar {
  return (
    isRecord(v) &&
    isRecord(v.meta) &&
    isString(v.meta.firstDate) &&
    isString(v.meta.lastDate) &&
    Array.isArray(v.data) &&
    v.data.every(isCalendarDay)
  );
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
  hasCalendar: boolean;
}): CalendarView {
  // Ahead of loading and of failure: a week in hand, even one remembered from
  // the last visit, beats a skeleton while the API wakes and beats an error
  // when it does not. `hasCalendar` is only true for the week on screen.
  if (state.hasTrackedAnime && state.hasCalendar) return "ready";
  if (state.loading) return "loading";
  // Ahead of the error: with nothing tracked there was no request to fail.
  if (!state.hasTrackedAnime) return "untracked";
  return "error";
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
