import Image from "next/image";
import Link from "next/link";
import { formatCdmxTime, formatEpisodeRange } from "@/lib/episodes";
import { STATUS_LABELS } from "@/constants/tracking";
import { STATUS_BAR_COLORS } from "@/lib/lists";
import { cn } from "@/lib/utils";
import type { TrackingStatus } from "@/types/anime";
import type { CalendarEntry } from "@/types/calendar";

/**
 * One broadcast as a calendar event: flat and nearly square, like the events
 * of a desktop calendar, so a column of them reads as a schedule and not as a
 * stack of cards.
 *
 * The poster is large enough to recognise. Titles here are long English
 * translations that get cut to "The Laid-Off Cheat-…", and fans know a show by
 * its cover first; a thumbnail too small to read would cost the room without
 * giving that back.
 *
 * The status shows as an edge bar plus a faint wash in the status bar's own
 * colours, so blue means "Viendo" here and on /lists alike. The name is also
 * written out for screen readers, since colour alone tells them nothing.
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
      className="relative flex gap-2.5 overflow-hidden rounded-[4px] bg-white/[0.03] py-1.5 pl-2.5 pr-2 transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {status ? (
        <>
          <span
            aria-hidden="true"
            data-status-tint={status}
            className={cn("absolute inset-0 opacity-15", STATUS_BAR_COLORS[status])}
          />
          <span
            aria-hidden="true"
            className={cn("absolute inset-y-0 left-0 w-[3px]", STATUS_BAR_COLORS[status])}
          />
        </>
      ) : null}

      <span className="relative w-12 aspect-2/3 shrink-0 overflow-hidden rounded-[2px] bg-white/10">
        {entry.poster ? (
          <Image
            src={entry.poster}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : null}
      </span>

      <span className="relative min-w-0 flex flex-col justify-center gap-0.5">
        <span className="text-[13px] font-semibold leading-tight text-white line-clamp-2">
          {entry.title}
        </span>
        <time
          dateTime={entry.airingAt}
          className="text-xs font-semibold tabular-nums text-white/90"
        >
          {formatCdmxTime(entry.airingAt)}
        </time>
        <span className="text-xs text-white/65 truncate">
          {formatEpisodeRange(entry.range)}
        </span>
        {status ? <span className="sr-only">{STATUS_LABELS[status]}</span> : null}
      </span>
    </Link>
  );
}
