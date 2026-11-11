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
