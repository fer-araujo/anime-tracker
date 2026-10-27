/**
 * The episodes one release covers, inclusive. Mirrors the API's type.
 *
 * A weekly broadcast is `{ from: 5, to: 5 }`; a season dropped at once is
 * `{ from: 1, to: 12, total: 12 }` and is listed once, not twelve times.
 */
export type EpisodeRange = {
  from: number;
  to: number;
  total: number | null;
};

/** Episodes of something the user is watching: released, or due later today. */
export type EpisodeNotification = {
  animeId: number;
  /** The last episode of the release, same as `range.to`. */
  episode: number;
  range: EpisodeRange;
  /** ISO-8601. When it went out, or — while `upcoming` — when it is due. */
  airedAt: string;
  /**
   * True when the API answered before the broadcast. It goes stale the moment
   * the broadcast happens, so read it through `isPending`, never directly.
   */
  upcoming: boolean;
  title: string;
  poster: string | null;
};
