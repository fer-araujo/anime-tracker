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
import type { RecommendationLibrary, Seed } from "@/types/recommendations";

/** A score at or above this is a signal on its own, matching the API's rule. */
const SEED_SCORE_THRESHOLD = 8;

const EMPTY_LIBRARY: RecommendationLibrary = {
  seeds: [],
  excludedIds: [],
  completedIds: [],
};

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
  /**
   * The same `user_anime` read, reshaped for the recommendation page.
   *
   * It rides along here rather than in its own hook because the query already
   * runs on every page for every signed-in user — widening its `select` by two
   * columns costs nothing, while a second hook would mean a second round-trip
   * for data this one already had in hand.
   */
  library: RecommendationLibrary;
  /**
   * AniList ids the user is currently watching.
   *
   * Rides along for the same reason `library` does: the `user_anime` read that
   * produces it already runs on every page for every signed-in user, and the
   * notification bell needs exactly this list. A dedicated hook would mean a
   * second round-trip for rows this query already holds.
   */
  watchingIds: number[];
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
  const [watchingIds, setWatchingIds] = useState<number[]>([]);
  const [library, setLibrary] = useState<RecommendationLibrary>(EMPTY_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setLists([]);
      setLibrary(EMPTY_LIBRARY);
      setWatchingIds([]);
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
    //
    // `favorite` and `score` come along for the recommendation page. They are
    // two more columns on a query that was already running, which is cheaper
    // than any separate hook could be.
    const { data: trackedRows } = await supabase
      .from("user_anime")
      .select("anime_id, status, favorite, score")
      .eq("user_id", user.id);

    // Dismissed recommendations. Selected separately because they are not part
    // of the library — a dismissal says "this means nothing to me", the exact
    // opposite of what a `user_anime` row means, which is why it is its own
    // table rather than a flag that every other query would have to remember
    // to filter out.
    const { data: dismissedRows } = await supabase
      .from("user_dismissed_recommendations")
      .select("anime_id")
      .eq("user_id", user.id);

    const tracked = (trackedRows ?? []) as {
      anime_id: number;
      status: TrackingStatus | null;
      favorite: boolean | null;
      score: number | null;
    }[];

    const statusByAnimeId = new Map<number, TrackingStatus>();
    for (const row of tracked) {
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

    const seeds: Seed[] = tracked
      .filter(
        (row) =>
          row.favorite === true ||
          (typeof row.score === "number" && row.score >= SEED_SCORE_THRESHOLD),
      )
      .map((row) => ({
        animeId: row.anime_id,
        favorite: row.favorite === true,
        score: row.score,
      }));

    // Everything the user has already acted on. Tracked entries and list
    // entries overlap heavily, and dismissals do not overlap either — the Set
    // is what keeps the request body from carrying the same id three times.
    const excluded = new Set<number>();
    for (const row of tracked) excluded.add(row.anime_id);
    for (const list of mapped) for (const id of list.anime_ids) excluded.add(id);
    for (const row of (dismissedRows ?? []) as { anime_id: number }[]) {
      excluded.add(row.anime_id);
    }

    setLibrary({
      seeds,
      excludedIds: [...excluded],
      completedIds: tracked
        .filter((row) => row.status === "completed")
        .map((row) => row.anime_id),
    });

    setWatchingIds(
      tracked.filter((row) => row.status === "watching").map((row) => row.anime_id),
    );

    setLists(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({ lists, loading, error, refetch, library, watchingIds }),
    [lists, loading, error, refetch, library, watchingIds],
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
