import type { AniMedia, RelatedMediaRef } from "../types/animeCore.js";

/**
 * Pull the one relation a card actually shows: what this entry continues.
 *
 * The direction is the easy thing to get backwards. If B is a sequel of A, it
 * is *B* that carries an edge of type `PREQUEL` pointing at A — so the line
 * "Sequel to A" is rendered from the PREQUEL edge, not the SEQUEL one. Reading
 * the SEQUEL edge instead would name the show that comes *after* this one,
 * which is both wrong and, for an unreleased sequel, usually absent.
 *
 * `PARENT` is the fallback: spin-offs and side stories have no prequel but do
 * point at the series they belong to, and naming that series is more useful
 * than naming nothing.
 *
 * Only ANIME nodes count. AniList links the source manga through these same
 * edges, and "Sequel to <the manga>" is nonsense — the manga is what `source`
 * is for.
 */
export function extractContinuationOf(
  relations: AniMedia["relations"],
): RelatedMediaRef | null {
  const edges = relations?.edges;
  if (!edges || edges.length === 0) return null;

  for (const relationType of ["PREQUEL", "PARENT"] as const) {
    const match = edges.find(
      (e) => e?.relationType === relationType && e.node?.type === "ANIME",
    );
    const node = match?.node;
    if (!node?.id) continue;

    const title =
      node.title?.english ?? node.title?.romaji ?? node.title?.native ?? null;
    if (!title) continue;

    return { id: node.id, title };
  }

  return null;
}
