"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ProviderBadge } from "@/components/ProviderBadge";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { ActionButton, FavButton } from "@/components/common/Buttons";
import Icon from "@/components/custom/Icon";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { cn } from "@/lib/utils";
import type { Anime, AnimeEntry } from "@/types/anime";

type Props = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
  /**
   * Actions are opt-in. A surface that only navigates — a franchise strip, say
   * — passes neither and gets a row with no controls, rather than buttons that
   * open a modal it never wired up.
   */
  onToggleFavorite?: (anime: Anime, next: boolean) => void;
  onAddToList?: (anime: Anime) => void;
  /** Tracking state, owned by the parent so the query stays batched. */
  animeEntry?: AnimeEntry | null;
  listCount?: number;
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
export function AnimeListRow({
  anime,
  onOpen,
  onToggleFavorite,
  onAddToList,
  animeEntry = null,
  listCount = 0,
}: Props) {
  // Optimistic, exactly as the poster card does it: the heart flips on click
  // and the write follows, because waiting for a round-trip to colour an icon
  // makes the control feel broken.
  const [isFav, setFav] = useState(animeEntry?.favorite ?? false);
  useEffect(() => {
    setFav(animeEntry?.favorite ?? false);
  }, [animeEntry?.favorite]);

  const providers = uniqueNormalizedProviders(anime.providers);
  const continuationOf = anime.meta?.continuationOf ?? null;
  const poster = anime.images?.poster ?? null;
  const rating = anime.meta?.rating;

  const episodes = anime.meta?.episodes;
  const type = anime.meta?.type;

  return (
    // A container, not a button. The row used to be one, which made it
    // impossible to put a favourite or an add control inside it — nested
    // buttons are invalid HTML, and browsers resolve them by dropping the
    // inner one. What opens the anime is now the poster-and-text area; the
    // actions sit beside it as siblings.
    <div
      className={cn(
        "group relative w-full flex items-stretch gap-3 p-2.5 rounded-xl",
        "bg-white/5 border border-white/10 transition-colors",
        "[@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:border-white/20",
        "focus-within:border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen?.(anime)}
        aria-label={`Ver detalles de ${anime.title}`}
        // Stretched over the row so the whole surface stays clickable, but
        // underneath the actions, which sit above it in the stacking order.
        className="absolute inset-0 z-0 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      <div className="relative z-10 w-14 sm:w-16 shrink-0 aspect-2/3 rounded-lg overflow-hidden bg-white/5 pointer-events-none">
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

      <div className="relative z-10 min-w-0 flex-1 flex flex-col gap-1 py-0.5 pointer-events-none">
        <p className="text-sm font-medium text-white/90 leading-tight line-clamp-2">
          {anime.title}
        </p>

        <p className="text-xs text-white/50 truncate">
          {/* On a phone the score moves into this line. Beside the actions it
              pushed the text column down to about ninety pixels, which is where
              titles and provider badges were being crushed. */}
          {typeof rating === "number" && (
            <span className="sm:hidden text-primary font-medium">
              ★ {rating.toFixed(1)}
              {" · "}
            </span>
          )}
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

      <div className="relative z-10 shrink-0 self-center flex flex-col sm:flex-row items-center gap-1 pr-0.5">
        {typeof rating === "number" && (
          <div className="hidden sm:block pointer-events-none pr-1">
            <ScoreBadge value={rating} />
          </div>
        )}

        {/* The same two controls the poster card uses, from the same module.
            A row with its own heart would be a second answer to a question
            already settled. */}
        {onToggleFavorite && (
          <FavButton
            active={isFav}
            onClick={(e) => {
              e.stopPropagation();
              const next = !isFav;
              setFav(next);
              onToggleFavorite(anime, next);
            }}
          />
        )}

        {onAddToList && (
          <ActionButton
            variant="soft"
            size="sm"
            icon={<Icon name="Plus" size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onAddToList(anime);
            }}
          >
            {listCount > 0 ? (
              listCount
            ) : (
              // Icon-only on a phone, but still named: `sr-only` rather than
              // `hidden`, which would remove the word from the accessibility
              // tree along with the pixels.
              <span className="sr-only sm:not-sr-only">Añadir</span>
            )}
          </ActionButton>
        )}
      </div>
    </div>
  );
}
