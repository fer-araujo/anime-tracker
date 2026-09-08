import { logger } from "../utils/logger.js";

const MAL_BASE = "https://api.myanimelist.net/v2";

/**
 * Everything a degraded card needs, in one request.
 *
 * MAL's list endpoints accept an arbitrary field set, so unlike Shikimori's
 * thin list record this arrives with the synopsis, genres and studios already
 * attached — no per-anime detail call to fill them in.
 */
const FIELDS = [
  "id",
  "title",
  "alternative_titles",
  "main_picture",
  "synopsis",
  "mean",
  "num_episodes",
  "media_type",
  "status",
  "start_season",
  "start_date",
  "broadcast",
  "genres",
  "studios",
  "average_episode_duration",
].join(",");

export type MalNode = {
  id: number;
  title: string;
  alternative_titles?: { en?: string | null; ja?: string | null } | null;
  main_picture?: { medium?: string | null; large?: string | null } | null;
  synopsis?: string | null;
  mean?: number | null;
  num_episodes?: number | null;
  media_type?: string | null;
  status?: string | null;
  start_season?: { year?: number | null; season?: string | null } | null;
  start_date?: string | null;
  /** `day_of_the_week` is lowercase English; `start_time` is `HH:MM` in JST. */
  broadcast?: { day_of_the_week?: string | null; start_time?: string | null } | null;
  genres?: { id: number; name: string }[] | null;
  studios?: { id: number; name: string }[] | null;
  average_episode_duration?: number | null;
};

/**
 * MAL's official API, as a second opinion to Shikimori.
 *
 * The credential has been configured in Render since before the outage and
 * nothing read it. That is what made the fallback single-source: Shikimori's
 * `/api/calendar` lists 93 of the 253 series it itself calls ongoing, so a
 * whole day's schedule was being answered from a third of the catalogue.
 *
 * Measured against Shikimori on 2026-09-08, the two agree on the broadcast day
 * for all 77 titles both carry — so this genuinely adds coverage rather than
 * contradicting what we already had.
 */
async function malFetch(path: string): Promise<MalNode[]> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) return [];

  const collected: MalNode[] = [];
  let url: string | undefined = `${MAL_BASE}${path}&fields=${FIELDS}`;

  // Two pages at 500 covers the ~380 currently-airing entries with room to
  // spare; the bound is here so a malformed `paging.next` cannot loop.
  for (let page = 0; page < 2 && url; page++) {
    try {
      const res: Response = await fetch(url, {
        headers: { "X-MAL-CLIENT-ID": clientId },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        logger.warn(`[mal] ${path} HTTP ${res.status}`);
        break;
      }
      const json = (await res.json()) as {
        data?: { node: MalNode }[];
        paging?: { next?: string };
      };
      collected.push(...(json.data ?? []).map((d) => d.node));
      url = json.paging?.next;
    } catch (err) {
      logger.warn({ err }, `[mal] ${path} fetch failed`);
      break;
    }
  }

  return collected;
}

/**
 * Every anime MAL currently lists as airing, ranked by score.
 *
 * The ranking endpoint rather than the seasonal one because long-runners belong
 * to the season they premiered in: One Piece is Fall 1999 and Detective Conan
 * is Winter 1996, so a seasonal query for the current quarter silently omits
 * exactly the titles a viewer is most likely to be following.
 */
export function malFetchAiring(): Promise<MalNode[]> {
  return malFetch("/anime/ranking?ranking_type=airing&limit=500");
}

/** One season, for the shelves that ask for a season rather than a day. */
export function malFetchSeason(year: number, season: string): Promise<MalNode[]> {
  return malFetch(
    `/anime/season/${year}/${season.toLowerCase()}?limit=500&sort=anime_num_list_users`,
  );
}
