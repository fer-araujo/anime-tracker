type Entry<T> = { value: T; expiresAt: number };

export class MemoryCache {
  private map = new Map<string, Entry<any>>();

  constructor(private defaultTtlMs = 1000 * 60 * 60) {} // 1h

  get<T>(key: string): T | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const t = ttlMs ?? this.defaultTtlMs;
    this.map.set(key, { value, expiresAt: Date.now() + t });
  }
}

export const cache = new MemoryCache();
