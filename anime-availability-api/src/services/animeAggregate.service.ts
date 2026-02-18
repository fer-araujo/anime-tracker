import { searchAnimeFromAnilist } from "./anilistCore.service.js";
import { enrichAnimeCore } from "./enrich/enrichCore.service.js";

/**
 * Agregador central.
 * Hoy:
 *   - Solo AniList / MAL / Kitsu / Shikimori / Nekos
 */

export async function searchAnimeUnified(query: string, opts?: { perPage?: number }) {
  const perPage = opts?.perPage ?? 12;
  const anilist = await searchAnimeFromAnilist(query, { perPage });

  // ✅ aquí decides si enriqueces siempre o solo top N
  const enriched = await Promise.all(anilist.map((c) => enrichAnimeCore(c, "MX")));
  return enriched;
}
