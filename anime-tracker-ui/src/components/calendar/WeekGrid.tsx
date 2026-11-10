import { DayEntryList } from "@/components/calendar/DayEntryList";
import { formatDayLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * The other days of a week that contains today: turned down at all times so
 * today stands out, and brought back while the pointer or focus is on them.
 * The lift uses `group-hover`, which Tailwind already limits to devices that
 * can hover.
 */
const DIMMED_BODY =
  "opacity-55 saturate-[.35] group-hover:opacity-100 group-hover:saturate-100 group-focus-within:opacity-100 group-focus-within:saturate-100 motion-safe:transition-[opacity,filter] motion-safe:duration-200";

/**
 * The week as one table of seven columns split by hairlines, the way desktop
 * calendars draw it, instead of seven floating cards. Columns share one height
 * so an empty day still reads as a day.
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
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-white/10 bg-black/20">
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
              "group flex min-w-0 flex-col",
              index > 0 && "border-l border-white/10",
              isToday && "bg-primary/[0.06]",
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
            <div
              data-testid="day-body"
              className={cn("min-h-[28rem] flex-1 p-2", dimmed && DIMMED_BODY)}
            >
              <DayEntryList day={day} statuses={statuses} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
