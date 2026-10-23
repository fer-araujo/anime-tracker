import type { StoredProviders } from "./providerStore.js";

/**
 * How long a confirmed provider list (or a confirmed absence on a title that is
 * not airing) is trusted in process memory.
 */
export const LONG_VERDICT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * How long "nothing available here" is trusted for a title that is still airing.
 *
 * An empty answer is a statement about the catalogues *today*, and for a series
 * that is mid-run or has just premiered it is the least stable statement we
 * make: TMDB and the streaming catalogues fill a region in over the first days
 * after a premiere, and licences are announced per territory. A title opened in
 * its first hours came back "checked, nothing", was banked as conclusive, and
 * kept reporting "Pirata" for a series that was already on Crunchyroll — in the
 * one country its owner was watching it from, while every other country, asked
 * for the first time, resolved fine.
 *
 * Twelve hours matches the TMDB provider cache, so there is nothing fresher to
 * learn by asking sooner. It also bounds the cost: a genuinely unlicensed
 * airing series is re-asked about twice a day, not on every request.
 */
export const RELEASING_EMPTY_TTL_MS = 1000 * 60 * 60 * 12;

/** Short retry window for a verdict that was never fully verified. */
export const UNVERIFIED_TTL_MS = 1000 * 60 * 10;

/**
 * Memory-cache lifetime for a freshly resolved verdict.
 *
 * Only an *empty* verdict on an airing title is shortened. A found provider is
 * self-evidently true, and an empty verdict on a finished series does not go
 * stale the same way — its availability is settled.
 */
export function verdictTtlMs(
  conclusive: boolean,
  foundProvider: boolean,
  isReleasing: boolean,
): number {
  if (!conclusive) return UNVERIFIED_TTL_MS;
  if (!foundProvider && isReleasing) return RELEASING_EMPTY_TTL_MS;
  return LONG_VERDICT_TTL_MS;
}

/**
 * Whether a row read back from the durable store may still be believed.
 *
 * The store keeps rows for months, so the freshness rule has to be applied on
 * read as well as on write: rows banked before this rule existed (or written
 * moments before a title's catalogue entry landed) would otherwise keep a
 * series on "Pirata" until the row aged out, and nothing would ever re-ask.
 * Applying it here heals those rows the first time they are requested, with no
 * migration and no manual cache purge.
 */
export function isStoredVerdictTrusted(
  stored: Pick<StoredProviders, "providers" | "resolvedAt">,
  isReleasing: boolean,
  now: number = Date.now(),
): boolean {
  if (stored.providers.length > 0 || !isReleasing) return true;

  const age = now - new Date(stored.resolvedAt).getTime();
  // An unparseable timestamp gives NaN, which fails this comparison and so is
  // treated as stale: re-asking is the safe direction.
  return age < RELEASING_EMPTY_TTL_MS;
}
