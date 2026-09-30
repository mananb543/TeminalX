/**
 * TerminalX - Market Data Provider Interface & Contracts
 * Standard abstraction for real-time and historical financial market data feeds.
 */

export interface NormalizedQuote {
  symbol: string;
  name: string;
  exchange: string;
  category: 'INDIAN_EQUITY' | 'GLOBAL_INDEX' | 'INDIAN_INDEX' | 'CURRENCY' | 'COMMODITY';
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  avgVolume?: number | null;
  marketCap?: number | null; // in Crores for Indian equities or USD
  peRatio?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  vwap?: number | null;
  currency: 'INR' | 'USD';
  timestamp: string;
  updatedAt?: string;
  rsi?: number | null;
  sector?: string;
}

export interface OHLCVCandle {
  timestamp: string | number;
  time?: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResultItem {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  lastPrice: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  totalBidQty: number;
  totalAskQty: number;
  spread: number;
  timestamp: string;
}

export interface MarketDataProvider {
  readonly id: 'demo' | 'real';
  readonly name: string;

  getQuote(symbol: string): Promise<NormalizedQuote>;
  getQuotes(symbols: string[]): Promise<NormalizedQuote[]>;
  getHistoricalData(symbol: string, timeframe?: string, range?: string): Promise<OHLCVCandle[]>;
  search(query: string): Promise<SearchResultItem[]>;
  getOrderBook(symbol: string): Promise<OrderBook>;
}

export class MarketProviderError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 500, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'MarketProviderError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
