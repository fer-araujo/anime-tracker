/**
 * The episodes one release covers, inclusive.
 *
 * A weekly broadcast is `{ from: 5, to: 5 }`. A platform that drops a season
 * at once — Netflix's usual way, Crunchyroll's and Prime's often enough — is
 * `{ from: 1, to: 12, total: 12 }`, and is shown once instead of once per
 * episode. `total` is the series' episode count when the source states it, so
 * a whole-season drop can be told apart from a large partial one.
 */
export type EpisodeRange = {
  from: number;
  to: number;
  total: number | null;
};

/**
 * One release of one series on one CDMX day, the unit the bell and the airing
 * shelf both list. `collapseSameDayDrops` merges rows of this shape.
 */
export type SameDayDrop = {
  anilistId: number;
  /** Unix seconds of the release; the earliest one once rows are merged. */
  airingAt: number;
  /** Null when the source states a slot but no episode number (MAL). */
  range: EpisodeRange | null;
};

/** Episodes of something the user is watching: released, or due later today. */
export type EpisodeNotification = {
  animeId: number;
  /**
   * The last episode of the release, same as `range.to`. Kept because it
   * predates `range` and is what a client older than it reads.
   */
  episode: number;
  range: EpisodeRange;
  /**
   * ISO-8601. When the episode went out, or — while `upcoming` — when it is
   * scheduled to.
   */
  airedAt: string;
  /**
   * True for a broadcast later in the current CDMX day. Only today's are ever
   * sent: "tonight at 21:30" is useful, "next Thursday" is a calendar.
   */
  upcoming: boolean;
  title: string;
  poster: string | null;
};

export type NotificationsRequest = {
  /** AniList ids of everything the user is currently watching. */
  animeIds: number[];
  /** ISO-8601 instant the user last opened the bell. */
  since: string;
};
