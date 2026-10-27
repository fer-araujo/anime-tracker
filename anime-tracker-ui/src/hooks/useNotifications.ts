"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useUserListsContext } from "@/providers/UserListsProvider";
import { API_BASE } from "@/lib/api";
import { isPending, normalizeNotification } from "@/lib/episodes";
import type { EpisodeNotification } from "@/types/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How often an open tab asks again. The bell lives in the header, which the
 * App Router keeps mounted across navigations — so the first version, which
 * fetched once per user, showed whatever was true when the tab opened until a
 * full reload. An episode that aired at 21:30 in a tab opened at 18:00 never
 * appeared, which is most of "takes forever to show up".
 */
const POLL_MS = 5 * 60 * 1000;

/** The clock the pending → released flip and "hace N min" are read against. */
const CLOCK_MS = 60 * 1000;

/**
 * Render's free tier sleeps after 15 minutes idle and takes most of a minute
 * to wake. The old 15 s timeout gave up on every first visit of the day, and
 * nothing asked again until a reload; now the wait covers a cold start and a
 * failure is retried a few times before the regular poll takes over.
 */
const FETCH_TIMEOUT_MS = 60 * 1000;
const RETRY_DELAY_MS = 30 * 1000;
const MAX_RETRIES = 3;

/**
 * Episodes of what the user is watching: released, and due later today.
 *
 * One stored fact — `user_prefs.notifications_seen_at` — decides what is
 * unread: anything that aired after it. It does not decide what is listed. The
 * bell always shows the last day, with what was already read dimmed, because
 * the first version listed only unread episodes and that made reading destroy
 * the list: open the bell, and the next refetch came back empty, so the user
 * never got a second look at which series had a new episode.
 *
 * A pending episode is never unread. Counting it would light a badge that
 * opening the bell cannot clear — its air time is still ahead of any "seen"
 * instant — and then light it again for the same episode once it aired. It
 * counts once, when it airs, which is the moment there is something to watch.
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
  const [now, setNow] = useState(() => Date.now());
  // Bumped to ask again: by the poll, by the tab coming back, by a retry.
  const [refresh, setRefresh] = useState(0);
  const retries = useRef(0);

  // Primitives, not objects. AuthProvider hands out a new `user` on every auth
  // event, and Supabase emits TOKEN_REFRESHED whenever the window regains focus
  // — so an effect keyed on the object re-ran each time the pointer came back
  // to the page. The id and a joined key change only when the facts do.
  const userId = user?.id ?? null;
  const watchingKey = watchingIds.join(",");

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS);

    // Only while someone can see it: a background tab polling all night is
    // load on a free tier for a badge nobody is looking at.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") setRefresh((r) => r + 1);
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      setRefresh((r) => r + 1);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(clock);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setSeenAt(null);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const retryLater = () => {
      if (cancelled || retries.current >= MAX_RETRIES) return;
      retries.current += 1;
      retryTimer = setTimeout(() => setRefresh((r) => r + 1), RETRY_DELAY_MS);
    };

    (async () => {
      const supabase = createClient();

      // Read on every refresh, not once: another device opening the bell
      // moves this forward, and this tab should stop calling those unread.
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
      // been away longer than that. The rest of today comes back regardless.
      const since = new Date(
        Math.min(Date.parse(seen), Date.now() - DAY_MS),
      ).toISOString();

      try {
        const res = await fetch(`${API_BASE}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animeIds: ids, since }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return retryLater();
        const json = (await res.json()) as {
          data?: Parameters<typeof normalizeNotification>[0][];
        };
        if (cancelled) return;
        retries.current = 0;
        setNow(Date.now());
        setItems((json.data ?? []).map(normalizeNotification));
      } catch {
        // Silent on screen — nothing the user asked for is blocked by the
        // bell — but not given up on: see RETRY_DELAY_MS.
        retryLater();
      }
    })();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [userId, watchingKey, refresh]);

  /** Moves the instant forward; the list stays, now shown as read. */
  const markRead = useCallback(async () => {
    if (!userId) return;

    const at = new Date().toISOString();
    setSeenAt(at);

    const supabase = createClient();
    await supabase
      .from("user_prefs")
      .update({ notifications_seen_at: at })
      .eq("user_id", userId);
  }, [userId]);

  const pending = useCallback(
    (n: EpisodeNotification) => isPending(n, now),
    [now],
  );

  const isUnread = useCallback(
    // Parsed, not compared as strings: Supabase answers `+00:00` where the API
    // answers `Z`, and the two only sort alike while the seconds differ.
    (n: EpisodeNotification) =>
      seenAt !== null &&
      !isPending(n, now) &&
      Date.parse(n.airedAt) > Date.parse(seenAt),
    [seenAt, now],
  );

  const unreadCount = items.filter(isUnread).length;

  return { items, unreadCount, isUnread, isPending: pending, now, markRead };
}
