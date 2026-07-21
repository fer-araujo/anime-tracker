import { API_BASE } from "./api";
import type { Anime } from "@/types/anime";

/**
 * Fetches anime details for a list of IDs using the batch endpoint.
 * Single HTTP request for up to 50 IDs.
 */
export async function fetchAnimeBatch(
  ids: number[],
): Promise<Map<number, { title: string; poster: string | null; backdrop: string | null; anime: Anime | null }>> {
  const results = new Map<number, { title: string; poster: string | null; backdrop: string | null; anime: Anime | null }>();

  if (ids.length === 0) return results;

  const uniqueIds = [...new Set(ids)];

  try {
    const res = await fetch(`${API_BASE}/anime/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: uniqueIds }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return results;

    const json = await res.json();
    const data = json.data as Record<string, Anime>;

    for (const id of uniqueIds) {
      const anime = data?.[String(id)] ?? null;
      results.set(id, {
        title: anime?.title ?? `Anime #${id}`,
        poster: anime?.images?.poster ?? null,
        backdrop: anime?.images?.backdrop ?? null,
        anime,
      });
    }
  } catch {
    // Fail silently — caller handles missing data
  }

  return results;
}
