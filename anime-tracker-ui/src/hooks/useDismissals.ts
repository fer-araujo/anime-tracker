"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dismissRecommendation,
  undoDismissRecommendation,
} from "@/actions/dismissRecommendation";
import type { Anime } from "@/types/anime";

/**
 * How long a dismissed card stays on screen offering to come back.
 *
 * Long enough to notice a misclick and reach the button, short enough that a
 * deliberate dismissal does not feel like it failed to register. The card is
 * already gone as far as the database is concerned — the write fires
 * immediately — so this window only governs when the space is reclaimed.
 */
export const UNDO_WINDOW_MS = 5000;

type Options = {
  initial: Anime[];
  reserve: Anime[];
};

/**
 * Dismissal with an undo window, and a reserve to refill from.
 *
 * The write happens on click rather than when the window closes. Waiting would
 * mean a user who dismisses and immediately navigates away loses the dismissal
 * — the common case, since dismissing something is usually the last thing you
 * do before leaving. Undo deletes the row, which the composite primary key
 * makes safe to do whether or not the insert landed.
 */
export function useDismissals({ initial, reserve }: Options) {
  /**
   * One piece of state, not two.
   *
   * Removing a card and promoting its replacement is a single transition, and
   * React may run an updater more than once — in StrictMode it does. Driving
   * two `useState` calls from inside one updater would consume two reserve
   * entries for one dismissal.
   */
  const [shelf, setShelf] = useState<{ visible: Anime[]; bench: Anime[] }>({
    visible: initial,
    bench: reserve,
  });
  /** Ids showing an undo prompt in place of their card. */
  const [pending, setPending] = useState<number[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setShelf({ visible: initial, bench: reserve });
    setPending([]);
  }, [initial, reserve]);

  // Timers outlive the render that created them, so an unmount mid-window would
  // otherwise fire setState on a component that no longer exists.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const id of map.values()) clearTimeout(id);
      map.clear();
    };
  }, []);

  const settle = useCallback((animeId: number) => {
    timers.current.delete(animeId);
    setPending((ids) => ids.filter((id) => id !== animeId));
    setShelf((current) => {
      const visible = current.visible.filter((a) => a.id.anilist !== animeId);
      // Only promote a replacement if something was actually removed. Settling
      // an id that has already gone would otherwise spend a reserve entry for
      // nothing.
      if (visible.length === current.visible.length) return current;

      const [replacement, ...bench] = current.bench;
      return replacement
        ? { visible: [...visible, replacement], bench }
        : { visible, bench: current.bench };
    });
  }, []);

  const dismiss = useCallback(
    (animeId: number) => {
      if (timers.current.has(animeId)) return;
      setPending((ids) => [...ids, animeId]);
      void dismissRecommendation(animeId);
      timers.current.set(
        animeId,
        setTimeout(() => settle(animeId), UNDO_WINDOW_MS),
      );
    },
    [settle],
  );

  const undo = useCallback((animeId: number) => {
    const timer = timers.current.get(animeId);
    if (timer) clearTimeout(timer);
    timers.current.delete(animeId);
    setPending((ids) => ids.filter((id) => id !== animeId));
    void undoDismissRecommendation(animeId);
  }, []);

  return { visible: shelf.visible, pending, dismiss, undo };
}
