import { DayEntryList } from "@/components/calendar/DayEntryList";
import { formatDayLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * The week as one table of seven columns split by hairlines, the way desktop
 * calendars draw it, instead of seven floating cards. Columns share one height
 * so an empty day still reads as a day.
 *
 * Hovering a column only lights its background. The cards of the other days
 * stay grey until each one is hovered on its own, so pointing at a day does not
 * flood it with colour.
 */
export function WeekGrid({
  days,
  today,
  statuses,
}: {
  days: CalendarDay[];
  today: string | null;
  statuses: StatusByAnimeId;
}) {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-md border border-white/10 bg-neutral-950/60">
      {days.map((day, index) => {
        const isToday = day.date === today;
        const dimmed = today !== null && !isToday;
        const { weekday, day: number } = formatDayLabel(day.date);
        return (
          <section
            key={day.date}
            aria-current={isToday ? "date" : undefined}
            aria-label={`${weekday} ${number}`}
            data-dimmed={dimmed || undefined}
            className={cn(
              "flex min-w-0 flex-col transition-colors",
              index > 0 && "border-l border-white/10",
              // A light from above rather than a flat wash: today reads as the
              // lit stage of the week.
              isToday
                ? "bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_45%)]"
                : "hover:bg-white/[0.03]",
            )}
          >
            <h2
              className={cn(
                "flex flex-col items-center gap-1 border-b py-3",
                isToday ? "border-primary/40" : "border-white/10",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-white/45",
                )}
              >
                {weekday}
              </span>
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-full text-xl font-semibold tabular-nums",
                  isToday ? "bg-primary text-white" : "text-white/70",
                )}
              >
                {number}
              </span>
            </h2>
            <div data-testid="day-body" className="min-h-[28rem] flex-1 p-2">
              <DayEntryList day={day} statuses={statuses} dimmed={dimmed} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
