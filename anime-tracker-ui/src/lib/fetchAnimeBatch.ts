import { API_BASE, apiPath } from "./api";
import type { Anime } from "@/types/anime";

/**
 * Fetches anime details for a list of IDs from the API.
 * Uses parallel individual requests since there's no batch endpoint.
 */
export async function fetchAnimeBatch(
  ids: number[],
): Promise<Map<number, { title: string; poster: string | null }>> {
  const results = new Map<
    number,
    { title: string; poster: string | null }
  >();

  if (ids.length === 0) return results;

  const uniqueIds = [...new Set(ids)];

  // Fetch in batches of 5 to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      try {
        const res = await fetch(`${API_BASE}/anime/${id}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { data: Anime };
        return {
          id,
          title: json.data.title,
          poster: json.data.images?.poster ?? null,
        };
      } catch {
        return null;
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        results.set(result.value.id, {
          title: result.value.title,
          poster: result.value.poster,
        });
      }
    }
  }

  return results;
}
