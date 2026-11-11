/**
 * The last answer that worked, kept in localStorage so a reload can show it
 * while the real request is still on its way (stale-while-revalidate).
 *
 * Every access is guarded: storage throws in private mode, when site data is
 * blocked, when the quota is full, and does not exist during SSR. A cache that
 * fails must look like an empty cache, never like an error, because the
 * network request it fronts is the source of truth either way.
 */

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Some browsers throw on the property access itself when storage is blocked.
    return null;
  }
}

export function readLastGood<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    // A corrupt or hand-edited payload is the same as no payload.
    return null;
  }
}

export function writeLastGood(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or blocked storage: the next visit simply starts cold.
  }
}

export function clearLastGood(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing to clear if storage is unreachable.
  }
}

/**
 * Versioned so a change to the cached shape can bump `v1` instead of reading
 * an old payload as the new one; per user so a shared browser never shows one
 * account's episodes in another account's bell.
 */
export function notificationsCacheKey(userId: string): string {
  return `notifications:v1:${userId}`;
}

/**
 * Removes every stored key under `prefix` that `matches` accepts. Keys are
 * collected before any is removed, because removing shifts `Storage.key(i)`.
 */
export function clearLastGoodWhere(
  prefix: string,
  matches: (key: string) => boolean = () => true,
): void {
  try {
    const store = storage();
    if (!store) return;
    const doomed: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(prefix) && matches(key)) doomed.push(key);
    }
    for (const key of doomed) store.removeItem(key);
  } catch {
    // Unreachable storage holds nothing to prune.
  }
}

/** Without a user, the prefix of every account's calendars. */
export function calendarCachePrefix(userId?: string): string {
  return userId ? `calendar:v1:${userId}:` : "calendar:v1:";
}

/**
 * Keyed on the CDMX date the week starts, not on the -1/0/1 the page asks
 * with: "this week" names a different week every Sunday, and a relative key
 * would show last week's episodes under this week's heading.
 */
export function calendarCacheKey(userId: string, weekStart: string): string {
  return `${calendarCachePrefix(userId)}${weekStart}`;
}

/**
 * Drops a user's weeks that start before `oldestWeekStart`. The page can only
 * ask for last, this and next week, so anything older is never read again and
 * would otherwise pile up one key per week for as long as the browser lives.
 */
export function pruneCalendarCache(
  userId: string,
  oldestWeekStart: string,
): void {
  const prefix = calendarCachePrefix(userId);
  // `YYYY-MM-DD` sorts as text in date order.
  clearLastGoodWhere(prefix, (key) => key.slice(prefix.length) < oldestWeekStart);
}
