import { ENV } from "../config/env.js";
import { logger } from "./logger.js";

interface WarmupTarget {
  path: string;
  label: string;
}

const WARMUP_TARGETS: WarmupTarget[] = [
  { path: "/v1/home/hero", label: "hero" },
  { path: "/v1/season?rank=popular", label: "season-popular" },
  { path: "/v1/season?rank=trending", label: "season-trending" },
];

/**
 * Fetches critical endpoints after server startup to warm the cache.
 * Uses native fetch against localhost.
 *
 * - All targets run in parallel via Promise.allSettled
 * - Never throws — individual failures are logged and swallowed
 * - Logs [warmup] result for each target with duration
 */
export async function warmupCache(): Promise<void> {
  const port = ENV.PORT;
  const baseUrl = `http://localhost:${port}`;

  logger.info(`[warmup] Warming cache for ${WARMUP_TARGETS.length} targets...`);

  const results = await Promise.allSettled(
    WARMUP_TARGETS.map(async ({ path, label }) => {
      const start = Date.now();
      const url = `${baseUrl}${path}`;

      try {
        const res = await fetch(url);
        const duration = Date.now() - start;

        if (res.ok) {
          logger.info(`[warmup] ✓ ${label} — ${res.status} (${duration}ms)`);
        } else {
          logger.warn(`[warmup] ✗ ${label} — ${res.status} ${res.statusText} (${duration}ms)`);
        }
      } catch (err) {
        const duration = Date.now() - start;
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[warmup] ✗ ${label} — error (${duration}ms): ${msg}`);
      }
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  logger.info(`[warmup] Done — ${succeeded}/${WARMUP_TARGETS.length} targets`);
}
