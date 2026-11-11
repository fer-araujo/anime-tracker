"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useUserListsContext } from "@/providers/UserListsProvider";
import { useNow } from "@/hooks/useNow";
import {
  CALENDAR_CLOCK_MS,
  calendarWeekStart,
  cdmxDateKey,
  fetchAiringCalendar,
  isAiringCalendar,
} from "@/lib/calendar";
import {
  calendarCacheKey,
  pruneCalendarCache,
  readLastGood,
  writeLastGood,
} from "@/lib/lastGood";
import type { CalendarSnapshot, CalendarWeek } from "@/types/calendar";

/**
 * One week of what the user follows.
 *
 * Keyed on a joined string rather than the Map, whose identity changes on every
 * provider refetch even when no status did. A stale answer is discarded by
 * request number instead of a cancel flag, so React running the effect twice in
 * development cannot lose the result.
 *
 * The last answer for the same user and week is shown from localStorage while
 * the real one is on its way, and kept if the real one fails: the API sleeps on
 * Render's free tier and can take most of a minute, or the whole timeout, to
 * answer a week that rarely changed since the last visit.
 */
export function useAiringCalendar(week: CalendarWeek) {
  const { user } = useAuth();
  const { statusByAnimeId, loading: libraryLoading } = useUserListsContext();
  const [now] = useNow(CALENDAR_CLOCK_MS);
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const requestedKey = useRef<string | null>(null);

  // Primitive, as in useNotifications: AuthProvider hands out a new `user` on
  // every token refresh.
  const userId = user?.id ?? null;
  // The CDMX date, not the instant, so the clock ticking re-renders but only
  // midnight changes anything below.
  const today = cdmxDateKey(now);
  const weekStart = calendarWeekStart(today, week);
  const viewKey = `${userId}:${weekStart}`;
  const cacheKey = userId ? calendarCacheKey(userId, weekStart) : null;

  const idsKey = [...statusByAnimeId.keys()].join(",");
  // Only the first load waits for the library: asking with the empty list it
  // holds then would tell someone who follows plenty that they follow nothing.
  // Later refetches, one per Supabase token refresh, keep the old statuses until
  // the new ones land, so waiting on those would blank a calendar still correct.
  const waitingForLibrary = libraryLoading && idsKey === "";
  // `attempt` is part of the key so that a retry is a new request to settle.
  // `today` is, so that midnight asks again: entries flip from pending to
  // aired, and on a Sunday "this week" becomes another week altogether.
  // The user is in the key so another account never inherits a settled request.
  const requestKey = `${userId}:${weekStart}:${today}:${attempt}:${idsKey}`;

  useEffect(() => {
    if (!cacheKey) return;
    const cached = readLastGood<unknown>(cacheKey);
    // The date check catches a payload written under the wrong key, which
    // would otherwise put one week's episodes under another's heading.
    if (!isAiringCalendar(cached) || cached.meta.firstDate !== weekStart) return;
    // A fresh answer for this week, if one already landed, outranks the cache.
    setSnapshot((prev) =>
      prev?.key === viewKey ? prev : { key: viewKey, calendar: cached },
    );
  }, [cacheKey, weekStart, viewKey]);

  useEffect(() => {
    if (waitingForLibrary || !idsKey) return;
    if (requestedKey.current === requestKey) return;
    requestedKey.current = requestKey;

    const request = ++latestRequest.current;
    // Rebuilt from the key so the effect depends on primitives only.
    fetchAiringCalendar(idsKey.split(",").map(Number), week)
      .then((data) => {
        if (request !== latestRequest.current) return;
        setSnapshot({ key: viewKey, calendar: data });
        setSettledKey(requestKey);
        if (!userId || !isAiringCalendar(data)) return;
        // Under the week the API says it answered, not the one this tab
        // computed: around midnight the two clocks can disagree on the day.
        writeLastGood(calendarCacheKey(userId, data.meta.firstDate), data);
        pruneCalendarCache(userId, calendarWeekStart(today, -1));
      })
      .catch(() => {
        if (request !== latestRequest.current) return;
        // Whatever is on screen for this week stays; with nothing, the page
        // shows its error.
        setSettledKey(requestKey);
      });
  }, [waitingForLibrary, idsKey, week, requestKey, viewKey, userId, today]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    calendar: snapshot?.key === viewKey ? snapshot.calendar : null,
    today,
    retry,
    statusByAnimeId,
    hasTrackedAnime: idsKey !== "",
    loading: waitingForLibrary || (idsKey !== "" && settledKey !== requestKey),
  };
}
