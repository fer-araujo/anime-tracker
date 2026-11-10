import { STATUS_LABELS } from "@/constants/tracking";
import { API_BASE } from "@/lib/api";
import { CDMX_TIME_ZONE, formatCdmxTime } from "@/lib/episodes";
import { STATUS_BAR_COLORS, STATUS_BAR_ORDER } from "@/lib/lists";
import type { StatusByAnimeId, TrackingStatus } from "@/types/anime";
import type {
  AiringCalendar,
  CalendarDay,
  CalendarEntry,
  CalendarStatusFilter,
  CalendarView,
  CalendarWeek,
  PlacedEntry,
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

/**
 * How long a block stands for on the grid. Episodes run about 24 minutes, but a
 * block that short cannot hold a poster and two lines of title, so the grid
 * gives each one an hour and treats that hour as its footprint for overlaps.
 */
export const BLOCK_MINUTES = 60;

/** Below this the grid is so short that a single entry fills it edge to edge. */
const MIN_SPAN_HOURS = 6;

/** Where an empty week's grid starts: the morning, when most simulcasts land. */
const DEFAULT_START_HOUR = 8;

/** Height of one hour on the grid; a block is an hour, so also a card's room. */
const HOUR_PX = 96;

export function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_PX;
}

/**
 * How much of its hour a block may draw. The grid ends at midnight, so a
 * broadcast after 23:00 gets only what is left instead of spilling past the
 * bottom of the column.
 */
export function blockMinutes(startMinute: number, endHour: number): number {
  return Math.min(BLOCK_MINUTES, endHour * 60 - startMinute);
}

/**
 * Minutes since CDMX midnight, read off the same clock the entries print so a
 * block can never sit at a different time from the one written on it. Parsing
 * "HH:mm" is safe because that formatter is pinned to `h23`.
 */
export function cdmxMinuteOfDay(instant: string | number): number {
  const [h, m] = formatCdmxTime(new Date(instant).toISOString())
    .split(":")
    .map(Number);
  return h * 60 + m;
}

/**
 * The hours the grid covers: from the first broadcast to the end of the last
 * block, never less than MIN_SPAN_HOURS.
 *
 * Fitted to the week rather than to the whole day, because in CDMX almost
 * everything airs between one and noon. A 24-hour grid would be mostly empty
 * and push those blocks into a sliver.
 */
export function calendarHourRange(days: CalendarDay[]): {
  startHour: number;
  endHour: number;
} {
  const minutes = days.flatMap((d) =>
    d.items.map((e) => cdmxMinuteOfDay(e.airingAt)),
  );
  if (minutes.length === 0) {
    return {
      startHour: DEFAULT_START_HOUR,
      endHour: DEFAULT_START_HOUR + MIN_SPAN_HOURS,
    };
  }

  let startHour = Math.floor(Math.min(...minutes) / 60);
  let endHour = Math.min(
    24,
    Math.ceil((Math.max(...minutes) + BLOCK_MINUTES) / 60),
  );
  if (endHour - startHour < MIN_SPAN_HOURS) {
    endHour = Math.min(24, startHour + MIN_SPAN_HOURS);
    startHour = endHour - MIN_SPAN_HOURS;
  }
  return { startHour, endHour };
}

/**
 * Places one day's entries on the time axis.
 *
 * Entries whose blocks overlap form a cluster that is split into side-by-side
 * lanes; each entry takes the first lane already free at its start. Every entry
 * in a cluster reports the cluster's lane count, so they all share one width.
 */
export function layoutDayEntries(items: CalendarEntry[]): PlacedEntry[] {
  const sorted = items
    .map((entry) => ({ entry, startMinute: cdmxMinuteOfDay(entry.airingAt) }))
    .sort((a, b) => a.startMinute - b.startMinute);

  const placed: PlacedEntry[] = [];
  let cluster: PlacedEntry[] = [];
  let laneEnds: number[] = [];
  // Below any real minute, so the first entry always opens a cluster.
  let clusterEnd = -1;

  // A cluster's lane count is only known once nothing else overlaps it, so it
  // is written onto its entries here rather than when each one is placed.
  const closeCluster = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const { entry, startMinute } of sorted) {
    if (startMinute >= clusterEnd) closeCluster();
    const end = startMinute + BLOCK_MINUTES;
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= startMinute);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    clusterEnd = Math.max(clusterEnd, end);
    cluster.push({ entry, startMinute, lane, lanes: 1 });
  }
  closeCluster();
  return placed;
}
