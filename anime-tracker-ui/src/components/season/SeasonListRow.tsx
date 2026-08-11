"use client";

import Image from "next/image";
import { ProviderBadge } from "@/components/ProviderBadge";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { cn } from "@/lib/utils";
import type { Anime } from "@/types/anime";

type Props = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
};

/**
 * One anime as a row.
 *
 * This exists for phones, not for desktop. AnimeCard keeps everything it knows
 * — studio, episodes, genres, synopsis, providers — inside an overlay that is
 * `hidden md:flex` behind `md:group-hover`, so on a touch screen the grid shows
 * a cover and a title and nothing else, and the choice comes down to the
 * artwork. A row has no hover to depend on: the same facts are simply visible.
 *
 * Density is the other half. At phone width the grid fits about two cards on
 * screen; five rows fit in the same space, and each one says more.
 */
export function SeasonListRow({ anime, onOpen }: Props) {
  const providers = uniqueNormalizedProviders(anime.providers);
  const continuationOf = anime.meta?.continuationOf ?? null;
  const poster = anime.images?.poster ?? null;

  const episodes = anime.meta?.episodes;
  const type = anime.meta?.type;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(anime)}
      className={cn(
        "group w-full text-left flex items-stretch gap-3 p-2.5 rounded-xl",
        "bg-white/5 border border-white/10 transition-colors cursor-pointer",
        "[@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:border-white/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
      aria-label={`Ver detalles de ${anime.title}`}
    >
      <div className="relative w-14 sm:w-16 shrink-0 aspect-2/3 rounded-lg overflow-hidden bg-white/5">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            // Fixed and small on every breakpoint, so the browser never fetches
            // a grid-sized cover for a thumbnail.
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-1 py-0.5">
        <p className="text-sm font-medium text-white/90 leading-tight line-clamp-2">
          {anime.title}
        </p>

        <p className="text-xs text-white/50 truncate">
          {anime.meta?.studio ?? "Estudio desconocido"}
          {type || episodes ? " · " : ""}
          {type ?? ""}
          {type && episodes ? " · " : ""}
          {episodes ? `${episodes} eps` : ""}
        </p>

        {/* Same treatment as the grid card's overlay, deliberately: if the two
            views described a sequel differently they would drift apart. */}
        {continuationOf && (
          <p
            className="text-xs text-white/50 flex items-baseline gap-1 min-w-0"
            title={`Continúa ${continuationOf.title}`}
          >
            <span className="shrink-0" aria-hidden="true">
              ↳
            </span>
            <span className="truncate">{continuationOf.title}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-0.5">
          {providers.length > 0 ? (
            providers.map((label) => (
              <ProviderBadge key={label} label={label} />
            ))
          ) : (
            <ProviderBadge label="Pirata" />
          )}
        </div>
      </div>

      {typeof anime.meta?.rating === "number" && (
        <div className="shrink-0 self-center pr-1">
          <ScoreBadge value={anime.meta.rating} />
        </div>
      )}
    </button>
  );
}
