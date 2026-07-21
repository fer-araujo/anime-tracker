"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { AnimeEntry } from "@/types/anime";

export function useBatchAnimeEntries(animeIds: number[]) {
  const { user } = useAuth();
  const [entriesMap, setEntriesMap] = useState<Map<number, AnimeEntry>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || animeIds.length === 0) {
      setEntriesMap(new Map());
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchBatch = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_anime")
        .select("*")
        .eq("user_id", user.id)
        .in("anime_id", animeIds);

      if (cancelled) return;

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
    };

    fetchBatch();

    return () => {
      cancelled = true;
    };
  }, [user, animeIds.join(",")]);

  return { entriesMap, loading };
}
