import type { TrackingStatus } from "@/types/anime";
import type {
  ListAccent,
  ListAccentKey,
  ListStatusSlice,
  MosaicLayout,
} from "@/types/lists";

/**
 * The accent the user picked at creation time, expressed as Tailwind classes.
 *
 * `user_lists.color` already stores this choice and `UserList.color` already
 * carries it to the card — it was simply being ignored in favour of
 * `name.length % 6`, which meant renaming a list silently changed its colour.
 *
 * `tint` sits on top of the posters and its job is to say which list this is,
 * not to repaint the artwork; the dark bottom-up gradient underneath it is what
 * guarantees the title's contrast. `glow` stays stronger because in the empty
 * state there is no poster for the colour to sit against.
 *
 * The card's knobs — veil, seam, poster saturation and accent — only work as a
 * set. Raising the veil alone kills the card; desaturating the posters alone
 * leaves it grey. Desaturated artwork is precisely what lets the list's own
 * colour come back up without turning strident, and that colour being the ONLY
 * chromatic thing on the card is the whole point of the redesign — a point lost
 * the moment five full-colour covers competed with it.
 */
const LIST_ACCENTS: Record<ListAccentKey, ListAccent> = {
  blue: {
    tint: "from-sky-500/8",
    glow: "from-sky-500/25",
    ring: "[@media(hover:hover)]:hover:border-sky-400/40 focus-visible:border-sky-400/40",
  },
  purple: {
    tint: "from-purple-500/8",
    glow: "from-purple-500/25",
    ring: "[@media(hover:hover)]:hover:border-purple-400/40 focus-visible:border-purple-400/40",
  },
  emerald: {
    tint: "from-emerald-500/12",
    glow: "from-emerald-500/25",
    ring: "[@media(hover:hover)]:hover:border-emerald-400/40 focus-visible:border-emerald-400/40",
  },
  amber: {
    tint: "from-amber-500/8",
    glow: "from-amber-500/25",
    ring: "[@media(hover:hover)]:hover:border-amber-400/40 focus-visible:border-amber-400/40",
  },
  pink: {
    tint: "from-pink-500/8",
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
 * How much of the favorites banner the poster rail occupies.
 *
 * This used to be a fixed rem width per poster, which ignored the container: on
 * a 1280px banner four columns of 7.5rem filled barely a third and left the
 * rest as an empty black field, so the banner read as two unrelated halves.
 * A percentage lets the rail scale with whatever width it is given, and the
 * columns inside it share that space evenly.
 */
export function resolveRailWidth(posterCount: number): string {
  if (posterCount <= 0) return "0%";
  if (posterCount === 1) return "38%";
  if (posterCount <= 3) return "56%";
  return "66%";
}

/* -------------------------------------------------------------------------- */
/*  Status bar — shared between the list card and the collection detail        */
/* -------------------------------------------------------------------------- */

/**
 * Colours per tracking status. These were a local constant inside
 * CollectionDetail; the card needs the same vocabulary, and two copies of a
 * colour mapping drift the moment one of them is edited.
 */
export const STATUS_BAR_COLORS: Record<TrackingStatus, string> = {
  watching: "bg-sky-500",
  completed: "bg-emerald-500",
  plan_to_watch: "bg-white/40",
  on_hold: "bg-amber-500",
  dropped: "bg-red-500",
};

/** Reading order of the bar: in progress, finished, then the parked states. */
export const STATUS_BAR_ORDER: TrackingStatus[] = [
  "watching",
  "completed",
  "plan_to_watch",
  "on_hold",
  "dropped",
];

/**
 * Count how many of `animeIds` sit in each tracking status.
 *
 * Pure and React-free so the provider can call it while building its state and
 * the collection detail can call it from a `useMemo` — same numbers on both
 * surfaces, which is the point.
 *
 * Animes with no entry in `statusByAnimeId` are simply not counted. Callers
 * size the bar against the list's total, so those show up as untouched track
 * rather than inflating the other segments.
 */
export function buildStatusBreakdown(
  statusByAnimeId: Map<number, TrackingStatus>,
  animeIds: number[],
): ListStatusSlice[] {
  const counts = new Map<TrackingStatus, number>();

  for (const id of animeIds) {
    const status = statusByAnimeId.get(id);
    if (status) counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return STATUS_BAR_ORDER.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  })).filter((slice) => slice.count > 0);
}
