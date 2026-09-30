/**
 * TerminalX - Market Data Cache
 * In-memory TTL cache with request deduplication / promise pooling.
 * Prevents unnecessary upstream calls and thundering herds.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();

  /**
   * Get cached item or execute fetcher with deduplication
   * @param key Unique cache key
   * @param ttlSeconds Time-to-live in seconds
   * @param fetcher Async function returning fresh data
   */
  async getOrFetch<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }

    // Check if identical request is currently in-flight
    const ongoing = this.inFlight.get(key);
    if (ongoing) {
      return ongoing as Promise<T>;
    }

    // Initiate request and store promise
    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== null && result !== undefined) {
          this.cache.set(key, {
            data: result,
            expiresAt: Date.now() + ttlSeconds * 1000,
          });
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    return null;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const marketCache = new MarketCache();
