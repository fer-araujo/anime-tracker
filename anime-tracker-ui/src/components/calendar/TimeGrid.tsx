import { CalendarEntryCard } from "@/components/calendar/CalendarEntryCard";
import {
  blockMinutes,
  calendarHourRange,
  cdmxMinuteOfDay,
  formatDayLabel,
  layoutDayEntries,
  minutesToPx,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/** Breathing room between blocks that follow each other on the hour. */
const BLOCK_GAP_PX = 4;

/**
 * The other days of a week that contains today: turned down at all times so
 * today stands out, and brought back while the pointer or focus is on them.
 * The lift uses `group-hover`, which Tailwind already limits to devices that
 * can hover; on a touch screen the narrow layout shows one day at a time and
 * passes `dimInactive={false}`.
 */
const DIMMED_BODY =
  "opacity-55 saturate-[.35] group-hover:opacity-100 group-hover:saturate-100 group-focus-within:opacity-100 group-focus-within:saturate-100 motion-safe:transition-[opacity,filter] motion-safe:duration-200";

type Hours = { startHour: number; endHour: number };

function DayColumn({
  day,
  hours,
  isToday,
  dimmed,
  showHeader,
  nowMinute,
  statuses,
}: {
  day: CalendarDay;
  hours: Hours;
  isToday: boolean;
  dimmed: boolean;
  showHeader: boolean;
  nowMinute: number;
  statuses: StatusByAnimeId;
}) {
  const { startHour, endHour } = hours;
  const startMinute = startHour * 60;
  const { weekday, day: number } = formatDayLabel(day.date);
  const nowInRange = nowMinute >= startMinute && nowMinute <= endHour * 60;

  return (
    <section
      aria-current={isToday ? "date" : undefined}
      aria-label={`${weekday} ${number}`}
      data-dimmed={dimmed || undefined}
      className={cn(
        "group flex-1 min-w-0 flex flex-col rounded-2xl",
        isToday
          ? "bg-primary/[0.07] ring-1 ring-primary/30"
          : "bg-black/20 ring-1 ring-white/5",
      )}
    >
      {showHeader ? (
        <h2 className="h-16 flex items-center justify-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isToday ? "text-white" : "text-white/40",
            )}
          >
            {weekday}
          </span>
          <span
            className={cn(
              "grid place-items-center size-9 rounded-full text-lg font-bold tabular-nums",
              isToday ? "bg-primary text-white" : "text-white/60",
            )}
          >
            {number}
          </span>
          {isToday ? (
            <span className="text-xs font-semibold text-primary">Hoy</span>
          ) : null}
        </h2>
      ) : null}

      <div
        data-testid="day-body"
        className={cn("relative", dimmed && DIMMED_BODY)}
        style={{ height: minutesToPx((endHour - startHour) * 60) }}
      >
        {Array.from({ length: endHour - startHour - 1 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-white/5"
            style={{ top: minutesToPx((i + 1) * 60) }}
          />
        ))}

        {day.status === "unavailable" ? (
          <p className="absolute inset-x-0 top-4 px-2 text-center text-xs text-white/50">
            Sin datos para este día
          </p>
        ) : day.items.length === 0 ? (
          <p className="absolute inset-x-0 top-4 px-2 text-center text-xs text-white/30">
            Sin episodios
          </p>
        ) : null}

        {layoutDayEntries(day.items).map((placed) => (
          <div
            key={`${placed.entry.animeId}:${placed.entry.airingAt}`}
            className="absolute px-1"
            style={{
              top: minutesToPx(placed.startMinute - startMinute),
              height:
                minutesToPx(blockMinutes(placed.startMinute, endHour)) -
                BLOCK_GAP_PX,
              left: `${(placed.lane / placed.lanes) * 100}%`,
              width: `${100 / placed.lanes}%`,
            }}
          >
            <CalendarEntryCard
              entry={placed.entry}
              status={statuses.get(placed.entry.animeId)}
              compact={placed.lanes > 1}
            />
          </div>
        ))}

        {isToday && nowInRange ? (
          <div
            aria-hidden="true"
            data-testid="now-line"
            className="absolute inset-x-0 z-10 flex items-center pointer-events-none"
            style={{ top: minutesToPx(nowMinute - startMinute) }}
          >
            <span className="-ml-1 size-2.5 rounded-full bg-primary" />
            <span className="h-0.5 flex-1 bg-primary" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Days as columns over a shared hour axis, with each broadcast placed at its
 * CDMX time. Used for the whole week on wide screens and for one day on narrow
 * ones, so both read the same.
 */
export function TimeGrid({
  days,
  today,
  statuses,
  now,
  dimInactive = true,
  showHeaders = true,
}: {
  days: CalendarDay[];
  today: string | null;
  statuses: StatusByAnimeId;
  now: number;
  dimInactive?: boolean;
  showHeaders?: boolean;
}) {
  const hours = calendarHourRange(days);
  const { startHour, endHour } = hours;
  const nowMinute = cdmxMinuteOfDay(now);

  return (
    <div className="flex gap-2">
      <div aria-hidden="true" className="w-11 shrink-0">
        {showHeaders ? <div className="h-16" /> : null}
        <div
          className="relative"
          style={{ height: minutesToPx((endHour - startHour) * 60) }}
        >
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute right-1 -translate-y-1/2 text-[11px] tabular-nums text-white/40"
              style={{ top: minutesToPx(i * 60) }}
            >
              {String(startHour + i).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>

      {days.map((day) => {
        const isToday = day.date === today;
        return (
          <DayColumn
            key={day.date}
            day={day}
            hours={hours}
            isToday={isToday}
            dimmed={dimInactive && today !== null && !isToday}
            showHeader={showHeaders}
            nowMinute={nowMinute}
            statuses={statuses}
          />
        );
      })}
    </div>
  );
}
