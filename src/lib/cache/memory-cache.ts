/**
 * In-process TTL cache for public catalog data.
 * Avoids Redis/complex infra — sufficient for single-node production.
 */
type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function cacheStats(): { size: number } {
  return { size: store.size };
}

/** @internal */
export function cacheClearAll(): void {
  store.clear();
}
