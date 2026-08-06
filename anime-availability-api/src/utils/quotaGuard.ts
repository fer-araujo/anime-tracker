import { logger } from "./logger.js";

/**
 * Hard spend ceiling for the paid RapidAPI (Streaming Availability) endpoint.
 *
 * Written after an incident: a guard in resolveProviders was removed as "dead
 * code", which turned every search into ~12xN upstream calls and consumed 85%
 * of a monthly quota before anyone noticed. The guard is back, but a code-level
 * guard is a single point of failure when the blast radius is billing — this is
 * the backstop that makes a repeat impossible rather than merely unlikely.
 *
 * Sliding 24h window rather than a monthly counter: process memory doesn't
 * survive a redeploy, so a monthly budget can't be tracked honestly here. A
 * daily ceiling bounds the worst case regardless of restarts, which is the
 * property that actually matters for cost control.
 *
 * Single-instance by design — Render free tier runs one. On a multi-instance
 * plan each replica would carry its own budget, so the effective ceiling
 * multiplies by the replica count.
 */

/**
 * This is a circuit breaker, not a budget. The BASIC plan allows 1000 calls per
 * rolling 30-day window (~32/day at break-even), but what actually keeps usage
 * under that is the 7-day provider cache — not this counter.
 *
 * 25/day was set first and proved too tight: one season page resolves 20-100
 * titles, so the ceiling was hit on the first page load, and every lookup after
 * that returned empty and got cached as "no providers". The number has to clear
 * normal daily use or it manufactures the very bug it was added to prevent.
 *
 * 35 clears a day's legitimate traffic while still cutting off a runaway loop
 * (the incident that prompted this guard issued ~12xN calls per search). It
 * cannot enforce the monthly quota on its own: this counter lives in process
 * memory and resets on redeploy. Persisting resolved providers is what fixes
 * that properly.
 */
const DAILY_LIMIT = Number(process.env.RAPIDAPI_DAILY_LIMIT ?? 35);
const WINDOW_MS = 24 * 60 * 60 * 1000;

let callTimestamps: number[] = [];
let exhaustionLogged = false;

/**
 * Reserves a call slot. Returns false when the budget is spent, in which case
 * the caller must skip the upstream request entirely.
 */
export function tryConsumeRapidApiCall(): boolean {
  const now = Date.now();
  callTimestamps = callTimestamps.filter((ts) => now - ts < WINDOW_MS);

  if (callTimestamps.length >= DAILY_LIMIT) {
    // Log the transition into exhaustion only — at saturation this path runs
    // on every request and would otherwise drown the logs.
    if (!exhaustionLogged) {
      logger.warn(
        { dailyLimit: DAILY_LIMIT },
        "[quota] RapidAPI daily budget exhausted — skipping provider fallback until the window rolls over",
      );
      exhaustionLogged = true;
    }
    return false;
  }

  exhaustionLogged = false;
  callTimestamps.push(now);
  return true;
}

/** Exposed for tests — production code has no reason to reset the window. */
export function __resetRapidApiQuota(): void {
  callTimestamps = [];
  exhaustionLogged = false;
}

export function getRapidApiQuotaState() {
  const now = Date.now();
  const used = callTimestamps.filter((ts) => now - ts < WINDOW_MS).length;
  return { used, limit: DAILY_LIMIT };
}
