import { logger } from "./logger.js";

/**
 * Keeps the Render free-tier instance from idling out.
 *
 * Render sleeps a free web service after ~15min without inbound traffic, and a
 * cold start then costs 30-60s. The original approach — a GitHub Actions cron —
 * does not work for this: GitHub's scheduler is best-effort and routinely runs
 * 50-60min late, so the ping regularly lands long after the service is already
 * asleep.
 *
 * A self-ping is reliable because it uses this process's own timer rather than
 * a shared scheduler. The request must go out to the *public* URL: Render meters
 * inbound external traffic, so hitting localhost would not reset the idle timer.
 *
 * Limitation worth knowing: this can only keep a live instance alive, it cannot
 * revive a sleeping one — nothing is running to fire the timer. Pair it with an
 * external uptime monitor if the service must survive a full sleep.
 *
 * Cost note: staying up 24/7 burns ~730h of the 750 free instance-hours per
 * month, so this is only viable as the account's sole free service.
 */

// Comfortably inside Render's ~15min idle window, with room for a missed tick.
const PING_INTERVAL_MS = 10 * 60 * 1000;

export function startKeepAwake(): void {
  // Render injects this at runtime for web services only. Its absence means
  // we're local or on another host, where idling isn't a concern.
  const externalUrl = process.env.RENDER_EXTERNAL_URL;

  if (!externalUrl) {
    logger.info("[keep-awake] RENDER_EXTERNAL_URL not set — self-ping disabled");
    return;
  }

  const target = `${externalUrl.replace(/\/+$/, "")}/health`;

  const timer = setInterval(() => {
    fetch(target, { signal: AbortSignal.timeout(10_000) })
      .then((res) => {
        if (!res.ok) {
          logger.warn({ status: res.status }, "[keep-awake] Ping non-200");
        }
      })
      .catch((err) => {
        // Never throw: a failed ping is not worth crashing the process over,
        // and the next tick will retry anyway.
        logger.warn({ err }, "[keep-awake] Ping failed");
      });
  }, PING_INTERVAL_MS);

  // Don't hold the event loop open — the process should still exit on SIGTERM.
  timer.unref();

  logger.info(
    { target, intervalMs: PING_INTERVAL_MS },
    "[keep-awake] Self-ping scheduled",
  );
}
