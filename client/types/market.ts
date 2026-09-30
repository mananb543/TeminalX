export type MarketCategory = 'INDIAN_EQUITY' | 'GLOBAL_INDEX' | 'INDIAN_INDEX' | 'CURRENCY' | 'COMMODITY';
export type ExchangeType = 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'MCX' | 'FOREX';
export type TimeframeOption = '1D' | '5D' | '1M' | '6M' | '1Y' | '5Y';

export interface MarketQuote {
  symbol: string;
  name: string;
  exchange: ExchangeType;
  category: MarketCategory;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
  peRatio?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  vwap: number;
  currency: 'INR' | 'USD';
  updatedAt: string;
  rsi?: number;
  sector?: string;
}

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
