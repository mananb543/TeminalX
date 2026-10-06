/**
 * TerminalX - Financial News & Event Cache Engine
 * High-performance TTL cache with in-flight request deduplication.
 * Prevents redundant external provider calls and rate limit exhaustion.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class NewsCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();

  /**
   * Get cached entry or execute fetcher function with request deduplication
   * @param key Unique cache key
   * @param ttlSeconds Time-to-live in seconds
   * @param fetcher Async function producing data if cache missed
   */
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }

    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      return inFlightPromise as Promise<T>;
    }

    const promise = (async () => {
      try {
        const freshData = await fetcher();
        this.store.set(key, {
          data: freshData,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return freshData;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }
}

export const newsCache = new NewsCache();
