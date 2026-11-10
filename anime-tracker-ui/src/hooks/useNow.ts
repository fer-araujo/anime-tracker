"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A clock for things that change with the time of day: an episode flipping from
 * pending to released, the "now" line on the calendar.
 *
 * It also catches up when the tab comes back, because browsers throttle timers
 * in background tabs and a page left open overnight would otherwise show the
 * time it was hidden at. The second value lets a caller re-read the clock at a
 * moment of its own choosing, such as fresh data arriving.
 *
 * For client-rendered output only. The first value is read on the server and
 * again in the browser, so anything drawn from it in server HTML would differ
 * at hydration. Both current callers draw only after client-side data arrives.
 */
export function useNow(intervalMs: number): [number, () => void] {
  const [now, setNow] = useState(() => Date.now());
  const sync = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    const clock = setInterval(sync, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, sync]);

  return [now, sync];
}
