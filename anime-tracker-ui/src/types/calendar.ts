import type { TrackingStatus } from "@/types/anime";
import type { EpisodeRange } from "@/types/notifications";

/** Weeks away from the current one; the range the API answers. */
export type CalendarWeek = -1 | 0 | 1;

export type CalendarEntry = {
  animeId: number;
  title: string;
  poster: string | null;
  /** ISO-8601. */
  airingAt: string;
  range: EpisodeRange;
};

export type CalendarDay = {
  /** `YYYY-MM-DD` in CDMX. */
  date: string;
  /** `unavailable` means the day's data failed to load, not that it is empty. */
  status: "ok" | "unavailable";
  items: CalendarEntry[];
};

/** The status the calendar is narrowed to, or all of them. */
export type CalendarStatusFilter = TrackingStatus | "all";

/** An entry with its place on the time grid; minutes are since CDMX midnight. */
export type PlacedEntry = {
  entry: CalendarEntry;
  startMinute: number;
  /** Which side-by-side column it takes among the entries it overlaps. */
  lane: number;
  /** How many columns that group of overlapping entries needs. */
  lanes: number;
};

/** What the calendar page is showing; one at a time, in this order of precedence. */
export type CalendarView = "loading" | "untracked" | "error" | "ready";

export type AiringCalendar = {
  meta: {
    firstDate: string;
    lastDate: string;
    /** Null when the week on screen does not contain today. */
    today: string | null;
    week: CalendarWeek;
  };
  data: CalendarDay[];
};
