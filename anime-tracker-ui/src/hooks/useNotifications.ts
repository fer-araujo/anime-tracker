"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useUserListsContext } from "@/providers/UserListsProvider";
import { API_BASE } from "@/lib/api";
import type { EpisodeNotification } from "@/types/notifications";

/**
 * Episodes released since the user last opened the bell.
 *
 * The whole feature rests on one stored fact — `user_prefs.notifications_seen_at`
 * — and derives the rest. There is no per-notification row to write, mark or
 * clean up: an episode is unread if it aired after that instant, and reading
 * the bell moves the instant forward.
 *
 * If `user_prefs` is missing, the bell stays silent rather than falling back to
 * a fixed window. A window it cannot record would show a badge that no click
 * could clear, which is worse than no bell at all — and the table being absent
 * means the migration has not run yet, which is a deploy state, not a user's
 * problem to look at.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { watchingIds } = useUserListsContext();
  const [items, setItems] = useState<EpisodeNotification[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setSeenAt(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("user_prefs")
        .select("notifications_seen_at")
        .eq("user_id", user.id)
        .maybeSingle();

      // Missing table, or RLS refusing: no bell. See the note above.
      if (error) return;

      let since = data?.notifications_seen_at as string | undefined;

      // First visit. The row is created now rather than lazily on the first
      // read of the bell, so the starting point is when the user arrived and
      // not the epoch — otherwise the bell would open full of a whole season.
      if (!since) {
        since = new Date().toISOString();
        const { error: insertError } = await supabase
          .from("user_prefs")
          .insert({ user_id: user.id, notifications_seen_at: since });
        if (insertError) return;
      }

      if (cancelled) return;
      setSeenAt(since);

      if (watchingIds.length === 0) {
        setItems([]);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animeIds: watchingIds, since }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data: EpisodeNotification[] };
        if (!cancelled) setItems(json.data ?? []);
      } catch {
        // A silent bell is the right failure here: nothing the user asked for
        // is blocked by it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, watchingIds]);

  /**
   * Clears the badge immediately and records the new instant behind it.
   *
   * The list itself is kept on screen. The popover is open at this moment and
   * emptying it under the cursor would take away what the user just opened it
   * to read; they stay until the next load, by which point they are genuinely
   * old news.
   */
  const markRead = useCallback(async () => {
    if (!user || items.length === 0) return;

    const now = new Date().toISOString();
    setSeenAt(now);

    const supabase = createClient();
    await supabase
      .from("user_prefs")
      .update({ notifications_seen_at: now })
      .eq("user_id", user.id);
  }, [user, items.length]);

  /**
   * Unread is derived, not stored. `markRead` moves `seenAt` past everything
   * currently listed, so the badge empties without touching `items`.
   */
  const unreadCount = seenAt
    ? items.filter((n) => n.airedAt > seenAt).length
    : 0;

  return { items, unreadCount, markRead };
}
