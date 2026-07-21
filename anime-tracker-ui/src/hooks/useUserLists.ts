"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";

export type UserList = {
  id: string;
  name: string;
  color: string | null;
  anime_count: number;
  poster_anime_ids: number[];
  poster_urls: (string | null)[];
};

export function useUserLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const { data: raw, error } = await supabase
      .from("user_lists")
      .select("id, name, color, list_entries(anime_id)")
      .eq("user_id", user.id)
      .order("sort_order");

    if (error) {
      setLoading(false);
      return;
    }

    const mapped: UserList[] = (raw ?? []).map(
      (l: {
        id: string;
        name: string;
        color: string | null;
        list_entries: { anime_id: number }[];
      }) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        anime_count: l.list_entries?.length ?? 0,
        poster_anime_ids: (l.list_entries ?? [])
          .slice(0, 3)
          .map((e) => e.anime_id),
        poster_urls: [],
      }),
    );

    // Batch fetch poster images
    const allIds = [...new Set(mapped.flatMap((l) => l.poster_anime_ids))];
    if (allIds.length > 0) {
      try {
        const batchData = await fetchAnimeBatch(allIds);
        for (const list of mapped) {
          list.poster_urls = list.poster_anime_ids.map(
            (id) => batchData.get(id)?.poster ?? null,
          );
        }
      } catch {
        // Posters fail silently — cards show placeholders
      }
    }

    setLists(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { lists, loading, refetch: fetch };
}
