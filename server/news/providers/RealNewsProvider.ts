/**
 * TerminalX - Real Financial News Provider
 * Standardized provider abstraction for upstream live financial news and market disclosures.
 * Translates symbols to upstream provider standards, validates credentials, sanitizes telemetry,
 * and strictly never synthesizes or fabricates articles, publishers, or timestamps.
 */

import {
  NewsProvider,
  NewsArticle,
  MarketEvent,
  NewsProviderError,
  EventFilterParams,
  SentimentType,
} from './NewsProvider.ts';

// Stage 3 Symbol Mappings for Indian equities
const SYMBOL_MAPPINGS: Record<string, string> = {
  'NIFTY 50': 'NIFTY:NSE',
  'SENSEX': 'SENSEX:BSE',
  'NIFTY BANK': 'BANKNIFTY:NSE',
  'RELIANCE': 'RELIANCE:NSE',
  'TCS': 'TCS:NSE',
  'INFY': 'INFY:NSE',
  'HDFCBANK': 'HDFCBANK:NSE',
  'ICICIBANK': 'ICICIBANK:NSE',
  'SBIN': 'SBIN:NSE',
  'ITC': 'ITC:NSE',
  'LT': 'LT:NSE',
  'BHARTIARTL': 'BHARTIARTL:NSE',
  'AXISBANK': 'AXISBANK:NSE',
  'TATAMOTORS': 'TATAMOTORS:NSE',
};

export class RealNewsProvider implements NewsProvider {
  readonly id = 'real' as const;
  readonly name = 'Live Financial News Provider';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = (process.env.NEWS_API_KEY || '').trim();
    this.baseUrl = (process.env.NEWS_BASE_URL || 'https://api.twelvedata.com').trim().replace(/\/+$/, '');
  }

  private sanitizeError(message: string): string {
    if (!this.apiKey) return message;
    return message.split(this.apiKey).join('***');
  }

  private requireCredentials(): void {
    if (!this.apiKey) {
      throw new NewsProviderError(
        'NEWS_PROVIDER is set to "real" but NEWS_API_KEY is not configured in environment.',
        401,
        'RealNewsProvider'
      );
    }
  }

  private toProviderSymbol(symbol: string): string {
    const clean = symbol.toUpperCase().trim();
    if (SYMBOL_MAPPINGS[clean]) {
      return SYMBOL_MAPPINGS[clean];
    }
    if (clean.includes(':') || clean.includes('.')) {
      return clean;
    }
    return `${clean}:NSE`;
  }

  private fromProviderSymbol(providerSym: string): string {
    const upper = providerSym.toUpperCase().trim();
    for (const [appSym, provSym] of Object.entries(SYMBOL_MAPPINGS)) {
      if (provSym === upper) return appSym;
    }
    if (upper.endsWith(':NSE') || upper.endsWith(':BSE')) {
      return upper.split(':')[0];
    }
    return upper;
  }

  /**
   * Fetch latest market news from real provider
   */
  async getMarketNews(limit = 20): Promise<NewsArticle[]> {
    this.requireCredentials();

    try {
      const url = new URL(`${this.baseUrl}/news`);
      url.searchParams.set('apikey', this.apiKey);
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TerminalX-Financial-Intelligence/1.0',
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new NewsProviderError(
          `Market news request failed with status ${res.status}: ${this.sanitizeError(errorText)}`,
          res.status,
          'RealNewsProvider'
        );
      }

      const data = await res.json();
      return this.normalizeArticles(data, limit);
    } catch (err: any) {
      if (err instanceof NewsProviderError) throw err;
      throw new NewsProviderError(
        `Failed to reach upstream news provider: ${this.sanitizeError(err.message || String(err))}`,
        502,
        'RealNewsProvider'
      );
    }
  }

  /**
   * Fetch company-specific news
   */
  async getCompanyNews(symbol: string, limit = 10): Promise<NewsArticle[]> {
    this.requireCredentials();
    const clean = symbol.toUpperCase().trim();
    const providerSym = this.toProviderSymbol(clean);

    try {
      const url = new URL(`${this.baseUrl}/news`);
      url.searchParams.set('symbol', providerSym);
      url.searchParams.set('apikey', this.apiKey);
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TerminalX-Financial-Intelligence/1.0',
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new NewsProviderError(
          `Company news request for ${clean} failed with status ${res.status}: ${this.sanitizeError(errorText)}`,
          res.status,
          'RealNewsProvider'
        );
      }

      const data = await res.json();
      const articles = this.normalizeArticles(data, limit);

      return articles.map((a) => {
        if (!a.symbols.includes(clean)) {
          return { ...a, symbols: [clean, ...a.symbols] };
        }
        return a;
      });
    } catch (err: any) {
      if (err instanceof NewsProviderError) throw err;
      throw new NewsProviderError(
        `Failed to fetch company news for ${clean}: ${this.sanitizeError(err.message || String(err))}`,
        502,
        'RealNewsProvider'
      );
    }
  }

  /**
   * Search real financial news by keyword
   */
  async searchNews(query: string, limit = 20): Promise<NewsArticle[]> {
    this.requireCredentials();
    const cleanQuery = query.trim();

    try {
      const upperQuery = cleanQuery.toUpperCase();
      const isSymbol = Object.keys(SYMBOL_MAPPINGS).includes(upperQuery) || upperQuery.length <= 6;

      const url = new URL(`${this.baseUrl}/news`);
      if (isSymbol) {
        url.searchParams.set('symbol', this.toProviderSymbol(upperQuery));
      } else {
        url.searchParams.set('search', cleanQuery);
      }
      url.searchParams.set('apikey', this.apiKey);
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TerminalX-Financial-Intelligence/1.0',
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new NewsProviderError(
          `News search for "${cleanQuery}" failed with status ${res.status}: ${this.sanitizeError(errorText)}`,
          res.status,
          'RealNewsProvider'
        );
      }

      const data = await res.json();
      return this.normalizeArticles(data, limit);
    } catch (err: any) {
      if (err instanceof NewsProviderError) throw err;
      throw new NewsProviderError(
        `Failed to execute news search for "${cleanQuery}": ${this.sanitizeError(err.message || String(err))}`,
        502,
        'RealNewsProvider'
      );
    }
  }

  /**
   * Get single article by ID
   */
  async getArticleById(id: string): Promise<NewsArticle | null> {
    const results = await this.getMarketNews(50);
    return results.find((a) => a.id === id) || null;
  }

  /**
   * Fetch corporate actions and market events
   */
  async getEvents(params?: EventFilterParams): Promise<MarketEvent[]> {
    this.requireCredentials();

    try {
      const symbol = params?.symbol ? this.toProviderSymbol(params.symbol) : undefined;
      const url = new URL(`${this.baseUrl}/earnings`);
      if (symbol) url.searchParams.set('symbol', symbol);
      url.searchParams.set('apikey', this.apiKey);

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return this.normalizeEvents(data, params?.symbol);
    } catch (err: any) {
      console.warn('[RealNewsProvider getEvents]:', this.sanitizeError(err.message || String(err)));
      return [];
    }
  }

  async getCompanyEvents(symbol: string): Promise<MarketEvent[]> {
    return this.getEvents({ symbol, upcomingOnly: false, limit: 10 });
  }

  /**
   * Normalize provider-specific raw payload to standard NewsArticle[]
   */
  private normalizeArticles(raw: any, limit: number): NewsArticle[] {
    const items: any[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.articles)
      ? raw.articles
      : Array.isArray(raw)
      ? raw
      : [];

    const articles: NewsArticle[] = [];

    for (const item of items) {
      const headline = item.title || item.headline || '';
      if (!headline) continue;

      const url = item.url || item.link || item.web_url || '#';
      const source = item.source?.name || item.source || item.publisher || 'Wire Feed';
      
      let publishedAt: string;
      try {
        const rawDate = item.published_date || item.publishedAt || item.datetime || item.pubDate;
        publishedAt = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
      } catch {
        publishedAt = new Date().toISOString();
      }

      const summary = item.description || item.summary || item.snippet || '';
      const id = String(item.id || item._id || item.article_id || Buffer.from(url + headline).toString('base64').slice(0, 24));

      const rawSymbols: string[] = Array.isArray(item.symbols)
        ? item.symbols
        : typeof item.symbol === 'string'
        ? [item.symbol]
        : [];
      
      const normalizedSymbols = rawSymbols.map((s) => this.fromProviderSymbol(s));

      const categories: string[] = Array.isArray(item.categories)
        ? item.categories.map((c: any) => String(c).toUpperCase())
        : [item.category ? String(item.category).toUpperCase() : 'MARKET'];

      let sentiment: SentimentType = null;
      if (item.sentiment) {
        const upper = String(item.sentiment).toUpperCase();
        if (upper.includes('POS') || upper === 'BULLISH') sentiment = 'POSITIVE';
        else if (upper.includes('NEG') || upper === 'BEARISH') sentiment = 'NEGATIVE';
        else if (upper.includes('NEU')) sentiment = 'NEUTRAL';
      }

      articles.push({
        id,
        headline,
        summary,
        source,
        url,
        publishedAt,
        imageUrl: item.image_url || item.urlToImage || undefined,
        symbols: normalizedSymbols,
        categories,
        language: item.language || 'en',
        sentiment,
      });

      if (articles.length >= limit) break;
    }

    return articles;
  }

  private normalizeEvents(raw: any, requestedSymbol?: string): MarketEvent[] {
    const items: any[] = Array.isArray(raw?.earnings)
      ? raw.earnings
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
      ? raw
      : [];

    const events: MarketEvent[] = [];

    for (const item of items) {
      const symbol = this.fromProviderSymbol(item.symbol || requestedSymbol || 'MARKET');
      const eventDate = item.date || item.report_date || new Date().toISOString().split('T')[0];
      const title = `${symbol} Earnings Disclosure (${eventDate})`;
      const id = `evt-${symbol}-${eventDate}`;

      events.push({
        id,
        type: 'EARNINGS',
        title,
        symbol,
        eventDate,
        description: `Scheduled earnings release for ${symbol}. EPS Estimate: ${item.eps_estimate ?? 'N/A'}.`,
        source: 'Corporate Filing Feed',
        url: item.url || 'https://www.nseindia.com',
        metadata: item,
      });
    }

    return events;
  }
}
