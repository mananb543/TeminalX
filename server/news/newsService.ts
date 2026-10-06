/**
 * TerminalX - Financial News & Event Intelligence Service
 * Orchestrates provider management, multi-tier caching, MongoDB persistence,
 * portfolio-specific news and corporate action intelligence.
 */

import {
  NewsProvider,
  NewsArticle,
  MarketEvent,
  EventFilterParams,
} from './providers/NewsProvider.ts';
import { DemoNewsProvider } from './providers/DemoNewsProvider.ts';
import { RealNewsProvider } from './providers/RealNewsProvider.ts';
import { newsCache } from './newsCache.ts';
import { NewsArticle as NewsArticleModel } from '../models/NewsArticle.ts';
import { storageService } from '../services/storageService.ts';
import { dbState } from '../config/database.ts';

class NewsService {
  private demoProvider: DemoNewsProvider;
  private realProvider: RealNewsProvider;
  private activeMode: 'demo' | 'real';

  constructor() {
    this.demoProvider = new DemoNewsProvider();
    this.realProvider = new RealNewsProvider();

    const configured = (process.env.NEWS_PROVIDER || 'demo').toLowerCase().trim();
    this.activeMode = configured === 'real' ? 'real' : 'demo';
  }

  public getActiveProvider(): NewsProvider {
    return this.activeMode === 'real' ? this.realProvider : this.demoProvider;
  }

  public getMode(): 'demo' | 'real' {
    return this.activeMode;
  }

  public setMode(mode: 'demo' | 'real'): void {
    this.activeMode = mode;
    newsCache.clear();
  }

  /**
   * Persist articles to MongoDB if connected without duplicating
   */
  private async persistArticles(articles: NewsArticle[]): Promise<void> {
    if (!dbState.isConnected || articles.length === 0) return;

    try {
      const ops = articles.map((art) => ({
        updateOne: {
          filter: { providerArticleId: art.id },
          update: {
            $set: {
              providerArticleId: art.id,
              headline: art.headline,
              summary: art.summary,
              source: art.source,
              url: art.url,
              publishedAt: new Date(art.publishedAt),
              imageUrl: art.imageUrl,
              symbols: art.symbols,
              categories: art.categories,
              language: art.language || 'en',
              sentiment: art.sentiment,
            },
          },
          upsert: true,
        },
      }));

      await NewsArticleModel.bulkWrite(ops, { ordered: false });
    } catch (err: any) {
      console.warn('[NewsService MongoDB persistence]:', err.message);
    }
  }

  /**
   * Fetch latest broad-market financial news
   */
  public async getMarketNews(limit = 20): Promise<NewsArticle[]> {
    const cacheKey = `news:market:${this.activeMode}:${limit}`;
    const ttl = 60; // 60s TTL for market wire

    return newsCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      const articles = await provider.getMarketNews(limit);
      this.persistArticles(articles);
      return articles;
    });
  }

  /**
   * Fetch company-specific news
   */
  public async getCompanyNews(symbol: string, limit = 10): Promise<NewsArticle[]> {
    const cleanSym = symbol.toUpperCase().trim();
    const cacheKey = `news:symbol:${this.activeMode}:${cleanSym}:${limit}`;
    const ttl = 60; // 60s TTL for company wire

    return newsCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      const articles = await provider.getCompanyNews(cleanSym, limit);
      this.persistArticles(articles);
      return articles;
    });
  }

  /**
   * Search financial news across keywords and entities
   */
  public async searchNews(query: string, limit = 20): Promise<NewsArticle[]> {
    const cleanQ = query.toLowerCase().trim();
    if (!cleanQ) {
      return this.getMarketNews(limit);
    }

    const cacheKey = `news:search:${this.activeMode}:${cleanQ}:${limit}`;
    const ttl = 120; // 120s TTL for search queries

    return newsCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      const articles = await provider.searchNews(cleanQ, limit);
      this.persistArticles(articles);
      return articles;
    });
  }

  /**
   * Get single article by ID
   */
  public async getArticleById(id: string): Promise<NewsArticle | null> {
    const cleanId = id.trim();
    const cacheKey = `news:article:${cleanId}`;
    const ttl = 3600; // 1 hour TTL for individual article lookups

    return newsCache.getOrFetch(cacheKey, ttl, async () => {
      if (dbState.isConnected) {
        try {
          const doc = await NewsArticleModel.findOne({ providerArticleId: cleanId });
          if (doc) {
            return {
              id: doc.providerArticleId,
              headline: doc.headline,
              summary: doc.summary,
              source: doc.source,
              url: doc.url,
              publishedAt: doc.publishedAt.toISOString(),
              imageUrl: doc.imageUrl,
              symbols: doc.symbols,
              categories: doc.categories,
              language: doc.language,
              sentiment: doc.sentiment,
            };
          }
        } catch (err: any) {
          console.warn('[NewsService MongoDB lookup]:', err.message);
        }
      }

      const provider = this.getActiveProvider();
      return await provider.getArticleById(cleanId);
    });
  }

  /**
   * Personalized news relevant to user's held securities
   * Note: Personalized results are NEVER cached across different users!
   */
  public async getPortfolioNews(userId: string, limit = 15): Promise<NewsArticle[]> {
    const holdings = await storageService.getHoldings(userId);
    const heldSymbols = holdings
      .filter((h) => h.quantity > 0)
      .map((h) => h.symbol.toUpperCase().trim());

    if (heldSymbols.length === 0) {
      return this.getMarketNews(limit);
    }

    const articlesBySymbol = await Promise.all(
      heldSymbols.map(async (symbol) => {
        try {
          return await this.getCompanyNews(symbol, 5);
        } catch {
          return [];
        }
      })
    );

    const articleMap = new Map<string, NewsArticle>();
    for (const group of articlesBySymbol) {
      for (const art of group) {
        if (!articleMap.has(art.id)) {
          articleMap.set(art.id, art);
        }
      }
    }

    if (articleMap.size < 5) {
      const marketNews = await this.getMarketNews(10);
      for (const art of marketNews) {
        if (!articleMap.has(art.id)) {
          articleMap.set(art.id, art);
        }
      }
    }

    const sorted = Array.from(articleMap.values()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return sorted.slice(0, limit);
  }

  /**
   * Get corporate actions and market events
   */
  public async getEvents(params?: EventFilterParams): Promise<MarketEvent[]> {
    const cacheKey = `events:${this.activeMode}:${JSON.stringify(params || {})}`;
    const ttl = 600; // 10 minutes TTL for event calendar

    return newsCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      if (provider.getEvents) {
        return await provider.getEvents(params);
      }
      return [];
    });
  }

  /**
   * Get upcoming corporate actions and economic events
   */
  public async getUpcomingEvents(limit = 20): Promise<MarketEvent[]> {
    return this.getEvents({ upcomingOnly: true, limit });
  }

  /**
   * Get corporate events for a specific symbol
   */
  public async getCompanyEvents(symbol: string): Promise<MarketEvent[]> {
    const cleanSym = symbol.toUpperCase().trim();
    return this.getEvents({ symbol: cleanSym, upcomingOnly: false, limit: 10 });
  }

  /**
   * Get events specific to user's held portfolio positions
   */
  public async getPortfolioEvents(userId: string): Promise<MarketEvent[]> {
    const holdings = await storageService.getHoldings(userId);
    const heldSymbols = new Set(
      holdings.filter((h) => h.quantity > 0).map((h) => h.symbol.toUpperCase().trim())
    );

    const allUpcoming = await this.getUpcomingEvents(50);

    const portfolioEvents = allUpcoming.filter(
      (e) => heldSymbols.has(e.symbol.toUpperCase()) || e.type === 'ECONOMIC_EVENT'
    );

    return portfolioEvents;
  }
}

export const newsService = new NewsService();
