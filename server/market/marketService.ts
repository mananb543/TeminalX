/**
 * TerminalX - Unified Market Service
 * Manages active market data provider (demo vs real), handles caching, rate limiting, and overviews.
 */

import {
  MarketDataProvider,
  NormalizedQuote,
  OHLCVCandle,
  SearchResultItem,
  OrderBook,
  MarketProviderError,
} from './providers/MarketDataProvider.ts';
import { DemoMarketDataProvider } from './providers/DemoMarketDataProvider.ts';
import { RealMarketDataProvider } from './providers/RealMarketDataProvider.ts';
import { marketCache } from './cache/marketCache.ts';

export interface MarketOverviewData {
  provider: 'demo' | 'real';
  providerName: string;
  indianIndices: NormalizedQuote[];
  globalIndices: NormalizedQuote[];
  currencies: NormalizedQuote[];
  commodities: NormalizedQuote[];
  topEquities: NormalizedQuote[];
}

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  symbols: string[];
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  url: string;
  category: 'MARKETS' | 'EARNINGS' | 'MACRO' | 'COMMODITIES';
}

const STATIC_NEWS: MarketNewsItem[] = [
  {
    id: 'news-1',
    title: 'RBI Monetary Policy Committee Maintains Benchmark Repo Rate at 6.50%',
    summary: 'Governor reiterates commitment to aligning inflation durably with the 4% target while acknowledging robust domestic GDP growth impulses.',
    source: 'Financial Express',
    publishedAt: '28 mins ago',
    symbols: ['NIFTY 50', 'NIFTY BANK', 'SBIN', 'HDFCBANK'],
    sentiment: 'NEUTRAL',
    url: '#',
    category: 'MACRO',
  },
  {
    id: 'news-2',
    title: 'Reliance Retail Announces Strategic Expansion into Quick-Commerce & Automation Logistics',
    summary: 'RIL subsidiary plans multi-tier dark warehouse hubs leveraging automated sorting, aiming for sub-15 minute fulfillment across tier-1 metros.',
    source: 'Economic Times',
    publishedAt: '1 hour ago',
    symbols: ['RELIANCE'],
    sentiment: 'POSITIVE',
    url: '#',
    category: 'EARNINGS',
  },
  {
    id: 'news-3',
    title: 'Indian IT Sector Sees Strong Deal Pipeline in Enterprise AI Architecture',
    summary: 'TCS and Infosys report double-digit quarter-on-quarter acceleration in generative AI pilot transitions into multi-year enterprise contracts.',
    source: 'Mint Markets',
    publishedAt: '2 hours ago',
    symbols: ['TCS', 'INFY'],
    sentiment: 'POSITIVE',
    url: '#',
    category: 'MARKETS',
  },
  {
    id: 'news-4',
    title: 'Crude Oil Softens as Global Supply Surplus Offsets Middle East Geopolitical Risk',
    summary: 'Brent drops below $72/bbl following OPEC+ production trajectory revisions and inventory build-up in major industrial refining centers.',
    source: 'Bloomberg Markets',
    publishedAt: '3 hours ago',
    symbols: ['CRUDE OIL'],
    sentiment: 'NEGATIVE',
    url: '#',
    category: 'COMMODITIES',
  },
  {
    id: 'news-5',
    title: 'Tata Motors EV Division Crosses 250,000 Cumulative Production Milestone',
    summary: 'Management guides for expanded portfolio of localized battery pack assembly and upcoming launch of premium all-wheel drive platform.',
    source: 'Business Standard',
    publishedAt: '4 hours ago',
    symbols: ['TATAMOTORS'],
    sentiment: 'POSITIVE',
    url: '#',
    category: 'EARNINGS',
  },
];

class UnifiedMarketService {
  private demoProvider: DemoMarketDataProvider;
  private realProvider: RealMarketDataProvider;
  private activeMode: 'demo' | 'real';

  constructor() {
    this.demoProvider = new DemoMarketDataProvider();
    this.realProvider = new RealMarketDataProvider();
    
    const configured = (process.env.MARKET_DATA_PROVIDER || 'demo').toLowerCase().trim();
    this.activeMode = configured === 'real' ? 'real' : 'demo';
  }

  public getActiveProvider(): MarketDataProvider {
    return this.activeMode === 'real' ? this.realProvider : this.demoProvider;
  }

  public getMode(): 'demo' | 'real' {
    return this.activeMode;
  }

  public setMode(mode: 'demo' | 'real'): void {
    this.activeMode = mode;
    marketCache.clear(); // invalidate cache on provider switch
  }

  /**
   * Get single quote with 15-second TTL cache
   */
  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const cleanSym = symbol.toUpperCase().trim();
    const cacheKey = `quote:${this.activeMode}:${cleanSym}`;
    const ttl = 15; // 15 seconds

    return marketCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      return await provider.getQuote(cleanSym);
    });
  }

  /**
   * Get multiple quotes with caching
   */
  async getQuotes(symbols?: string[]): Promise<NormalizedQuote[]> {
    const targetSymbols = symbols && symbols.length > 0
      ? symbols.map((s) => s.toUpperCase().trim())
      : [
          'NIFTY 50', 'SENSEX', 'NIFTY BANK',
          'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
          'TATAMOTORS', 'BHARTIARTL', 'ITC', 'SBIN', 'LT', 'AXISBANK',
          'S&P 500', 'NASDAQ', 'DOW JONES', 'USD/INR', 'EUR/INR', 'GOLD', 'CRUDE OIL'
        ];

    const results = await Promise.all(
      targetSymbols.map(async (sym) => {
        try {
          return await this.getQuote(sym);
        } catch {
          return null;
        }
      })
    );

    return results.filter((q): q is NormalizedQuote => q !== null);
  }

  /**
   * Get historical OHLCV candles with 5-minute TTL cache
   */
  async getHistoricalData(
    symbol: string,
    timeframe = '1D',
    range = '1M'
  ): Promise<OHLCVCandle[]> {
    const cleanSym = symbol.toUpperCase().trim();
    const cacheKey = `history:${this.activeMode}:${cleanSym}:${timeframe}:${range}`;
    const ttl = 300; // 5 minutes

    return marketCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      return await provider.getHistoricalData(cleanSym, timeframe, range);
    });
  }

  /**
   * Autocomplete search with 10-minute TTL cache
   */
  async search(query: string): Promise<SearchResultItem[]> {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) {
      return this.getActiveProvider().search('');
    }

    const cacheKey = `search:${this.activeMode}:${cleanQ}`;
    const ttl = 600; // 10 minutes

    return marketCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      return await provider.search(cleanQ);
    });
  }

  /**
   * Get Level 2 orderbook depth
   */
  async getOrderBook(symbol: string): Promise<OrderBook> {
    const cleanSym = symbol.toUpperCase().trim();
    const cacheKey = `orderbook:${this.activeMode}:${cleanSym}`;
    const ttl = 5; // 5 seconds

    return marketCache.getOrFetch(cacheKey, ttl, async () => {
      const provider = this.getActiveProvider();
      return await provider.getOrderBook(cleanSym);
    });
  }

  /**
   * Get categorized overview
   */
  async getMarketOverview(): Promise<MarketOverviewData> {
    const cacheKey = `overview:${this.activeMode}`;
    const ttl = 15; // 15 seconds

    return marketCache.getOrFetch(cacheKey, ttl, async () => {
      const indianIndices = await this.getQuotes(['NIFTY 50', 'SENSEX', 'NIFTY BANK']);
      const globalIndices = await this.getQuotes(['S&P 500', 'NASDAQ', 'DOW JONES']);
      const currencies = await this.getQuotes(['USD/INR', 'EUR/INR']);
      const commodities = await this.getQuotes(['GOLD', 'CRUDE OIL']);
      const topEquities = await this.getQuotes([
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
        'TATAMOTORS', 'BHARTIARTL', 'ITC', 'SBIN', 'LT', 'AXISBANK'
      ]);

      return {
        provider: this.activeMode,
        providerName: this.getActiveProvider().name,
        indianIndices,
        globalIndices,
        currencies,
        commodities,
        topEquities,
      };
    });
  }

  /**
   * Financial news
   */
  getNews(symbol?: string): MarketNewsItem[] {
    if (!symbol) return STATIC_NEWS;
    const clean = symbol.toUpperCase().trim();
    const filtered = STATIC_NEWS.filter((item) => item.symbols.includes(clean));
    return filtered.length > 0 ? filtered : STATIC_NEWS.slice(0, 3);
  }
}

export const unifiedMarketService = new UnifiedMarketService();
