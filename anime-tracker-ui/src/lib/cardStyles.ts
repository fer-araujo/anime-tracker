// Shared class strings for image cards. Tailwind v4 scans .ts files, so every class here
// must stay written whole: a name assembled from fragments is never generated.

/** One radius, border and base fill so every card reads as the same object. */
export const CARD_SURFACE = "rounded-md border border-white/10 bg-neutral-950";

/** Lift on hover only where a pointer exists; touch screens would leave it stuck on. */
export const CARD_HOVER_SHADOW =
  "transition-shadow duration-300 ease-out md:hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.5)]";

/** The offset keeps the ring visible against the dark art the card itself paints. */
export const CARD_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

/**
 * Hover zoom for card art, skipped for users who ask for reduced motion.
 * Requires an ancestor with `group/card`; without one the zoom never triggers.
 */
export const IMAGE_HOVER_ZOOM =
  "motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/card:scale-[1.04]";

/** Darkens only the lower part of the art so overlaid titles stay legible on bright posters. */
export const SCRIM_BOTTOM =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.90)_20%,rgba(0,0,0,0.55)_60%,rgba(0,0,0,0)_100%)]";

/**
 * Small label laid over art; the blur keeps it readable whatever the poster shows behind it.
 * Fixed height with centred, leading-none text rather than vertical padding: padding is
 * added to the font's line box, whose extra room sits under the baseline, so the label
 * rode low inside the chip. h-6 leaves room above and below text-xs; h-5 was too tight
 * and read cramped.
 * Carries no text colour: chips whose colour means something add their own, and cn() cannot
 * resolve two text colours on one element.
 */
export const CHIP_ON_IMAGE_BASE =
  "inline-flex h-6 items-center rounded bg-black/60 px-2.5 text-xs font-semibold leading-none backdrop-blur-sm";

export const CHIP_ON_IMAGE = `${CHIP_ON_IMAGE_BASE} text-white`;

/**
 * The same chip for a flat, already-dark surface such as a list row. There a black fill reads
 * as a hole rather than a label, and the blur has nothing behind it to soften.
 */
export const CHIP_ON_SURFACE_BASE =
  "inline-flex h-6 items-center rounded border border-white/10 bg-white/5 px-2.5 text-xs font-semibold leading-none";

/** One thickness for the tracking-status line so cards on different pages agree. */
export const STATUS_LINE = "h-0.5";
