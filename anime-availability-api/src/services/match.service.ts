import Fuse from "fuse.js";
import type { AniListTitle } from "./anilist.service.js";
import type { TMDBSearchTVItem } from "./tmdb.service.js";

export function bestMatchFromTMDB(results: TMDBSearchTVItem[], titles: AniListTitle): TMDBSearchTVItem | null {
  if (!results?.length) return null;
  const candidates = results.map((r) => ({ ...r, _name: r.name ?? r.original_name ?? "" }));

  // ordena por popularidad de TMDb implícita (tal como vienen), luego aplica Fuse si hay varias
  if (candidates.length === 1) return candidates[0];

  const aliases = [titles.romaji, titles.english, titles.native]
    .filter(Boolean)
    .map((s) => String(s));

  const fuse = new Fuse(candidates, {
    includeScore: true,
    threshold: 0.4,
    keys: ["_name"]
  });

  const query = aliases.join(" | ");
  const res = fuse.search(query);
  return res[0]?.item ?? candidates[0];
}
