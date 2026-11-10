import { DayEntries } from "@/components/calendar/DayEntries";
import { formatDayLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * The week for narrow screens: a strip of days choosing the one listed below.
 *
 * Mounted next to the grid and swapped by breakpoint in CSS rather than in JS,
 * because the server render cannot know the viewport and a JS choice would
 * flash the wrong layout while hydrating.
 */
export function DayPicker({
  days,
  today,
  selected,
  onSelect,
  statuses,
}: {
  days: CalendarDay[];
  today: string | null;
  selected: string | null;
  onSelect: (date: string) => void;
  statuses: StatusByAnimeId;
}) {
  const current = days.find((d) => d.date === selected);
  return (
    <div className="xl:hidden flex flex-col gap-5" data-testid="day-picker">
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isToday = day.date === today;
          const isSelected = day.date === selected;
          const { weekday, day: number } = formatDayLabel(day.date);
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border py-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/[0.03] border-white/10 text-white/70",
                isToday && "border-primary/60",
              )}
            >
              <span className="text-[11px]">{weekday}</span>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  isToday && "text-primary",
                )}
              >
                {number}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-1 rounded-full",
                  day.items.length > 0 ? "bg-white/70" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
      {current ? <DayEntries day={current} statuses={statuses} /> : null}
    </div>
  );
}
