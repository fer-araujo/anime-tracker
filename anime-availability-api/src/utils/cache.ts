export type TTLValue<T> = { value: T; expiresAt: number };

export class TTLCache<K, V> {
  private store = new Map<K, TTLValue<V>>();
  constructor(private defaultTtlMs = 1000 * 60 * 60) {}

  set(key: K, value: V, ttlMs = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get(key: K): V | undefined {
    const item = this.store.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return item.value;
  }
}

export const memoryCache = new TTLCache<string, unknown>(1000 * 60 * 60 * 12);
