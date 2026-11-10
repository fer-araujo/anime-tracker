import { STATUS_LABELS } from "@/constants/tracking";
import { STATUS_BAR_COLORS, STATUS_BAR_ORDER } from "@/lib/lists";
import { cn } from "@/lib/utils";
import type { StatusByAnimeId, TrackingStatus } from "@/types/anime";
import type { CalendarDay } from "@/types/calendar";

/**
 * What each tint means, limited to the statuses on screen this week. It reads
 * in the bar's order so the two keys agree.
 */
export function StatusLegend({
  days,
  statuses,
}: {
  days: CalendarDay[];
  statuses: StatusByAnimeId;
}) {
  const present = new Set<TrackingStatus>();
  for (const day of days) {
    for (const entry of day.items) {
      const status = statuses.get(entry.animeId);
      if (status) present.add(status);
    }
  }
  if (present.size === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/70">
      {STATUS_BAR_ORDER.filter((status) => present.has(status)).map(
        (status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-sm", STATUS_BAR_COLORS[status])}
            />
            {STATUS_LABELS[status]}
          </li>
        ),
      )}
    </ul>
  );
}
