"use client";

import Link from "next/link";
import { formatCdmxTime, formatEpisodeRange, timeAgo } from "@/lib/episodes";
import { cn } from "@/lib/utils";
import type { EpisodeNotification } from "@/types/notifications";

/** One release in the bell: out already (with its unread dot), or due today. */
export function NotificationRow({
  n,
  upcoming,
  unread,
  now,
  onNavigate,
}: {
  n: EpisodeNotification;
  upcoming: boolean;
  unread: boolean;
  now: number;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={`/anime/${n.animeId}`}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors",
          // Dimmed, not removed: a read episode is still the answer to "which
          // one came out today". A pending one is not dimmed — it has not been
          // read, it has not happened.
          !upcoming && !unread && "opacity-60",
        )}
      >
        {/* 2:3, the poster's own ratio. */}
        {n.poster ? (
          <img
            src={n.poster}
            alt=""
            className="w-12 h-[4.5rem] rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-[4.5rem] rounded-md bg-white/10 shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-white line-clamp-2">
            {n.title}
          </span>
          <span className="block mt-1 text-sm text-white/60">
            {formatEpisodeRange(n.range)} ·{" "}
            {upcoming ? (
              <span className="text-sky-300">
                Sale a las {formatCdmxTime(n.airedAt)}
              </span>
            ) : (
              timeAgo(n.airedAt, now)
            )}
          </span>
        </span>
        {unread && (
          <span className="shrink-0 flex items-center">
            <span
              className="w-2 h-2 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span className="sr-only">Sin leer</span>
          </span>
        )}
      </Link>
    </li>
  );
}
