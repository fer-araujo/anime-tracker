"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Icon from "@/components/custom/Icon";
import {
  resolveListAccent,
  resolveMosaicLayout,
  MOSAIC_GRID_CLASS,
  MOSAIC_POSTER_COUNT,
  STATUS_BAR_COLORS,
} from "@/lib/lists";
import type { UserList } from "@/hooks/useUserLists";

/**
 * A poster never fills more than half a card, and a card is a quarter of the
 * row on wide screens — asking Next for viewport-wide images would ship
 * several times the pixels the mosaic can actually show.
 */
const POSTER_SIZES =
  "(min-width: 1280px) 13vw, (min-width: 1024px) 17vw, (min-width: 768px) 25vw, 50vw";

export function ListCard({
  list,
  onDelete,
}: {
  list: UserList;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const accent = resolveListAccent(list.color);

  /**
   * The composition follows the poster slots the list owns, not the urls that
   * have resolved so far: covers arrive from a later batch request, so keying
   * off `poster_urls` would render an empty state first and then reflow the
   * whole grid under the user's cursor.
   */
  const layout = resolveMosaicLayout(list.poster_anime_ids.length);

  const open = () => router.push(`/lists/${list.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={list.name}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          // Space scrolls the page by default; this div is standing in for a button.
          event.preventDefault();
          open();
        }
      }}
      // On phones the grid is a single column and the card takes the favorites
      // banner's exact height (`h-36 sm:h-44`), so the two surfaces read as the
      // same object stacked. A ratio cannot do that — it would derive height
      // from the full-width column and overshoot the banner. From `md`, where
      // the grid goes multi-column, height comes back from the 3:2 ratio.
      // Must stay identical to the CollectionsTab skeletons and CreateListCard,
      // or the grid reflows the moment data lands.
      className={`group relative isolate w-full h-36 sm:h-44 md:h-auto md:aspect-[3/2] rounded-[14px] overflow-hidden border border-white/10 bg-white/5 cursor-pointer transition-colors duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 ${accent.ring}`}
    >
      {/*
        Mosaic — edge to edge, so the covers are the card rather than an
        ornament on it.

        `gap-0` and no backing colour: the old `gap-px bg-white/5` painted a
        light 1px line between every poster, advertising the division instead
        of hiding it. With five lists on screen that was ~20 seams competing
        for attention. Adjacent covers now read as one surface.

        The cells are desaturated because a card carries four knobs that only
        work as a set: veil, seam, poster saturation and accent. Raising the
        veil alone kills the card; desaturating alone leaves it grey. Muted
        artwork is what demotes the covers from content to texture and lets the
        accent be the only chromatic thing on the card — the point of the
        redesign, lost while five full-colour covers shouted over it.
      */}
      {layout === "empty" ? (
        <div
          className={`absolute inset-0 z-0 grid place-items-center bg-radial-[circle_at_50%_45%] ${accent.glow} to-transparent`}
        >
          <Icon name="ImageIcon" size={36} className="text-white/10" />
        </div>
      ) : (
        <div
          className={`absolute inset-0 z-0 grid gap-0 transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none ${MOSAIC_GRID_CLASS[layout]}`}
        >
          {Array.from({ length: MOSAIC_POSTER_COUNT[layout] }, (_, index) => {
            const posterUrl = list.poster_urls?.[index] ?? null;
            return (
              <div
                key={index}
                className="relative overflow-hidden bg-white/10"
                style={{ filter: "saturate(.6) brightness(.88)" }}
              >
                {posterUrl && (
                  <Image
                    src={posterUrl}
                    alt=""
                    fill
                    sizes={POSTER_SIZES}
                    className="object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Scrim — one layer buys AA contrast for the title, the other carries the
          list's colour. The veil used to fall to 45% by mid-card, which left the
          artwork still arguing with the list name; it now stays heavy enough that
          the title wins everywhere and the covers stay a backdrop. */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {/* The top stop went from /15 to /50: the accent used to peak exactly
            where the veil was thinnest, so the two fought over the same corner
            and the tint read loud even at a low alpha. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/50" />
        {/* The accent originates at the TOP-LEFT (`to-br`), not the top-right.
            Two reasons. The card's content — name, count, status bar — lives
            bottom-left, so a top-right accent sat diagonally opposite the only
            place the eye goes, reading as a stray glow rather than as this
            list's colour. And the delete button occupies the top-right, so the
            colour was pooling behind a control instead of behind content. */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${accent.tint} to-transparent`}
        />
      </div>

      {/* Body */}
      <div className="absolute inset-0 z-[3] flex flex-col justify-end gap-2 p-4 pointer-events-none">
        <h3 className="text-lg font-bold leading-snug text-white line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {list.name}
        </h3>
        <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-white/75">
          <Icon name="List" size={12} />
          {list.anime_count} {list.anime_count === 1 ? "anime" : "animes"}
        </span>

        {/*
          Segments are sized against the list's total, not against the tracked
          subset, so animes with no status leave the rail showing through
          instead of inflating the others. Same rule the collection detail uses,
          which is what lets both surfaces agree on the same list.
        */}
        {list.status_breakdown.length > 0 && (
          <div className="flex h-[3px] w-full overflow-hidden rounded-full bg-white/15">
            {list.status_breakdown.map(({ status, count }) => (
              <div
                key={status}
                className={STATUS_BAR_COLORS[status]}
                style={{ width: `${(count / list.anime_count) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(list.id);
        }}
        // Without this, Enter on the button bubbles to the card's key handler and navigates away.
        onKeyDown={(e) => e.stopPropagation()}
        className="absolute top-2.5 right-2.5 z-[5] flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white/60 backdrop-blur-sm transition-[opacity,background-color,color] duration-200 motion-reduce:transition-none hover:bg-red-500/80 hover:text-white cursor-pointer [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Eliminar ${list.name}`}
      >
        <Icon name="X" size={12} />
      </button>
    </div>
  );
}
