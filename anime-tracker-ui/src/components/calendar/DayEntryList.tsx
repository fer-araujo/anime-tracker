import { CalendarEntryCard } from "@/components/calendar/CalendarEntryCard";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * One day's broadcasts in airing order, or why there are none. Two columns on
 * tablets so the landscape cards do not stretch across the whole screen; the
 * `xl:` reset keeps them stacked inside a week column.
 */
export function DayEntryList({
  day,
  statuses,
  dimmed = false,
}: {
  day: CalendarDay;
  statuses: StatusByAnimeId;
  dimmed?: boolean;
}) {
  if (day.status === "unavailable") {
    return (
      <p className="px-1 pt-1 text-xs text-white/50">Sin datos para este día</p>
    );
  }
  if (day.items.length === 0) {
    return <p className="px-1 pt-1 text-xs text-white/30">Sin episodios</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {day.items.map((entry) => (
        <li key={`${entry.animeId}:${entry.airingAt}`}>
          <CalendarEntryCard
            entry={entry}
            status={statuses.get(entry.animeId)}
            dimmed={dimmed}
          />
        </li>
      ))}
    </ul>
  );
}
