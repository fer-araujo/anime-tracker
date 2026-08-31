/**
 * How a surface renders a collection of anime.
 *
 * Not season-specific despite where it started. Grid or list is the standard
 * for every screen that shows several anime at once — season, recommendations,
 * collections — and keeping the type here is what stops the third surface from
 * inheriting a copy of the second one's.
 *
 * `grid` is always the default: it is what every surface did before the toggle
 * existed, so an unknown or absent value must land there.
 *
 * `list` exists for phones. The poster card keeps studio, episodes, genres and
 * providers inside a block that is `hidden md:flex` behind `md:group-hover`, so
 * on a touch screen the grid shows a cover and a title and nothing else. A row
 * has no hover to depend on.
 */
export type ViewMode = "grid" | "list";
