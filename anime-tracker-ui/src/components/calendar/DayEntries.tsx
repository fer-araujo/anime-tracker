import { CalendarEntryCard } from "@/components/calendar/CalendarEntryCard";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/** One day's broadcasts, or why there are none. */
export function DayEntries({
  day,
  statuses,
}: {
  day: CalendarDay;
  statuses: StatusByAnimeId;
}) {
  if (day.status === "unavailable") {
    return <p className="text-sm text-white/50">Sin datos para este día</p>;
  }
  if (day.items.length === 0) {
    return <p className="text-sm text-white/50">Sin episodios</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {day.items.map((entry) => (
        <li key={entry.animeId}>
          <CalendarEntryCard entry={entry} status={statuses.get(entry.animeId)} />
        </li>
      ))}
    </ul>
  );
}
