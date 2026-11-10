"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUserListsContext } from "@/providers/UserListsProvider";
import { fetchAiringCalendar } from "@/lib/calendar";
import type { AiringCalendar, CalendarWeek } from "@/types/calendar";

/**
 * One week of what the user follows.
 *
 * Keyed on a joined string rather than the Map, whose identity changes on every
 * provider refetch even when no status did. A stale answer is discarded by
 * request number instead of a cancel flag, so React running the effect twice in
 * development cannot lose the result.
 */
export function useAiringCalendar(week: CalendarWeek) {
  const { statusByAnimeId, loading: libraryLoading } = useUserListsContext();
  const [calendar, setCalendar] = useState<AiringCalendar | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const requestedKey = useRef<string | null>(null);

  const idsKey = [...statusByAnimeId.keys()].join(",");
  // Only the first load waits for the library: asking with the empty list it
  // holds then would tell someone who follows plenty that they follow nothing.
  // Later refetches, one per Supabase token refresh, keep the old statuses until
  // the new ones land, so waiting on those would blank a calendar still correct.
  const waitingForLibrary = libraryLoading && idsKey === "";
  // `attempt` is part of the key so that a retry is a new request to settle.
  const requestKey = `${week}:${attempt}:${idsKey}`;

  useEffect(() => {
    if (waitingForLibrary || !idsKey) return;
    if (requestedKey.current === requestKey) return;
    requestedKey.current = requestKey;

    const request = ++latestRequest.current;
    // Rebuilt from the key so the effect depends on primitives only.
    fetchAiringCalendar(idsKey.split(",").map(Number), week)
      .then((data) => {
        if (request !== latestRequest.current) return;
        setCalendar(data);
        setFailed(false);
        setSettledKey(requestKey);
      })
      .catch(() => {
        if (request !== latestRequest.current) return;
        setFailed(true);
        setSettledKey(requestKey);
      });
  }, [waitingForLibrary, idsKey, week, requestKey]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    calendar,
    failed,
    retry,
    statusByAnimeId,
    hasTrackedAnime: idsKey !== "",
    loading: waitingForLibrary || (idsKey !== "" && settledKey !== requestKey),
  };
}
