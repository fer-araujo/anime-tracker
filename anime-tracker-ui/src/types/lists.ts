/**
 * Shared shapes for the lists surface. Kept out of the components so the card,
 * the banner and the page shell all agree on the same vocabulary.
 */

/** The five colours CreateListDialog offers and `user_lists.color` stores. */
export type ListAccentKey = "blue" | "purple" | "emerald" | "amber" | "pink";

/**
 * Tailwind class fragments for one accent. They are whole static strings on
 * purpose — Tailwind cannot see a class built by concatenation at runtime, so
 * `bg-${color}-500` would be purged from the bundle and render as nothing.
 */
export type ListAccent = {
  /** Hairline at the top edge of the card. */
  line: string;
  /** Tint mixed into the readability scrim, so one element carries identity and contrast. */
  tint: string;
  /** Radial wash for the empty state, where there are no posters to tint. */
  glow: string;
  /** Border colour on hover/focus. */
  ring: string;
};

/** Which mosaic composition a card uses, derived from how many posters exist. */
export type MosaicLayout = "empty" | "one" | "two" | "three" | "four";
