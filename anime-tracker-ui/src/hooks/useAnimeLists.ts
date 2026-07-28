"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export function useAnimeLists(animeId: number | null, refreshKey?: number) {
  const { user } = useAuth();
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!animeId || !user) {
      setLists([]);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    supabase
      .from("list_entries")
      .select("list_id, user_lists!inner(name)")
      .eq("anime_id", animeId)
      .then(({ data, error }) => {
        if (!error && data) {
          setLists(
            data.map((item: unknown) => {
              const row = item as {
                list_id: string;
                user_lists: { name: string } | null;
              };
              return {
                id: row.list_id,
                name: row.user_lists?.name ?? "",
              };
            }),
          );
        }
        setLoading(false);
      });
  }, [animeId, user, refreshKey]);

  return { lists, loading };
}
