import { API_BASE } from "./api";
import type { Anime } from "@/types/anime";

/**
 * The batch endpoint's own ceiling (`ids.max(50)` in its route schema).
 *
 * Callers used to send every id they had in one request, and anything past fifty
 * came back as a 400 that this function turned into an empty map — which
 * collections rendered as "Error al cargar animes" for any list that simply grew
 * large. Splitting here covers every caller at once rather than asking each to
 * remember the limit.
 */
const BATCH_LIMIT = 50;

type BatchEntry = {
  title: string;
  poster: string | null;
  backdrop: string | null;
  anime: Anime | null;
};

/**
 * Anime details for a list of ids, in as few requests as the endpoint allows.
 *
 * Chunks run in parallel, and one failing chunk does not sink the others: its
 * ids are simply absent from the map, which every caller already treats as
 * "not loaded".
 */
export async function fetchAnimeBatch(
  ids: number[],
): Promise<Map<number, BatchEntry>> {
  const results = new Map<number, BatchEntry>();
  if (ids.length === 0) return results;

  const uniqueIds = [...new Set(ids)];
  const chunks: number[][] = [];
  for (let i = 0; i < uniqueIds.length; i += BATCH_LIMIT) {
    chunks.push(uniqueIds.slice(i, i + BATCH_LIMIT));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(`${API_BASE}/anime/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return;

        const json = await res.json();
        const data = json.data as Record<string, Anime>;

        for (const id of chunk) {
          const anime = data?.[String(id)] ?? null;
          results.set(id, {
            title: anime?.title ?? `Anime #${id}`,
            poster: anime?.images?.poster ?? null,
            backdrop: anime?.images?.backdrop ?? null,
            anime,
          });
        }
      } catch (err) {
        console.error("[fetchAnimeBatch] API error:", err);
      }
    }),
  );

  return results;
}
