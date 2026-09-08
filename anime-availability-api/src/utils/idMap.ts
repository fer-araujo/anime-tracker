import map from "../data/anilist-mal-map.json" with { type: "json" };

/**
 * AniList id ↔ MAL id.
 *
 * Every fallback source numbers anime the way MAL does — Shikimori mirrors MAL
 * ids outright — while this database stores AniList ids in `user_anime` and
 * `list_entries`. Without translation a fallback returns titles the user's own
 * library cannot recognise, and it fails silently: favourites stop matching,
 * lists render empty, and nothing errors.
 *
 * The ids rarely agree. One Piece happens to be 21 on both, which makes the
 * problem easy to miss; Frieren is 154587 on AniList and 52991 on MAL.
 *
 * The table is generated from anime-offline-database by
 * `scripts/build-id-map.mjs` and committed, because the source is 59 MB and
 * Render's free tier has 512 MB of RAM. It covers 18,858 of the 20,687 entries
 * that carry an AniList id — 91%. The rest exist on AniList but not on MAL, so
 * no fallback can serve them at all.
 */
const anilistToMal = map as Record<string, number>;

let malToAnilist: Map<number, number> | null = null;

export function malIdFor(anilistId: number): number | null {
  return anilistToMal[String(anilistId)] ?? null;
}

export function anilistIdFor(malId: number): number | null {
  // Built on first use: the reverse direction is only needed by fallback code
  // paths, and most requests never touch one.
  if (!malToAnilist) {
    malToAnilist = new Map();
    for (const [anilist, mal] of Object.entries(anilistToMal)) {
      malToAnilist.set(mal, Number(anilist));
    }
  }
  return malToAnilist.get(malId) ?? null;
}

/** How many pairs the table holds, for logging and tests. */
export const ID_MAP_SIZE = Object.keys(anilistToMal).length;
