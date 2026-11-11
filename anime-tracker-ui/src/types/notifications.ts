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

/**
 * Whether the source has postponed a broadcast. Mirrors the API's type; an
 * API or a cached payload older than it has neither field, read as not delayed.
 */
export type BroadcastDelay = {
  delayed: boolean;
  /** ISO-8601 of the new date, or null when the source states none usable. */
  delayedUntil: string | null;
};

/** Episodes of something the user is watching: released, or due later today. */
export type EpisodeNotification = BroadcastDelay & {
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

/**
 * A notification as any API version, or any cached payload, may have sent it:
 * the fields added after the first version may be missing.
 * `normalizeNotification` fills them in.
 */
export type RawEpisodeNotification = Omit<
  EpisodeNotification,
  "range" | "upcoming" | "delayed" | "delayedUntil"
> &
  Partial<
    Pick<EpisodeNotification, "range" | "upcoming" | "delayed" | "delayedUntil">
  >;

/**
 * What the bell keeps between reloads. Every field is already a string or a
 * number — `airedAt` and `seenAt` are ISO strings, not Dates — so it survives
 * a JSON round-trip as is.
 */
export type CachedNotifications = {
  items: EpisodeNotification[];
  seenAt: string;
};
