import { DayEntries } from "@/components/calendar/DayEntries";
import { formatDayLabel } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * The other days of the week, turned down until the pointer reaches them.
 *
 * Only where a pointer exists: on a touch screen nothing could ever wake them.
 * Written as "dimmed while not hovered or focused" instead of a dim plus a
 * `hover:` undo, which are equal in specificity and leave the winner to the
 * order the stylesheet happens to emit them in. Opacity stays high enough for
 * the small text to remain readable; desaturation does most of the work.
 */
const DIMMED_DAY =
  "motion-safe:transition-[opacity,filter] motion-safe:duration-200 [@media(hover:hover)]:not-hover:not-focus-within:opacity-75 [@media(hover:hover)]:not-hover:not-focus-within:saturate-50";

/** The whole week side by side, for screens wide enough to hold seven columns. */
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
    <div className="hidden xl:grid grid-cols-7 gap-3" data-testid="week-grid">
      {days.map((day) => {
        const isToday = day.date === today;
        const { weekday, day: number } = formatDayLabel(day.date);
        return (
          <section
            key={day.date}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex flex-col gap-3 min-w-0",
              today !== null && !isToday && DIMMED_DAY,
            )}
          >
            <h2 className="flex items-baseline gap-2">
              <span className="text-sm text-white/70">{weekday}</span>
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  isToday ? "text-primary" : "text-white",
                )}
              >
                {number}
              </span>
              {isToday ? (
                <span className="text-xs font-medium text-primary">Hoy</span>
              ) : null}
            </h2>
            <DayEntries day={day} statuses={statuses} />
          </section>
        );
      })}
    </div>
  );
}
