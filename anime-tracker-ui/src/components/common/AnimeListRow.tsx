"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ProviderBadge } from "@/components/ProviderBadge";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { ActionButton, FavButton } from "@/components/common/Buttons";
import Icon from "@/components/custom/Icon";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { CARD_FOCUS, CARD_HOVER_SHADOW, CARD_SURFACE } from "@/lib/cardStyles";
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
        // `h-full` because the collection wraps each row in an animated cell:
        // the grid stretches that cell to the taller of two neighbours, but the
        // row inside kept its own height, so side-by-side boxes did not match.
        // Where the row is the grid item itself this changes nothing.
        "group relative w-full h-full flex items-stretch gap-3 p-2.5",
        CARD_SURFACE,
        CARD_HOVER_SHADOW,
        // The token's transition-shadow and this list both set transition-property, and
        // cn() does not merge them, so `!` lets the border lighten fade with the shadow
        // instead of snapping.
        "transition-[border-color,box-shadow]!",
        "[@media(hover:hover)]:hover:border-white/20",
        "focus-within:border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen?.(anime)}
        aria-label={`Ver detalles de ${anime.title}`}
        // Stretched over the row so the whole surface stays clickable, but
        // underneath the actions, which sit above it in the stacking order.
        className={cn(
          "absolute inset-0 z-0 rounded-md cursor-pointer",
          CARD_FOCUS,
        )}
      />

      {/* A smaller radius than the row so the corner nests inside the row's padding. */}
      <div className="relative z-10 w-14 sm:w-16 shrink-0 aspect-2/3 rounded-sm overflow-hidden bg-white/5 pointer-events-none">
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

      {/* Score on top, actions at the bottom, both flush with the row's right
          edge. Beside the title the score ended wherever the text column did,
          so it never lined up with the buttons below it. */}
      <div className="relative z-10 shrink-0 self-stretch flex flex-col items-end justify-between gap-2 py-0.5 pr-0.5">
        {typeof rating === "number" ? (
          <span className="pointer-events-none">
            <ScoreBadge value={rating} surface="plain" />
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1">
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

          {/* A square the size of the heart, with the list count as a small
            badge on its corner, like the bell's: "+ 1" as text made this button
            twice as wide as the one beside it. */}
          {onAddToList && (
            <span className="relative">
              <ActionButton
                variant="soft"
                size="sm"
                iconOnly
                ariaLabel={
                  listCount > 0
                    ? `Añadir a una lista (está en ${listCount})`
                    : "Añadir a una lista"
                }
                icon={<Icon name="Plus" size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToList(anime);
                }}
              >
                Añadir a una lista
              </ActionButton>
              {listCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-neutral-700 px-1 text-[10px] font-bold leading-none text-white tabular-nums ring-2 ring-neutral-950"
                >
                  {listCount}
                </span>
              ) : null}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
