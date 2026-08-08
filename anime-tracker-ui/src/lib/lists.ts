import type { ListAccent, ListAccentKey, MosaicLayout } from "@/types/lists";

/**
 * The accent the user picked at creation time, expressed as Tailwind classes.
 *
 * `user_lists.color` already stores this choice and `UserList.color` already
 * carries it to the card — it was simply being ignored in favour of
 * `name.length % 6`, which meant renaming a list silently changed its colour.
 */
const LIST_ACCENTS: Record<ListAccentKey, ListAccent> = {
  blue: {
    line: "bg-sky-500",
    tint: "from-sky-500/30",
    glow: "from-sky-500/25",
    ring: "[@media(hover:hover)]:hover:border-sky-400/40 focus-visible:border-sky-400/40",
  },
  purple: {
    line: "bg-purple-500",
    tint: "from-purple-500/30",
    glow: "from-purple-500/25",
    ring: "[@media(hover:hover)]:hover:border-purple-400/40 focus-visible:border-purple-400/40",
  },
  emerald: {
    line: "bg-emerald-500",
    tint: "from-emerald-500/30",
    glow: "from-emerald-500/25",
    ring: "[@media(hover:hover)]:hover:border-emerald-400/40 focus-visible:border-emerald-400/40",
  },
  amber: {
    line: "bg-amber-500",
    tint: "from-amber-500/30",
    glow: "from-amber-500/25",
    ring: "[@media(hover:hover)]:hover:border-amber-400/40 focus-visible:border-amber-400/40",
  },
  pink: {
    line: "bg-pink-500",
    tint: "from-pink-500/30",
    glow: "from-pink-500/25",
    ring: "[@media(hover:hover)]:hover:border-pink-400/40 focus-visible:border-pink-400/40",
  },
};

/** Lists created before the colour picker existed have `color === null`. */
const DEFAULT_ACCENT: ListAccentKey = "blue";

export function resolveListAccent(color: string | null | undefined): ListAccent {
  if (color && color in LIST_ACCENTS) {
    return LIST_ACCENTS[color as ListAccentKey];
  }
  return LIST_ACCENTS[DEFAULT_ACCENT];
}

/**
 * Pick the mosaic composition from the posters that actually exist.
 * A list of two animes should not pretend to have four by padding the grid
 * with empty cells.
 */
export function resolveMosaicLayout(posterCount: number): MosaicLayout {
  if (posterCount <= 0) return "empty";
  if (posterCount === 1) return "one";
  if (posterCount === 2) return "two";
  if (posterCount === 3) return "three";
  return "four";
}

/**
 * Grid template per composition. `three` gives the first poster a taller,
 * slightly wider cell so the odd count reads as deliberate rather than short.
 */
export const MOSAIC_GRID_CLASS: Record<Exclude<MosaicLayout, "empty">, string> = {
  one: "grid-cols-1",
  two: "grid-cols-2",
  three: "grid-cols-[1.15fr_1fr] grid-rows-2 [&>*:first-child]:row-span-2",
  four: "grid-cols-2 grid-rows-2",
};

/** How many posters each composition renders. */
export const MOSAIC_POSTER_COUNT: Record<Exclude<MosaicLayout, "empty">, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
};

/**
 * The favorites banner is wide, so its posters run in a horizontal rail rather
 * than a block. Fewer favorites means wider columns, which keeps the covers
 * readable instead of leaving a gap at the right edge.
 */
export function resolveRailColumnWidth(posterCount: number): string {
  if (posterCount <= 1) return "6.5rem";
  if (posterCount <= 3) return "5.5rem";
  return "7.5rem";
}
