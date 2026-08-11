import type { Anime } from "@/types/anime";

/**
 * Shared shapes for the season surface, kept out of the component so the page,
 * the filter chips and the tests all agree on one vocabulary.
 */

/**
 * The buckets the format chips offer.
 *
 * These are not AniList formats one-to-one, and that is deliberate: a viewer
 * choosing what to start is deciding how much time to commit, not filing a
 * taxonomy. A 24-episode series, a 90-minute film and a one-shot special are
 * three different commitments; OVA, ONA and SPECIAL are the same one.
 *
 * `leftovers` is the odd one out — it is not a format at all but a separate
 * list the API returns, so it can never be derived from an anime's own fields.
 */
export type SeasonFormatKey = "all" | "tv" | "movie" | "ova" | "leftovers";

/** One chip: what to call it, and how many titles sit behind it. */
export type SeasonFormatCount = {
  key: SeasonFormatKey;
  label: string;
  count: number;
};

/**
 * How the season renders its results.
 *
 * `grid` is what the page has always done and stays the default. `list` exists
 * for phones: the card's information block is `hidden md:flex` behind a hover
 * overlay, so on a touch screen a poster grid shows a cover and a title and
 * nothing else — a row can show studio, episodes, score and providers with no
 * hover to depend on.
 */
export type SeasonViewMode = "grid" | "list";

/** Both halves of a season response, so callers pass one object around. */
export type SeasonCatalogue = {
  seasonal: Anime[];
  leftovers: Anime[];
};
