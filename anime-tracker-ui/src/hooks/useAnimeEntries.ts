"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { AnimeEntry } from "@/types/anime";

type AnimeItem = AnimeEntry;

export function useAnimeEntries() {
  const { user } = useAuth();
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("user_anime")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setItems((data ?? []) as AnimeItem[]);
    } catch {
      setError("Failed to fetch tracking entries");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, loading, error, refetch: fetchAll };
}
