"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import { buildStatusBreakdown } from "@/lib/lists";
import type { ListStatusSlice } from "@/types/lists";
import type { TrackingStatus } from "@/types/anime";

export type UserList = {
  id: string;
  name: string;
  color: string | null;
  anime_count: number;
  anime_ids: number[];
  poster_anime_ids: number[];
  poster_urls: (string | null)[];
  /** How the list's animes split across tracking statuses; drives the card's bar. */
  status_breakdown: ListStatusSlice[];
};

export type UserListsContextValue = {
  lists: UserList[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const UserListsContext = createContext<UserListsContextValue | null>(null);

/**
 * Owns the user's lists for the whole app.
 *
 * This used to live directly inside `useUserLists`, which meant every consumer
 * ran its own copy: the homepage renders four TrackingShelves, so a single page
 * load fired four identical Supabase queries and four identical POSTs to
 * /anime/batch — the same work, four times, for one answer. The fix is
 * ownership, not memoization: one instance, shared.
 *
 * The second thing this buys is coherence. Previously each consumer held a
 * private copy of the list state, so adding an anime in one component left
 * every other component showing stale counts until its own refetch happened to
 * run. Now `refetch` updates the single source everyone reads.
 */
export function UserListsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setLists([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: raw, error: fetchError } = await supabase
      .from("user_lists")
      .select("id, name, color, list_entries(anime_id)")
      .eq("user_id", user.id)
      .order("sort_order");

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    // One query for the whole page, not one per list: `user_anime` holds every
    // anime this user tracks, so a single fetch plus a local lookup covers all
    // the lists at once. The tracking status lives here and nowhere in
    // `user_lists`, which is why /lists could not draw a status bar before.
    // A failure here is not fatal — the cards simply render without their bar.
    const { data: trackedRows } = await supabase
      .from("user_anime")
      .select("anime_id, status")
      .eq("user_id", user.id);

    const statusByAnimeId = new Map<number, TrackingStatus>();
    for (const row of (trackedRows ?? []) as {
      anime_id: number;
      status: TrackingStatus | null;
    }[]) {
      if (row.status) statusByAnimeId.set(row.anime_id, row.status);
    }

    const mapped: UserList[] = (raw ?? []).map(
      (l: {
        id: string;
        name: string;
        color: string | null;
        list_entries: { anime_id: number }[];
      }) => {
        const allAnimeIds = (l.list_entries ?? []).map((e) => e.anime_id);
        return {
          id: l.id,
          name: l.name,
          color: l.color,
          anime_count: allAnimeIds.length,
          anime_ids: allAnimeIds,
          // Four, not three: the card's mosaic composes 1/2/3/4 posters and a
          // three-poster ceiling made its densest layout unreachable. This is
          // how many covers a card displays, not how much data the app uses —
          // the ids come from a query that already loaded every entry.
          poster_anime_ids: allAnimeIds.slice(0, 4),
          poster_urls: [],
          status_breakdown: buildStatusBreakdown(statusByAnimeId, allAnimeIds),
        };
      },
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
    refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({ lists, loading, error, refetch }),
    [lists, loading, error, refetch],
  );

  return (
    <UserListsContext.Provider value={value}>
      {children}
    </UserListsContext.Provider>
  );
}

export function useUserListsContext(): UserListsContextValue {
  const ctx = useContext(UserListsContext);
  if (!ctx) {
    throw new Error(
      "useUserListsContext must be used within a UserListsProvider",
    );
  }
  return ctx;
}
