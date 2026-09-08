import type { AniMedia } from "../../types/animeCore.js";
import { anilistIdFor, genresFor } from "../../utils/idMap.js";
import type { MalNode } from "../malSchedule.service.js";

/** MAL's `media_type` is lowercase and spells `tv_special`; AniList expects these. */
const FORMAT: Record<string, string> = {
  tv: "TV",
  tv_special: "TV_SHORT",
  movie: "MOVIE",
  ova: "OVA",
  ona: "ONA",
  special: "SPECIAL",
  music: "MUSIC",
};

const STATUS: Record<string, string> = {
  not_yet_aired: "NOT_YET_RELEASED",
  currently_airing: "RELEASING",
  finished_airing: "FINISHED",
};

/**
 * One MAL node as the formatter expects it.
 *
 * Returns null when the id cannot be translated. MAL ids and AniList ids rarely
 * agree, and this database stores AniList ids — a card whose id matches nothing
 * in the user's library is worse than an absent one, because its favourite
 * button would write against a row that does not exist.
 *
 * Richer than the Shikimori equivalent on purpose: MAL's list endpoints take an
 * arbitrary field set, so the synopsis, genres and studios arrive with the same
 * request instead of costing one detail call per title. That is what fills the
 * genres that degraded cards were rendering empty.
 */
export function malToAniMedia(node: MalNode): AniMedia | null {
  const anilistId = anilistIdFor(node.id);
  if (!anilistId) return null;

  const poster = node.main_picture?.large ?? node.main_picture?.medium ?? null;

  return {
    id: anilistId,
    title: {
      romaji: node.title,
      english: node.alternative_titles?.en || node.title,
      native: node.alternative_titles?.ja || undefined,
    },
    coverImage: { extraLarge: poster, large: poster },
    bannerImage: null,
    description: node.synopsis ?? null,
    format: FORMAT[node.media_type ?? ""] ?? null,
    status: STATUS[node.status ?? ""] ?? null,
    genres: node.genres?.length
      ? node.genres.map((g) => g.name)
      : genresFor(anilistId),
    episodes: node.num_episodes || null,
    // MAL scores 0–10 with one decimal; AniList uses 0–100 and everything
    // downstream divides by ten, so the scale has to match before it gets there.
    averageScore:
      typeof node.mean === "number" && node.mean > 0
        ? Math.round(node.mean * 10)
        : null,
    // Seconds per episode, where AniList reports whole minutes.
    duration: node.average_episode_duration
      ? Math.round(node.average_episode_duration / 60)
      : null,
    season: node.start_season?.season?.toUpperCase() ?? null,
    seasonYear: node.start_season?.year ?? null,
    startDate: parseStartDate(node.start_date),
    isAdult: false,
    studios: node.studios?.length
      ? {
          edges: node.studios.map((st) => ({
            isMain: true,
            node: { name: st.name },
          })),
        }
      : undefined,
  };
}

function parseStartDate(date: string | null | undefined) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  return { year: y || null, month: m || null, day: d || null };
}
