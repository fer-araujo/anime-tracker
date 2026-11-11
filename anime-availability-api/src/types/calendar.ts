import type { DayName } from "../utils/cdmxCalendar.js";
import type { BroadcastDelay, EpisodeRange } from "./notifications.js";

/** What the calendar's ordering rule reads from an entry. */
export type CalendarSortable = {
  animeId: number;
  title: string;
  /** ISO-8601, or null when the source states no time. */
  airingAt: string | null;
};

export type CalendarRequest = {
  /** AniList ids of every anime the user has given a status. */
  animeIds: number[];
  /** Weeks away from the current one. */
  week: -1 | 0 | 1;
};

export type CalendarEntry = CalendarSortable & BroadcastDelay & {
  /** Always known here: every row comes from a dated timetable. */
  airingAt: string;
  poster: string | null;
  range: EpisodeRange;
};

export type CalendarDay = {
  date: string;
  day: DayName;
  /**
   * `unavailable` means the timetable has nothing at all for this day, which
   * only happens when its fetch failed. Without it a failed day would read as
   * "nothing of yours airs", which is a different and false statement.
   */
  status: "ok" | "unavailable";
  items: CalendarEntry[];
};

export type CalendarResponse = {
  meta: {
    firstDate: string;
    lastDate: string;
    /** Null when the requested week does not contain today. */
    today: string | null;
    week: CalendarRequest["week"];
    timezone: "America/Mexico_City";
  };
  data: CalendarDay[];
};
