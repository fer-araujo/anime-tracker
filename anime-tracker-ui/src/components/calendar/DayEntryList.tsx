import { CalendarEntryCard } from "@/components/calendar/CalendarEntryCard";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/** One day's broadcasts in airing order, or why there are none. */
export function DayEntryList({
  day,
  statuses,
}: {
  day: CalendarDay;
  statuses: StatusByAnimeId;
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
    <ul className="flex flex-col gap-1.5">
      {day.items.map((entry) => (
        <li key={`${entry.animeId}:${entry.airingAt}`}>
          <CalendarEntryCard entry={entry} status={statuses.get(entry.animeId)} />
        </li>
      ))}
    </ul>
  );
}
