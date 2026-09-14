/** One episode of something the user is watching, already broadcast. */
export type EpisodeNotification = {
  animeId: number;
  episode: number;
  /** ISO-8601. When the episode actually went out, not when it was noticed. */
  airedAt: string;
  title: string;
  poster: string | null;
};

export type NotificationsRequest = {
  /** AniList ids of everything the user is currently watching. */
  animeIds: number[];
  /** ISO-8601 instant the user last opened the bell. */
  since: string;
};
