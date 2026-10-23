"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { AnimeEntry } from "@/types/anime";

export function useBatchAnimeEntries(animeIds: number[]) {
  const { user } = useAuth();
  const [entriesMap, setEntriesMap] = useState<Map<number, AnimeEntry>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  // Only the newest read may land. A write now triggers a refetch, so two
  // quick favourite clicks put two reads in flight, and the older one
  // resolving last would put back the state the second click replaced. A
  // sequence number rather than a cancel flag: under StrictMode the effect's
  // second run is the newest, so it is the one applied, and nothing is ever
  // left waiting on a read that was thrown away.
  const latest = useRef(0);

  const fetchBatch = useCallback(async () => {
    const request = ++latest.current;

    if (!user || animeIds.length === 0) {
      setEntriesMap(new Map());
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_anime")
      .select("*")
      .eq("user_id", user.id)
      .in("anime_id", animeIds);

    if (request !== latest.current) return;

    if (error) {
      console.error("Batch anime entries fetch error:", error.message);
      setEntriesMap(new Map());
    } else {
      const map = new Map<number, AnimeEntry>();
      (data ?? []).forEach((entry: AnimeEntry) => {
        map.set(entry.anime_id, entry);
      });
      setEntriesMap(map);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, animeIds.join(",")]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  /**
   * Apply a change to one entry before the server confirms it; `null` drops
   * the entry. The caller refetches afterwards, which is what reconciles a
   * write that failed.
   *
   * Only an existing row is patched. A row the user has never had would need
   * an id and timestamps invented for it — the refetch brings the real one.
   */
  const patchEntry = useCallback(
    (animeId: number, patch: Partial<AnimeEntry> | null) => {
      setEntriesMap((prev) => {
        const current = prev.get(animeId);
        if (!current) return prev;
        const next = new Map(prev);
        if (patch === null) next.delete(animeId);
        else next.set(animeId, { ...current, ...patch });
        return next;
      });
    },
    [],
  );

  return { entriesMap, loading, refetch: fetchBatch, patchEntry };
}
