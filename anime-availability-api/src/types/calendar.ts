/** What the calendar's ordering rule reads from an entry. */
export type CalendarSortable = {
  animeId: number;
  title: string;
  /** ISO-8601, or null when the source states no time. */
  airingAt: string | null;
};
