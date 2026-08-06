import { logger } from "./logger.js";
import { createSupabaseAdmin } from "./supabase.js";

/**
 * Durable, cross-instance cache for resolved providers.
 *
 * The in-process cache dies with the process, and Render restarts constantly
 * (deploys, env changes, sleep cycles). Every restart meant paying RapidAPI
 * again for titles already resolved. This layer sits between memory and the
 * upstream APIs so a title is bought once, not once per deploy.
 *
 * Every function here fails soft: this is an optimisation, and a database
 * hiccup must degrade to the previous behaviour (hit the APIs) rather than
 * break provider resolution outright.
 */

/**
 * How long a stored verdict is trusted before being resolved again. Licences
 * lapse and catalogues shift, so entries can't be trusted forever — but the
 * window has to stay wide enough that refreshing doesn't recreate the monthly
 * spend this table was added to eliminate.
 */
const STALE_AFTER_MS =
  Number(process.env.PROVIDER_CACHE_DAYS ?? 90) * 24 * 60 * 60 * 1000;

/**
 * A season page resolves 20-100 titles, each hitting this module. Without a
 * latch, a misconfigured environment logs the same credential error dozens of
 * times per request and buries anything else worth reading. Fail once, loudly,
 * then stay quiet — the store is an optimisation, so running without it is a
 * degraded mode, not an outage.
 */
let storeDisabled = false;

function disableStore(err: unknown): void {
  if (!storeDisabled) {
    storeDisabled = true;
    logger.warn(
      { err },
      "[providerStore] Unavailable — falling back to upstream lookups for this process",
    );
  }
}

export type StoredProviders = {
  providers: string[];
  source: string | null;
  resolvedAt: string;
};

export async function getStoredProviders(
  animeId: number,
  country: string,
): Promise<StoredProviders | null> {
  if (storeDisabled) return null;

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("anime_providers")
      .select("providers, source, resolved_at")
      .eq("anime_id", animeId)
      .eq("country", country)
      .maybeSingle();

    if (error) {
      logger.warn({ err: error, animeId }, "[providerStore] Read failed");
      return null;
    }
    if (!data) return null;

    const row = data as {
      providers: unknown;
      source: string | null;
      resolved_at: string;
    };

    const age = Date.now() - new Date(row.resolved_at).getTime();
    if (age > STALE_AFTER_MS) return null;

    // Defensive: the column is jsonb, so a malformed row shouldn't be able to
    // propagate a non-array into provider logic downstream.
    if (!Array.isArray(row.providers)) {
      logger.warn({ animeId }, "[providerStore] Discarding malformed row");
      return null;
    }

    return {
      providers: row.providers as string[],
      source: row.source,
      resolvedAt: row.resolved_at,
    };
  } catch (err) {
    // Thrown rather than returned means the client itself couldn't be built
    // (missing credentials), which won't fix itself on the next call.
    disableStore(err);
    return null;
  }
}

/**
 * Persists a verdict. Callers must only pass **conclusive** results: storing a
 * lookup that failed or was budget-blocked would make a transient problem
 * permanent, which is the exact failure this system already suffered once with
 * a 7-day memory cache.
 */
type AnimeProvidersRow = {
  anime_id: number;
  country: string;
  providers: string[];
  source: string | null;
  resolved_at: string;
};

export async function storeProviders(
  animeId: number,
  country: string,
  providers: string[],
  source: string | null,
): Promise<void> {
  if (storeDisabled) return;

  try {
    const supabase = createSupabaseAdmin();

    const row: AnimeProvidersRow = {
      anime_id: animeId,
      country,
      providers,
      source,
      resolved_at: new Date().toISOString(),
    };

    // The admin client is created without generated schema types, so its
    // insert/upsert generics collapse to `never`. Asserting the row type here
    // keeps the shape checked at the call site rather than disabling checking.
    const { error } = await (
      supabase.from("anime_providers") as unknown as {
        upsert: (
          values: AnimeProvidersRow,
          options: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).upsert(row, { onConflict: "anime_id,country" });

    if (error) {
      logger.warn({ err: error, animeId }, "[providerStore] Write failed");
    }
  } catch (err) {
    logger.warn({ err, animeId }, "[providerStore] Write threw");
  }
}
