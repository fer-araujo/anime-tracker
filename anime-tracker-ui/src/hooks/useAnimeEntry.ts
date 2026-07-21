"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { AnimeEntry, TrackingStatus } from "@/types/anime";
import {
  addToTracking as addAction,
  updateStatus as updateAction,
  toggleFavorite as favAction,
  setScore as scoreAction,
  removeFromTracking as removeAction,
} from "@/actions/tracking";

export function useAnimeEntry(animeId: number | null) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<AnimeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntry = useCallback(async () => {
    if (!animeId || !user) {
      setEntry(null);
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
        .eq("anime_id", animeId)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setEntry(data as AnimeEntry | null);
    } catch {
      setError("Failed to fetch tracking entry");
    } finally {
      setLoading(false);
    }
  }, [animeId, user]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const addToList = useCallback(
    async (status: TrackingStatus) => {
      if (!animeId) return { success: false, error: "No anime ID" } as const;
      const result = await addAction(animeId, status);
      if (result.success) {
        await fetchEntry();
      }
      return result;
    },
    [animeId, fetchEntry],
  );

  const updateEntryStatus = useCallback(
    async (status: TrackingStatus) => {
      if (!animeId) return { success: false, error: "No anime ID" } as const;
      const result = await updateAction(animeId, status);
      if (result.success) {
        await fetchEntry();
      }
      return result;
    },
    [animeId, fetchEntry],
  );

  const toggleFavorite = useCallback(
    async (next: boolean) => {
      if (!animeId) return { success: false, error: "No anime ID" } as const;
      const result = await favAction(animeId, next);
      if (result.success) {
        await fetchEntry();
      }
      return result;
    },
    [animeId, fetchEntry],
  );

  const setScoreWrapper = useCallback(
    async (score: number | null) => {
      if (!animeId) return { success: false, error: "No anime ID" } as const;
      const result = await scoreAction(animeId, score);
      if (result.success) {
        await fetchEntry();
      }
      return result;
    },
    [animeId, fetchEntry],
  );

  const remove = useCallback(async () => {
    if (!animeId) return { success: false, error: "No anime ID" } as const;
    const result = await removeAction(animeId);
    if (result.success) {
      setEntry(null);
    }
    return result;
  }, [animeId]);

  return {
    entry,
    loading,
    error,
    addToList,
    updateStatus: updateEntryStatus,
    toggleFavorite,
    setScore: setScoreWrapper,
    remove,
  };
}
