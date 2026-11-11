import Image from "next/image";
import Link from "next/link";
import { Pill } from "@/components/common/Pills";
import { DELAYED_LABEL } from "@/constants/broadcast";
import {
  formatCdmxTime,
  formatDelayLabel,
  formatEpisodeRange,
} from "@/lib/episodes";
import { STATUS_LABELS } from "@/constants/tracking";
import {
  CARD_FOCUS,
  CARD_HOVER_SHADOW,
  CARD_SURFACE,
  CHIP_ON_IMAGE,
  IMAGE_HOVER_ZOOM,
  SCRIM_BOTTOM,
  STATUS_LINE,
} from "@/lib/cardStyles";
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
      className={cn(
        "group/card relative isolate block aspect-[16/10] overflow-hidden",
        CARD_SURFACE,
        CARD_HOVER_SHADOW,
        CARD_FOCUS,
      )}
    >
      <span
        aria-hidden="true"
        data-testid="entry-art"
        className={cn(
          "absolute inset-0 -z-10 bg-neutral-800",
          IMAGE_HOVER_ZOOM,
          // cn() does not merge conflicting utilities and Tailwind emits the token's
          // transition-transform later, so only `!` keeps the grayscale lift fading in.
          // `scale` is listed because v4's scale-* sets that property, not transform.
          "motion-safe:transition-[filter,transform,scale]!",
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
        className={cn("absolute inset-x-0 bottom-0 h-3/5 -z-10", SCRIM_BOTTOM)}
      />

      {/* One row, so the delay chip sits beside the time instead of over it. */}
      <span className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
        <time
          dateTime={entry.airingAt}
          className={cn("tabular-nums", CHIP_ON_IMAGE)}
        >
          {formatCdmxTime(entry.airingAt)}
        </time>
        {entry.delayed ? (
          // The date only in the title and for screen readers: the card is
          // narrow, and "Retrasado" alone is what changes what the viewer does.
          <Pill tone="amber" title={formatDelayLabel(entry.delayedUntil)}>
            <span aria-hidden="true">{DELAYED_LABEL}</span>
            <span className="sr-only">{formatDelayLabel(entry.delayedUntil)}</span>
          </Pill>
        ) : null}
      </span>

      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-2.5 pb-2.5">
        <span className="text-sm font-semibold leading-tight text-white line-clamp-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
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
          className={cn("absolute inset-x-0 bottom-0", STATUS_LINE, STATUS_BAR_COLORS[status])}
        />
      ) : null}
    </Link>
  );
}
