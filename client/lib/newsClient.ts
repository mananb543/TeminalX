/**
 * TerminalX - Client Financial News & Event Intelligence Client
 * Provides typed methods for market wire, company feeds, portfolio news, and event calendar.
 */

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string; // ISO 8601 string
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
  eventDate: string;
  description: string;
  source: string;
  url: string;
  metadata?: Record<string, any>;
}

class NewsClient {
  private getAuthHeaders(): HeadersInit {
    const token =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('terminalx_token') || localStorage.getItem('terminalx_token')
        : null;

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Fetch broad market news
   */
  async getMarketNews(limit = 20, category?: string): Promise<NewsArticle[]> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (category && category !== 'ALL') {
      params.set('category', category);
    }

    const res = await fetch(`/api/news?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch market news (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Fetch news specifically relevant to user's portfolio holdings
   */
  async getPortfolioNews(limit = 20): Promise<NewsArticle[]> {
    const res = await fetch(`/api/news/portfolio?limit=${limit}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch portfolio news (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Search news wire
   */
  async searchNews(query: string, limit = 20): Promise<NewsArticle[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('limit', String(limit));

    const res = await fetch(`/api/news/search?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to search news (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Fetch company specific news
   */
  async getCompanyNews(symbol: string, limit = 15): Promise<NewsArticle[]> {
    const clean = encodeURIComponent(symbol.trim().toUpperCase());
    const res = await fetch(`/api/news/symbol/${clean}?limit=${limit}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch news for ${symbol}`);
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Get article detail by ID
   */
  async getArticleById(id: string): Promise<NewsArticle> {
    const cleanId = encodeURIComponent(id.trim());
    const res = await fetch(`/api/news/${cleanId}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Article not found (${res.status})`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch market events / corporate actions
   */
  async getUpcomingEvents(limit = 20): Promise<MarketEvent[]> {
    const res = await fetch(`/api/events/upcoming?limit=${limit}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch events');
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Fetch events matching user's portfolio holdings
   */
  async getPortfolioEvents(): Promise<MarketEvent[]> {
    const res = await fetch(`/api/events/portfolio`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch portfolio corporate events');
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Fetch events for a specific symbol
   */
  async getCompanyEvents(symbol: string): Promise<MarketEvent[]> {
    const clean = encodeURIComponent(symbol.trim().toUpperCase());
    const res = await fetch(`/api/events/symbol/${clean}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch events for ${symbol}`);
    }

    const json = await res.json();
    return json.data || [];
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<{ mode: 'demo' | 'real'; providerName: string }> {
    const res = await fetch('/api/news/provider', {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return { mode: 'demo', providerName: 'TerminalX Institutional Wire' };
    }

    const json = await res.json();
    return {
      mode: json.mode || 'demo',
      providerName: json.providerName || 'TerminalX Institutional Wire',
    };
  }
}

export const newsClient = new NewsClient();
