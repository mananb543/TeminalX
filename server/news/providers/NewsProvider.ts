/**
 * TerminalX - Financial News Provider Architecture
 * Standardized interfaces, error contracts, and normalized domain models.
 */

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string; // ISO 8601 timestamp
  imageUrl?: string;
  symbols: string[];
  categories: string[];
  language?: string;
  sentiment: SentimentType;
}

export type MarketEventType =
  | 'EARNINGS'
  | 'DIVIDEND'
  | 'STOCK_SPLIT'
  | 'BUYBACK'
  | 'CORPORATE_ACTION'
  | 'ECONOMIC_EVENT'
  | 'MAJOR_INDEX_EVENT';

export interface MarketEvent {
  id: string;
  type: MarketEventType;
  title: string;
  symbol: string;
  eventDate: string; // ISO date string (YYYY-MM-DD)
  description: string;
  source: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface NewsFilterParams {
  limit?: number;
  symbol?: string;
  category?: string;
  from?: string;
  to?: string;
  query?: string;
}

export interface EventFilterParams {
  limit?: number;
  symbol?: string;
  type?: MarketEventType;
  from?: string;
  to?: string;
  upcomingOnly?: boolean;
}

export class NewsProviderError extends Error {
  public statusCode: number;
  public provider: string;

  constructor(message: string, statusCode = 502, provider = 'NewsProvider') {
    super(`[${provider}] ${message}`);
    this.name = 'NewsProviderError';
    this.statusCode = statusCode;
    this.provider = provider;
  }
}

export interface NewsProvider {
  readonly id: 'demo' | 'real';
  readonly name: string;
  getMarketNews(limit?: number): Promise<NewsArticle[]>;
  getCompanyNews(symbol: string, limit?: number): Promise<NewsArticle[]>;
  searchNews(query: string, limit?: number): Promise<NewsArticle[]>;
  getArticleById(id: string): Promise<NewsArticle | null>;
  getEvents?(params?: EventFilterParams): Promise<MarketEvent[]>;
  getCompanyEvents?(symbol: string): Promise<MarketEvent[]>;
}
