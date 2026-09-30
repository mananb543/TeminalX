/**
 * TerminalX - Market Data Service Bridge
 * Exports unified market service and provides backward-compatible interfaces.
 */

import { unifiedMarketService, MarketOverviewData, MarketNewsItem } from '../market/marketService.ts';
import { NormalizedQuote, OHLCVCandle, OrderBook } from '../market/providers/MarketDataProvider.ts';

export { unifiedMarketService };
export type { NormalizedQuote as MarketQuote, MarketOverviewData, MarketNewsItem, OHLCVCandle, OrderBook };

// Backward-compatible synchronous fallback map
const FALLBACK_PRICES: Record<string, number> = {
  'NIFTY 50': 24850.25,
  'SENSEX': 81420.10,
  'NIFTY BANK': 51280.40,
  'RELIANCE': 2945.60,
  'TCS': 4180.25,
  'HDFCBANK': 1642.50,
  'INFY': 1890.15,
  'ICICIBANK': 1215.80,
  'TATAMOTORS': 968.40,
  'BHARTIARTL': 1580.30,
  'ITC': 502.75,
  'SBIN': 812.60,
  'LT': 3620.00,
  'AXISBANK': 1195.50,
  'S&P 500': 5780.40,
  'NASDAQ': 18240.80,
  'DOW JONES': 42120.50,
  'USD/INR': 83.72,
  'EUR/INR': 91.45,
  'GOLD': 75420.00,
  'CRUDE OIL': 71.85,
};

export const marketService = {
  /**
   * Synchronous quote fallback
   */
  getQuote(symbol: string): NormalizedQuote {
    const cleanSym = symbol.toUpperCase().trim();
    const price = FALLBACK_PRICES[cleanSym] || 1540.00;
    return {
      symbol: cleanSym,
      name: `${cleanSym} Corp`,
      exchange: 'NSE',
      category: 'INDIAN_EQUITY',
      price,
      previousClose: +(price * 0.99).toFixed(2),
      change: +(price * 0.01).toFixed(2),
      changePercent: 1.00,
      open: +(price * 0.995).toFixed(2),
      high: +(price * 1.01).toFixed(2),
      low: +(price * 0.99).toFixed(2),
      volume: 2500000,
      currency: 'INR',
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async getQuoteAsync(symbol: string): Promise<NormalizedQuote> {
    return unifiedMarketService.getQuote(symbol);
  },

  async getAllQuotes(): Promise<NormalizedQuote[]> {
    return unifiedMarketService.getQuotes();
  },

  async getHistoricalData(symbol: string, timeframe = '1D', range = '1M'): Promise<OHLCVCandle[]> {
    return unifiedMarketService.getHistoricalData(symbol, timeframe, range);
  },

  async getOrderBook(symbol: string): Promise<OrderBook> {
    return unifiedMarketService.getOrderBook(symbol);
  },

  async getMarketOverview(): Promise<MarketOverviewData> {
    return unifiedMarketService.getMarketOverview();
  },

  getNews(symbol?: string): MarketNewsItem[] {
    return unifiedMarketService.getNews(symbol);
  },
};
