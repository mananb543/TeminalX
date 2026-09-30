/**
 * TerminalX - In-Memory Market Data Cache & In-Flight Request Deduplicator
 * Reduces unnecessary external provider round-trips and eliminates race-condition duplicates.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketDataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();

  /**
   * Get an item from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Store an item in cache with a specific TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Fetch with cache and in-flight deduplication
   */
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there is already an active in-flight request for this key
    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const result = await fetchFn();
        this.set(key, result, ttlSeconds);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Evict a specific cache key or prefix
   */
  invalidate(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const marketCache = new MarketDataCache();
