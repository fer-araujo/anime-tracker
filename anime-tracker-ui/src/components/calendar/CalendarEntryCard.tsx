import Image from "next/image";
import Link from "next/link";
import { formatCdmxTime, formatEpisodeRange } from "@/lib/episodes";
import { STATUS_LABELS } from "@/constants/tracking";
import { STATUS_BAR_COLORS } from "@/lib/lists";
import { cn } from "@/lib/utils";
import type { TrackingStatus } from "@/types/anime";
import type { CalendarEntry } from "@/types/calendar";

/**
 * One broadcast, tinted with the colour of the user's status for it.
 *
 * The tint reuses the status bar's palette at low opacity instead of a second
 * set of colours, so blue means "Viendo" here and on /lists alike. The status
 * name is also written out for screen readers: colour alone tells them nothing.
 */
export function CalendarEntryCard({
  entry,
  status,
}: {
  entry: CalendarEntry;
  status: TrackingStatus | undefined;
}) {
  return (
    <Link
      href={`/anime/${entry.animeId}`}
      className="group relative flex items-start gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {status && (
        <span
          aria-hidden="true"
          data-status-tint={status}
          className={cn("absolute inset-0 opacity-25", STATUS_BAR_COLORS[status])}
        />
      )}

      <span className="relative w-14 xl:w-10 shrink-0 aspect-2/3 rounded overflow-hidden bg-white/10">
        {entry.poster && (
          <Image
            src={entry.poster}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        )}
      </span>

      <span className="relative min-w-0 flex flex-col gap-0.5">
        <span className="text-sm xl:text-[13px] font-medium leading-snug text-white line-clamp-2">
          {entry.title}
        </span>
        <time
          dateTime={entry.airingAt}
          className="text-xs font-semibold tabular-nums text-white/90"
        >
          {formatCdmxTime(entry.airingAt)}
        </time>
        <span className="text-xs text-white/70">
          {formatEpisodeRange(entry.range)}
        </span>
        {status && (
          <span className="sr-only">{STATUS_LABELS[status]}</span>
        )}
      </span>
    </Link>
  );
}
