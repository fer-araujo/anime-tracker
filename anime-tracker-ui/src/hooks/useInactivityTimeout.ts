"use client";

import { useEffect, useRef } from "react";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

export function useInactivityTimeout(
  onTimeout: () => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
) {
  const lastActivity = useRef(Date.now());
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateActivity = () => {
      lastActivity.current = Date.now();
    };

    document.addEventListener("pointermove", updateActivity);
    document.addEventListener("keydown", updateActivity);
    document.addEventListener("scroll", updateActivity, { passive: true });

    intervalId.current = setInterval(() => {
      if (Date.now() - lastActivity.current > timeoutMs) {
        onTimeout();
        if (intervalId.current !== null) {
          clearInterval(intervalId.current);
          intervalId.current = null;
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("pointermove", updateActivity);
      document.removeEventListener("keydown", updateActivity);
      document.removeEventListener("scroll", updateActivity);

      if (intervalId.current !== null) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [onTimeout, timeoutMs]);
}
