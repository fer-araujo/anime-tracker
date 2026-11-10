import Image from "next/image";
import Link from "next/link";
import { formatCdmxTime, formatEpisodeRange } from "@/lib/episodes";
import { STATUS_LABELS } from "@/constants/tracking";
import { STATUS_BAR_COLORS } from "@/lib/lists";
import { cn } from "@/lib/utils";
import type { TrackingStatus } from "@/types/anime";
import type { CalendarEntry } from "@/types/calendar";

/**
 * One broadcast as a block on the time grid, filling the box the grid gives it.
 *
 * The status shows as an edge bar plus a faint wash in the status bar's own
 * colours, so blue means "Viendo" here and on /lists alike. The name is also
 * written out for screen readers, since colour alone tells them nothing.
 *
 * `compact` drops the poster for blocks sharing their hour with others, where
 * the column is split in lanes and a poster would leave no room for the title.
 */
export function CalendarEntryCard({
  entry,
  status,
  compact = false,
}: {
  entry: CalendarEntry;
  status: TrackingStatus | undefined;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/anime/${entry.animeId}`}
      className="relative flex h-full gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm py-2 pl-3 pr-2 transition-colors hover:bg-white/10 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {status ? (
        <>
          <span
            aria-hidden="true"
            data-status-tint={status}
            className={cn("absolute inset-0 opacity-10", STATUS_BAR_COLORS[status])}
          />
          <span
            aria-hidden="true"
            className={cn("absolute inset-y-0 left-0 w-[3px]", STATUS_BAR_COLORS[status])}
          />
        </>
      ) : null}

      {!compact ? (
        <span className="relative h-full aspect-2/3 shrink-0 overflow-hidden rounded-md bg-white/10">
          {entry.poster ? (
            <Image
              src={entry.poster}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : null}
        </span>
      ) : null}

      <span className="relative min-w-0 flex flex-col justify-center gap-0.5">
        <span
          className={cn(
            "font-semibold leading-snug text-white line-clamp-2",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {entry.title}
        </span>
        <time
          dateTime={entry.airingAt}
          className="text-xs font-semibold tabular-nums text-white/90"
        >
          {formatCdmxTime(entry.airingAt)}
        </time>
        {!compact ? (
          <span className="text-xs text-white/70 truncate">
            {formatEpisodeRange(entry.range)}
          </span>
        ) : null}
        {status ? <span className="sr-only">{STATUS_LABELS[status]}</span> : null}
      </span>
    </Link>
  );
}
