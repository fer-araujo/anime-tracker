import { TimeGrid } from "@/components/calendar/TimeGrid";
import { formatDayLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * The week for narrow screens: a strip of days choosing which one the time grid
 * below shows.
 *
 * Mounted next to the wide grid and swapped by breakpoint in CSS rather than in
 * JS, because the server render cannot know the viewport and a JS choice would
 * flash the wrong layout while hydrating.
 */
export function DayPicker({
  days,
  today,
  selected,
  onSelect,
  statuses,
  now,
}: {
  days: CalendarDay[];
  today: string | null;
  selected: string | null;
  onSelect: (date: string) => void;
  statuses: StatusByAnimeId;
  now: number;
}) {
  const current = days.find((d) => d.date === selected);
  return (
    <div className="xl:hidden flex flex-col gap-5" data-testid="day-picker">
      <div className="grid grid-cols-7 gap-1.5">
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
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/[0.03] border-white/10 text-white/50",
                isToday && !isSelected && "border-primary/50",
              )}
            >
              <span className="text-xs">{weekday}</span>
              <span
                className={cn(
                  "grid place-items-center size-8 rounded-full text-base font-bold tabular-nums",
                  isToday && "bg-primary text-white",
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
      {current ? (
        <TimeGrid
          days={[current]}
          today={today}
          statuses={statuses}
          now={now}
          dimInactive={false}
          showHeaders={false}
        />
      ) : null}
    </div>
  );
}
