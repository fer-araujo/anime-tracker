/** One already-broadcast episode of something the user is watching. */
export type EpisodeNotification = {
  animeId: number;
  episode: number;
  /** ISO-8601, when the episode went out. */
  airedAt: string;
  title: string;
  poster: string | null;
};
