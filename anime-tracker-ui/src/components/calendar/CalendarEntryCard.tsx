import Image from "next/image";
import Link from "next/link";
import { formatCdmxTime, formatEpisodeRange } from "@/lib/episodes";
import { STATUS_LABELS } from "@/constants/tracking";
import { STATUS_BAR_COLORS } from "@/lib/lists";
import { cn } from "@/lib/utils";
import type { TrackingStatus } from "@/types/anime";
import type { CalendarEntry } from "@/types/calendar";

/**
 * One broadcast as a film still: the poster fills the frame and the title sits
 * on it like a credit, in the same visual language as AnimeCard.
 *
 * Landscape rather than portrait so a busy day stays one screen tall; the crop
 * favours the upper third of the poster, where faces usually are. Text reads
 * over a scrim whose dark end is under the text, the same gradient AnimeCard
 * uses, and a card with no poster keeps that frame so the column stays even.
 *
 * `dimmed` turns only the picture grey, never the text, so the title keeps its
 * contrast. Colour returns while this card, and only this card, is hovered or
 * focused; the day is still told apart by its header, not by grey alone.
 */
export function CalendarEntryCard({
  entry,
  status,
  dimmed = false,
}: {
  entry: CalendarEntry;
  status: TrackingStatus | undefined;
  dimmed?: boolean;
}) {
  return (
    <Link
      href={`/anime/${entry.animeId}`}
      className="group/card relative isolate block aspect-[16/10] overflow-hidden rounded-md border border-white/10 bg-neutral-950 transition-shadow duration-300 ease-out md:hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden="true"
        data-testid="entry-art"
        className={cn(
          "absolute inset-0 -z-10 bg-neutral-800",
          "motion-safe:transition-[filter,transform] motion-safe:duration-500 motion-safe:group-hover/card:scale-[1.04]",
          dimmed &&
            "grayscale group-hover/card:grayscale-0 group-focus-visible/card:grayscale-0",
        )}
      >
        {entry.poster ? (
          <Image
            src={entry.poster}
            alt=""
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-[center_25%]"
          />
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5 -z-10 bg-[linear-gradient(to_top,rgba(0,0,0,0.90)_20%,rgba(0,0,0,0.55)_60%,rgba(0,0,0,0)_100%)]"
      />

      <time
        dateTime={entry.airingAt}
        className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white backdrop-blur-sm"
      >
        {formatCdmxTime(entry.airingAt)}
      </time>

      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-2.5 pb-2.5">
        <span className="text-[13px] font-semibold leading-tight text-white line-clamp-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
          {entry.title}
        </span>
        <span className="text-xs text-white/75 truncate">
          {formatEpisodeRange(entry.range)}
        </span>
        {status ? <span className="sr-only">{STATUS_LABELS[status]}</span> : null}
      </span>

      {status ? (
        <span
          aria-hidden="true"
          data-status-tint={status}
          className={cn("absolute inset-x-0 bottom-0 h-0.5", STATUS_BAR_COLORS[status])}
        />
      ) : null}
    </Link>
  );
}
