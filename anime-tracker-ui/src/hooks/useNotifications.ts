"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useUserListsContext } from "@/providers/UserListsProvider";
import { API_BASE } from "@/lib/api";
import type { EpisodeNotification } from "@/types/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Episodes released for the anime the user is watching.
 *
 * One stored fact — `user_prefs.notifications_seen_at` — decides what is
 * unread: anything that aired after it. It does not decide what is listed. The
 * bell always shows the last day, with what was already read dimmed, because
 * the first version listed only unread episodes and that made reading destroy
 * the list: open the bell, and the next refetch came back empty, so the user
 * never got a second look at which series had a new episode.
 *
 * If `user_prefs` is missing, the bell stays silent rather than falling back to
 * a fixed window. A badge no click could clear is worse than no bell at all,
 * and the table being absent is a deploy state, not the user's problem.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { watchingIds } = useUserListsContext();
  const [items, setItems] = useState<EpisodeNotification[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  // Primitives, not objects. AuthProvider hands out a new `user` on every auth
  // event, and Supabase emits TOKEN_REFRESHED whenever the window regains focus
  // — so an effect keyed on the object re-ran each time the pointer came back
  // to the page. The id and a joined key change only when the facts do.
  const userId = user?.id ?? null;
  const watchingKey = watchingIds.join(",");

  useEffect(() => {
    if (!userId) {
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
        .eq("user_id", userId)
        .maybeSingle();

      // Missing table, or RLS refusing: no bell. See the note above.
      if (error) return;

      let seen = data?.notifications_seen_at as string | undefined;

      // First visit: a day back, so today's episodes count as new rather than
      // disappearing into "before you arrived".
      if (!seen) {
        seen = new Date(Date.now() - DAY_MS).toISOString();
        const { error: insertError } = await supabase
          .from("user_prefs")
          .insert({ user_id: userId, notifications_seen_at: seen });
        if (insertError) return;
      }

      if (cancelled) return;
      setSeenAt(seen);

      const ids = watchingKey ? watchingKey.split(",").map(Number) : [];
      if (ids.length === 0) {
        setItems([]);
        return;
      }

      // Whichever reaches further back: the last day, or the last visit. The
      // day keeps read episodes on the list; the visit covers someone who has
      // been away longer than that.
      const since = new Date(
        Math.min(Date.parse(seen), Date.now() - DAY_MS),
      ).toISOString();

      try {
        const res = await fetch(`${API_BASE}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animeIds: ids, since }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data: EpisodeNotification[] };
        if (!cancelled) setItems(json.data ?? []);
      } catch {
        // A silent bell is the right failure: nothing the user asked for is
        // blocked by it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, watchingKey]);

  /** Moves the instant forward; the list stays, now shown as read. */
  const markRead = useCallback(async () => {
    if (!userId) return;

    const now = new Date().toISOString();
    setSeenAt(now);

    const supabase = createClient();
    await supabase
      .from("user_prefs")
      .update({ notifications_seen_at: now })
      .eq("user_id", userId);
  }, [userId]);

  const isUnread = useCallback(
    (n: EpisodeNotification) => seenAt !== null && n.airedAt > seenAt,
    [seenAt],
  );

  const unreadCount = items.filter(isUnread).length;

  return { items, unreadCount, isUnread, markRead };
}
