/**
 * TerminalX - Client Market Service
 * Connects to backend market data endpoints with automatic fallback,
 * caching, and live reactive updates for Indian & global equities.
 */

import { MarketQuote, CandleData, OrderBook, MarketNewsItem, MarketCategory } from '../types/market.ts';

const MASTER_CATALOGUE: Record<string, MarketQuote> = {
  // Indian Indices
  'NIFTY 50': {
    symbol: 'NIFTY 50',
    name: 'NIFTY 50 Index',
    exchange: 'NSE',
    category: 'INDIAN_INDEX',
    price: 24850.25,
    change: 152.80,
    changePercent: 0.62,
    open: 24720.10,
    high: 24890.50,
    low: 24690.30,
    previousClose: 24697.45,
    volume: 382400000,
    avgVolume: 350000000,
    fiftyTwoWeekHigh: 26277.35,
    fiftyTwoWeekLow: 18837.85,
    vwap: 24810.15,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 58.4,
    sector: 'Benchmark Index',
  },
  'SENSEX': {
    symbol: 'SENSEX',
    name: 'BSE SENSEX 30',
    exchange: 'BSE',
    category: 'INDIAN_INDEX',
    price: 81420.10,
    change: 448.20,
    changePercent: 0.55,
    open: 81050.40,
    high: 81590.20,
    low: 80940.10,
    previousClose: 80971.90,
    volume: 41200000,
    avgVolume: 39000000,
    fiftyTwoWeekHigh: 85978.25,
    fiftyTwoWeekLow: 63183.70,
    vwap: 81350.00,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 56.1,
    sector: 'Benchmark Index',
  },
  'NIFTY BANK': {
    symbol: 'NIFTY BANK',
    name: 'Nifty Bank Index',
    exchange: 'NSE',
    category: 'INDIAN_INDEX',
    price: 51280.40,
    change: 320.15,
    changePercent: 0.63,
    open: 51010.00,
    high: 51450.80,
    low: 50920.30,
    previousClose: 50960.25,
    volume: 184500000,
    avgVolume: 175000000,
    fiftyTwoWeekHigh: 54467.35,
    fiftyTwoWeekLow: 42105.40,
    vwap: 51220.00,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 61.2,
    sector: 'Banking & Financials',
  },

  // Global Indices
  'S&P 500': {
    symbol: 'S&P 500',
    name: 'S&P 500 Index',
    exchange: 'NYSE',
    category: 'GLOBAL_INDEX',
    price: 5780.40,
    change: 21.80,
    changePercent: 0.38,
    open: 5762.10,
    high: 5792.50,
    low: 5755.30,
    previousClose: 5758.60,
    volume: 2450000000,
    avgVolume: 2300000000,
    fiftyTwoWeekHigh: 5878.46,
    fiftyTwoWeekLow: 4103.78,
    vwap: 5775.20,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
    rsi: 64.8,
    sector: 'US Broad Market',
  },
  'NASDAQ': {
    symbol: 'NASDAQ',
    name: 'Nasdaq Composite',
    exchange: 'NASDAQ',
    category: 'GLOBAL_INDEX',
    price: 18240.80,
    change: 130.40,
    changePercent: 0.72,
    open: 18120.00,
    high: 18295.50,
    low: 18105.10,
    previousClose: 18110.40,
    volume: 3890000000,
    avgVolume: 3600000000,
    fiftyTwoWeekHigh: 18671.07,
    fiftyTwoWeekLow: 12543.86,
    vwap: 18210.00,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
    rsi: 67.2,
    sector: 'Technology Mega-Cap',
  },
  'DOW JONES': {
    symbol: 'DOW JONES',
    name: 'Dow Jones Industrial Average',
    exchange: 'NYSE',
    category: 'GLOBAL_INDEX',
    price: 42120.50,
    change: 85.20,
    changePercent: 0.20,
    open: 42050.10,
    high: 42200.40,
    low: 42010.30,
    previousClose: 42035.30,
    volume: 340000000,
    avgVolume: 320000000,
    fiftyTwoWeekHigh: 43325.09,
    fiftyTwoWeekLow: 32417.59,
    vwap: 42095.00,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
    rsi: 54.9,
    sector: 'US Industrial',
  },

  // Currencies
  'USD/INR': {
    symbol: 'USD/INR',
    name: 'US Dollar / Indian Rupee',
    exchange: 'FOREX',
    category: 'CURRENCY',
    price: 83.72,
    change: -0.10,
    changePercent: -0.12,
    open: 83.82,
    high: 83.88,
    low: 83.69,
    previousClose: 83.82,
    volume: 1240000000,
    avgVolume: 1100000000,
    fiftyTwoWeekHigh: 84.15,
    fiftyTwoWeekLow: 82.78,
    vwap: 83.75,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 48.5,
    sector: 'Foreign Exchange',
  },
  'EUR/INR': {
    symbol: 'EUR/INR',
    name: 'Euro / Indian Rupee',
    exchange: 'FOREX',
    category: 'CURRENCY',
    price: 91.45,
    change: 0.18,
    changePercent: 0.20,
    open: 91.27,
    high: 91.60,
    low: 91.20,
    previousClose: 91.27,
    volume: 680000000,
    avgVolume: 640000000,
    fiftyTwoWeekHigh: 93.40,
    fiftyTwoWeekLow: 87.20,
    vwap: 91.38,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 52.3,
    sector: 'Foreign Exchange',
  },

  // Commodities
  'GOLD': {
    symbol: 'GOLD',
    name: 'Gold (10 Grams 24K)',
    exchange: 'MCX',
    category: 'COMMODITY',
    price: 75420.00,
    change: 410.00,
    changePercent: 0.55,
    open: 75050.00,
    high: 75600.00,
    low: 74980.00,
    previousClose: 75010.00,
    volume: 48500,
    avgVolume: 42000,
    fiftyTwoWeekHigh: 76800.00,
    fiftyTwoWeekLow: 56900.00,
    vwap: 75350.00,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 63.7,
    sector: 'Precious Metals',
  },
  'CRUDE OIL': {
    symbol: 'CRUDE OIL',
    name: 'Brent Crude Oil (bbl)',
    exchange: 'MCX',
    category: 'COMMODITY',
    price: 71.85,
    change: -1.25,
    changePercent: -1.71,
    open: 73.10,
    high: 73.40,
    low: 71.40,
    previousClose: 73.10,
    volume: 125000,
    avgVolume: 110000,
    fiftyTwoWeekHigh: 92.40,
    fiftyTwoWeekLow: 68.50,
    vwap: 72.20,
    currency: 'USD',
    updatedAt: new Date().toISOString(),
    rsi: 41.2,
    sector: 'Energy',
  },

  // Indian Equities
  'RELIANCE': {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 2945.60,
    change: 28.40,
    changePercent: 0.97,
    open: 2920.00,
    high: 2962.00,
    low: 2915.10,
    previousClose: 2917.20,
    volume: 5820400,
    avgVolume: 6100000,
    marketCap: 1993200,
    peRatio: 28.4,
    fiftyTwoWeekHigh: 3217.90,
    fiftyTwoWeekLow: 2221.05,
    vwap: 2938.45,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 57.8,
    sector: 'Energy & Retail',
  },
  'TCS': {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 4180.25,
    change: -15.50,
    changePercent: -0.37,
    open: 4200.00,
    high: 4215.00,
    low: 4165.20,
    previousClose: 4195.75,
    volume: 1840200,
    avgVolume: 2100000,
    marketCap: 1512400,
    peRatio: 31.8,
    fiftyTwoWeekHigh: 4592.25,
    fiftyTwoWeekLow: 3311.00,
    vwap: 4186.10,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 49.3,
    sector: 'Information Technology',
  },
  'HDFCBANK': {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 1642.50,
    change: 14.80,
    changePercent: 0.91,
    open: 1630.00,
    high: 1650.00,
    low: 1627.10,
    previousClose: 1627.70,
    volume: 14200500,
    avgVolume: 15800000,
    marketCap: 1251300,
    peRatio: 18.6,
    fiftyTwoWeekHigh: 1794.00,
    fiftyTwoWeekLow: 1363.45,
    vwap: 1639.20,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 59.2,
    sector: 'Banking & Financials',
  },
  'INFY': {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 1890.15,
    change: 22.35,
    changePercent: 1.20,
    open: 1872.00,
    high: 1904.50,
    low: 1868.00,
    previousClose: 1867.80,
    volume: 6420100,
    avgVolume: 6800000,
    marketCap: 785400,
    peRatio: 29.5,
    fiftyTwoWeekHigh: 1991.45,
    fiftyTwoWeekLow: 1358.35,
    vwap: 1884.90,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 62.4,
    sector: 'Information Technology',
  },
  'ICICIBANK': {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 1215.80,
    change: 8.60,
    changePercent: 0.71,
    open: 1209.00,
    high: 1222.00,
    low: 1205.50,
    previousClose: 1207.20,
    volume: 11200400,
    avgVolume: 12000000,
    marketCap: 856200,
    peRatio: 17.8,
    fiftyTwoWeekHigh: 1332.90,
    fiftyTwoWeekLow: 913.65,
    vwap: 1213.50,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 58.0,
    sector: 'Banking & Financials',
  },
  'TATAMOTORS': {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 968.40,
    change: -12.10,
    changePercent: -1.23,
    open: 982.00,
    high: 986.50,
    low: 962.00,
    previousClose: 980.50,
    volume: 8940000,
    avgVolume: 9500000,
    marketCap: 356400,
    peRatio: 10.4,
    fiftyTwoWeekHigh: 1179.05,
    fiftyTwoWeekLow: 615.10,
    vwap: 971.80,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 42.6,
    sector: 'Automotive',
  },
  'BHARTIARTL': {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 1580.30,
    change: 18.70,
    changePercent: 1.20,
    open: 1565.00,
    high: 1588.00,
    low: 1561.20,
    previousClose: 1561.60,
    volume: 4890000,
    avgVolume: 5200000,
    marketCap: 897400,
    peRatio: 72.1,
    fiftyTwoWeekHigh: 1779.00,
    fiftyTwoWeekLow: 902.50,
    vwap: 1576.20,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 65.5,
    sector: 'Telecommunications',
  },
  'ITC': {
    symbol: 'ITC',
    name: 'ITC Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 502.75,
    change: 3.25,
    changePercent: 0.65,
    open: 500.00,
    high: 505.40,
    low: 498.90,
    previousClose: 499.50,
    volume: 9800000,
    avgVolume: 10500000,
    marketCap: 627100,
    peRatio: 28.1,
    fiftyTwoWeekHigh: 528.55,
    fiftyTwoWeekLow: 399.30,
    vwap: 502.10,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 54.3,
    sector: 'Consumer Goods',
  },
  'SBIN': {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 812.60,
    change: 6.40,
    changePercent: 0.79,
    open: 808.00,
    high: 817.50,
    low: 806.20,
    previousClose: 806.20,
    volume: 16500000,
    avgVolume: 18000000,
    marketCap: 725400,
    peRatio: 10.8,
    fiftyTwoWeekHigh: 912.00,
    fiftyTwoWeekLow: 555.25,
    vwap: 811.90,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 53.7,
    sector: 'Public Sector Banking',
  },
  'LT': {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 3620.00,
    change: 34.50,
    changePercent: 0.96,
    open: 3590.00,
    high: 3640.00,
    low: 3582.00,
    previousClose: 3585.50,
    volume: 2150000,
    avgVolume: 2400000,
    marketCap: 498100,
    peRatio: 33.2,
    fiftyTwoWeekHigh: 3948.60,
    fiftyTwoWeekLow: 2962.30,
    vwap: 3612.00,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 56.4,
    sector: 'Engineering & Construction',
  },
  'AXISBANK': {
    symbol: 'AXISBANK',
    name: 'Axis Bank Ltd.',
    exchange: 'NSE',
    category: 'INDIAN_EQUITY',
    price: 1195.50,
    change: 11.30,
    changePercent: 0.95,
    open: 1188.00,
    high: 1202.00,
    low: 1182.50,
    previousClose: 1184.20,
    volume: 5400000,
    avgVolume: 5800000,
    marketCap: 368000,
    peRatio: 14.2,
    fiftyTwoWeekHigh: 1339.65,
    fiftyTwoWeekLow: 975.00,
    vwap: 1192.30,
    currency: 'INR',
    updatedAt: new Date().toISOString(),
    rsi: 55.2,
    sector: 'Banking & Financials',
  },
};

class ClientMarketService {
  private cache: Map<string, MarketQuote> = new Map();
  private subscribers: Set<() => void> = new Set();
  private activeProvider: 'demo' | 'real' = 'demo';
  private providerName = 'TerminalX Simulated Feed';

  constructor() {
    // Pre-populate with baseline catalogue
    for (const [k, v] of Object.entries(MASTER_CATALOGUE)) {
      this.cache.set(k, { ...v });
    }
    // Background load from backend API
    this.refreshFromBackend();
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch {
        // non-fatal
      }
    });
  }

  public async refreshFromBackend(): Promise<void> {
    try {
      const res = await fetch('/api/markets/quotes');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          for (const q of json.data) {
            this.cache.set(q.symbol, q);
          }
          if (json.provider) {
            this.activeProvider = json.provider;
          }
          this.notify();
        }
      }
    } catch {
      // Keep existing cache if offline
    }
  }

  public getProviderStatus(): { provider: 'demo' | 'real'; name: string } {
    return {
      provider: this.activeProvider,
      name: this.providerName,
    };
  }

  public getQuote(symbol: string): MarketQuote {
    const clean = symbol.toUpperCase().trim();
    const cached = this.cache.get(clean);
    if (cached) return cached;

    const fallback: MarketQuote = {
      symbol: clean,
      name: `${clean} Industries`,
      exchange: 'NSE',
      category: 'INDIAN_EQUITY',
      price: 1520.00,
      change: 8.50,
      changePercent: 0.56,
      open: 1515.00,
      high: 1532.00,
      low: 1510.00,
      previousClose: 1511.50,
      volume: 2100000,
      avgVolume: 2300000,
      fiftyTwoWeekHigh: 1800.00,
      fiftyTwoWeekLow: 1100.00,
      vwap: 1522.00,
      currency: 'INR',
      updatedAt: new Date().toISOString(),
      rsi: 52.0,
      sector: 'Diversified',
    };
    this.cache.set(clean, fallback);
    return fallback;
  }

  public getAllQuotes(): MarketQuote[] {
    return Array.from(this.cache.values());
  }

  public getQuotesByCategory(category: MarketCategory): MarketQuote[] {
    return this.getAllQuotes().filter((q) => q.category === category);
  }

  public searchQuotes(query: string): MarketQuote[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllQuotes();
    return this.getAllQuotes().filter(
      (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }

  // --- ASYNC API CLIENT METHODS ---

  public async fetchQuote(symbol: string): Promise<MarketQuote> {
    const clean = symbol.toUpperCase().trim();
    try {
      const res = await fetch(`/api/markets/quote/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.cache.set(clean, json.data);
          this.notify();
          return json.data;
        }
      }
      throw new Error(`Quote for ${clean} unavailable.`);
    } catch (err: any) {
      // Return cached fallback if available
      const cached = this.cache.get(clean);
      if (cached) return cached;
      throw err;
    }
  }

  public async fetchQuotes(symbols?: string[]): Promise<MarketQuote[]> {
    try {
      const query = symbols && symbols.length > 0 ? `?symbols=${symbols.join(',')}` : '';
      const res = await fetch(`/api/markets/quotes${query}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          for (const q of json.data) {
            this.cache.set(q.symbol, q);
          }
          this.notify();
          return json.data;
        }
      }
    } catch {
      // return local
    }
    return symbols ? symbols.map((s) => this.getQuote(s)) : this.getAllQuotes();
  }

  public async fetchHistoricalCandles(
    symbol: string,
    timeframe = '1D',
    range = '1M'
  ): Promise<CandleData[]> {
    try {
      const clean = symbol.toUpperCase().trim();
      const res = await fetch(
        `/api/markets/history/${encodeURIComponent(clean)}?timeframe=${timeframe}&range=${range}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map((c: any) => ({
            time: c.time || c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }));
        }
      }
    } catch {
      // fallback
    }
    return this.getHistoricalCandles(symbol, timeframe);
  }

  public async fetchSearch(query: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/markets/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // fallback
    }
    return this.searchQuotes(query);
  }

  public async fetchOrderBook(symbol: string): Promise<OrderBook> {
    try {
      const res = await fetch(`/api/markets/orderbook/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {
      // fallback
    }
    return this.getOrderBook(symbol);
  }

  public getHistoricalCandles(symbol: string, timeframe = '1D'): CandleData[] {
    const quote = this.getQuote(symbol);
    const basePrice = quote.price;
    const count = 90;
    const candles: CandleData[] = [];
    const now = Date.now();

    let stepMinutes = 15;
    if (timeframe === '1D') stepMinutes = 5;
    else if (timeframe === '5D') stepMinutes = 30;
    else if (timeframe === '1M') stepMinutes = 24 * 60;
    else if (timeframe === '6M') stepMinutes = 24 * 60;
    else if (timeframe === '1Y') stepMinutes = 24 * 60;
    else if (timeframe === '5Y') stepMinutes = 7 * 24 * 60;

    let currentPrice = basePrice * 0.94;
    const volatility = basePrice * 0.007;

    for (let i = count; i >= 0; i--) {
      const candleDate = new Date(now - i * stepMinutes * 60 * 1000);
      const isDaily = stepMinutes >= 1440;
      const timeVal = isDaily
        ? candleDate.toISOString().split('T')[0]
        : Math.floor(candleDate.getTime() / 1000);

      const delta = (Math.random() - 0.48) * volatility;
      const open = currentPrice;
      const close = Math.max(1, +(open + delta).toFixed(2));
      const high = +(Math.max(open, close) + Math.random() * volatility * 0.6).toFixed(2);
      const low = +(Math.min(open, close) - Math.random() * volatility * 0.6).toFixed(2);
      const volume = Math.floor(8000 + Math.random() * 65000);

      candles.push({
        time: timeVal,
        open: +open.toFixed(2),
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }

    if (candles.length > 0) {
      candles[candles.length - 1].close = basePrice;
      candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, basePrice);
      candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, basePrice);
    }

    return candles;
  }

  public getOrderBook(symbol: string): OrderBook {
    const quote = this.getQuote(symbol);
    const currentPrice = quote.price;
    const tickSize = currentPrice > 1000 ? 0.25 : 0.05;
    const bids = [];
    const asks = [];

    let totalBids = 0;
    let totalAsks = 0;

    for (let i = 1; i <= 6; i++) {
      const bPrice = +(currentPrice - i * tickSize * (1 + Math.random() * 0.4)).toFixed(2);
      const bQty = Math.floor(200 + Math.random() * 2200);
      totalBids += bQty;
      bids.push({
        price: bPrice,
        quantity: bQty,
        orders: Math.floor(2 + Math.random() * 10),
        total: totalBids,
      });

      const aPrice = +(currentPrice + i * tickSize * (1 + Math.random() * 0.4)).toFixed(2);
      const aQty = Math.floor(200 + Math.random() * 2200);
      totalAsks += aQty;
      asks.push({
        price: aPrice,
        quantity: aQty,
        orders: Math.floor(2 + Math.random() * 10),
        total: totalAsks,
      });
    }

    return {
      symbol: quote.symbol,
      lastPrice: currentPrice,
      bids,
      asks,
      totalBidQty: totalBids,
      totalAskQty: totalAsks,
      spread: +(asks[0].price - bids[0].price).toFixed(2),
      timestamp: new Date().toISOString(),
    };
  }

  public getMarketOverview() {
    return {
      indianIndices: [
        this.getQuote('NIFTY 50'),
        this.getQuote('SENSEX'),
        this.getQuote('NIFTY BANK'),
      ],
      globalIndices: [
        this.getQuote('S&P 500'),
        this.getQuote('NASDAQ'),
        this.getQuote('DOW JONES'),
      ],
      currencies: [
        this.getQuote('USD/INR'),
        this.getQuote('EUR/INR'),
      ],
      commodities: [
        this.getQuote('GOLD'),
        this.getQuote('CRUDE OIL'),
      ],
      topEquities: this.getAllQuotes().filter((q) => q.category === 'INDIAN_EQUITY'),
    };
  }

  public getNews(symbol?: string): MarketNewsItem[] {
    const news: MarketNewsItem[] = [
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
        summary: 'RIL subsidiary plans multi-tier dark warehouse hubs leveraging state-of-the-art automated sorting, aiming for sub-15 minute fulfillment across tier-1 metros.',
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

    if (!symbol) return news;
    const clean = symbol.toUpperCase().trim();
    const filtered = news.filter((item) => item.symbols.includes(clean));
    return filtered.length > 0 ? filtered : news.slice(0, 3);
  }
}

export const clientMarketService = new ClientMarketService();
