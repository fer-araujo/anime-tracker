import type { AniMedia } from "./animeCore.js";
import type { EpisodeRange } from "./notifications.js";
import type { FormattedAnime } from "../utils/formatAnimeList.js";

/**
 * One broadcast as the airing shelf receives it, whichever source answered.
 * AniList's `airingSchedules` items have exactly this shape minus `range`.
 */
export type AiringSchedule = {
  media: AniMedia;
  /** Unix seconds. */
  airingAt?: number | null;
  episode?: number | null;
  /**
   * Set by a source that states a multi-episode release outright
   * (AnimeSchedule); otherwise derived from `episode`.
   */
  range?: EpisodeRange | null;
};

/** The broadcast a shelf row is about. */
export type AiringInfo = {
  /** The last episode released, same as `range.to`; predates `range`. */
  episode: number | null;
  /** Null when the source names a slot but not an episode (MAL). */
  range: EpisodeRange | null;
  /** ISO-8601; the earliest broadcast when several were merged. */
  airingAt: string;
};

/** A formatted anime plus the specific broadcast this row is about. */
export type AiringEntry = FormattedAnime & { airing: AiringInfo };

export type DayGroup = {
  day: string;
  date: string;
  items: AiringEntry[];
};
