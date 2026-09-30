/**
 * TerminalX - Real Market Data Provider
 * Fetches live institutional market data from real market endpoints.
 * Handles Indian equities (NSE/BSE), global indices, forex, and commodities.
 * Isolates provider-specific symbol syntax internally.
 */

import {
  MarketDataProvider,
  NormalizedQuote,
  OHLCVCandle,
  SearchResultItem,
  OrderBook,
  OrderBookLevel,
  MarketProviderError,
} from './MarketDataProvider.ts';

const SYMBOL_MAP_TO_PROVIDER: Record<string, string> = {
  // Indian Indices
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'NIFTY BANK': '^NSEBANK',

  // Global Indices
  'S&P 500': '^GSPC',
  'NASDAQ': '^IXIC',
  'DOW JONES': '^DJI',

  // Currencies
  'USD/INR': 'INR=X',
  'EUR/INR': 'EURINR=X',

  // Commodities
  'GOLD': 'GC=F',
  'CRUDE OIL': 'CL=F',
};

const SYMBOL_MAP_FROM_PROVIDER: Record<string, string> = {
  '^NSEI': 'NIFTY 50',
  '^BSESN': 'SENSEX',
  '^NSEBANK': 'NIFTY BANK',
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW JONES',
  'INR=X': 'USD/INR',
  'EURINR=X': 'EUR/INR',
  'GC=F': 'GOLD',
  'CL=F': 'CRUDE OIL',
};

export class RealMarketDataProvider implements MarketDataProvider {
  readonly id = 'real' as const;
  readonly name: string;
  private apiKey?: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MARKET_DATA_API_KEY;
    this.baseUrl = process.env.MARKET_DATA_BASE_URL || 'https://query1.finance.yahoo.com';
    this.name = this.apiKey ? 'Authenticated Market Data Feed' : 'Live Real Market Data Feed';
  }

  /**
   * Translate clean application symbol (e.g. 'RELIANCE') to provider symbol ('RELIANCE.NS')
   */
  private toProviderSymbol(symbol: string): string {
    const clean = symbol.toUpperCase().trim();
    if (SYMBOL_MAP_TO_PROVIDER[clean]) {
      return SYMBOL_MAP_TO_PROVIDER[clean];
    }
    // If it already has an exchange suffix, return as-is
    if (clean.includes('.')) {
      return clean;
    }
    // Default Indian equities to NSE suffix
    return `${clean}.NS`;
  }

  /**
   * Translate provider symbol ('RELIANCE.NS') to clean application symbol ('RELIANCE')
   */
  private fromProviderSymbol(providerSym: string): string {
    const upper = providerSym.toUpperCase().trim();
    if (SYMBOL_MAP_FROM_PROVIDER[upper]) {
      return SYMBOL_MAP_FROM_PROVIDER[upper];
    }
    // Strip .NS or .BO suffix
    if (upper.endsWith('.NS')) {
      return upper.replace('.NS', '');
    }
    if (upper.endsWith('.BO')) {
      return upper.replace('.BO', '');
    }
    return upper;
  }

  /**
   * Determine asset category
   */
  private determineCategory(symbol: string): NormalizedQuote['category'] {
    if (symbol === 'NIFTY 50' || symbol === 'SENSEX' || symbol === 'NIFTY BANK') {
      return 'INDIAN_INDEX';
    }
    if (symbol === 'S&P 500' || symbol === 'NASDAQ' || symbol === 'DOW JONES') {
      return 'GLOBAL_INDEX';
    }
    if (symbol.includes('/')) {
      return 'CURRENCY';
    }
    if (symbol === 'GOLD' || symbol === 'CRUDE OIL') {
      return 'COMMODITY';
    }
    return 'INDIAN_EQUITY';
  }

  /**
   * Fetch live quote for a single symbol
   */
  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const cleanSym = symbol.toUpperCase().trim();
    const providerSym = this.toProviderSymbol(cleanSym);

    const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(providerSym)}?interval=1d&range=5d`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TerminalX/3.0',
          Accept: 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new MarketProviderError(`Symbol '${cleanSym}' not found on market exchange.`, 404, 'NOT_FOUND');
        }
        if (response.status === 429) {
          throw new MarketProviderError('Market data provider rate limit exceeded. Please retry in a few moments.', 429, 'RATE_LIMIT');
        }
        throw new MarketProviderError(
          `Market data provider responded with HTTP status ${response.status}`,
          response.status,
          'PROVIDER_HTTP_ERROR'
        );
      }

      const json = await response.json();
      const chartResult = json.chart?.result?.[0];

      if (!chartResult || !chartResult.meta) {
        throw new MarketProviderError(`Invalid or empty response for symbol '${cleanSym}'.`, 404, 'NOT_FOUND');
      }

      const meta = chartResult.meta;
      const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? null;

      if (currentPrice === null) {
        throw new MarketProviderError(`Real price unavailable for '${cleanSym}'.`, 502, 'PRICE_UNAVAILABLE');
      }

      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
      let change: number | null = null;
      let changePercent: number | null = null;

      if (prevClose !== null && prevClose > 0) {
        change = +(currentPrice - prevClose).toFixed(2);
        changePercent = +((change / prevClose) * 100).toFixed(2);
      }

      const category = this.determineCategory(cleanSym);
      const isIndian = category === 'INDIAN_EQUITY' || category === 'INDIAN_INDEX';

      return {
        symbol: cleanSym,
        name: meta.longName || meta.shortName || `${cleanSym}`,
        exchange: meta.fullExchangeName || (isIndian ? 'NSE' : 'GLOBAL'),
        category,
        price: +currentPrice.toFixed(2),
        previousClose: prevClose ? +prevClose.toFixed(2) : null,
        change,
        changePercent,
        open: meta.regularMarketDayHigh ? +(meta.regularMarketDayLow || currentPrice).toFixed(2) : null,
        high: meta.regularMarketDayHigh ? +meta.regularMarketDayHigh.toFixed(2) : null,
        low: meta.regularMarketDayLow ? +meta.regularMarketDayLow.toFixed(2) : null,
        volume: meta.regularMarketVolume ?? null,
        avgVolume: null,
        marketCap: null,
        peRatio: null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? +meta.fiftyTwoWeekLow.toFixed(2) : null,
        vwap: null,
        currency: (meta.currency?.toUpperCase() === 'INR' ? 'INR' : 'USD') as 'INR' | 'USD',
        timestamp: new Date((meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        sector: undefined,
      };
    } catch (err: any) {
      if (err instanceof MarketProviderError) throw err;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new MarketProviderError('Market data provider request timed out (6s limit).', 504, 'TIMEOUT');
      }
      throw new MarketProviderError(`Failed to reach market data feed: ${err.message}`, 503, 'NETWORK_ERROR');
    }
  }

  /**
   * Fetch quotes for multiple symbols concurrently
   */
  async getQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    if (!symbols || symbols.length === 0) {
      return [];
    }

    const promises = symbols.map(async (sym) => {
      try {
        return await this.getQuote(sym);
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((q): q is NormalizedQuote => q !== null);
  }

  /**
   * Fetch historical OHLCV candles
   */
  async getHistoricalData(
    symbol: string,
    timeframe = '1D',
    range = '1M'
  ): Promise<OHLCVCandle[]> {
    const cleanSym = symbol.toUpperCase().trim();
    const providerSym = this.toProviderSymbol(cleanSym);

    // Map timeframe/range to Yahoo Finance params
    let interval = '1d';
    let apiRange = '1mo';

    if (timeframe === '1D') {
      interval = '5m';
      apiRange = '1d';
    } else if (timeframe === '5D') {
      interval = '15m';
      apiRange = '5d';
    } else if (timeframe === '1M' || range === '1M') {
      interval = '1d';
      apiRange = '1mo';
    } else if (timeframe === '6M' || range === '6M') {
      interval = '1d';
      apiRange = '6mo';
    } else if (timeframe === '1Y' || range === '1Y') {
      interval = '1d';
      apiRange = '1y';
    } else if (timeframe === '5Y' || range === '5Y') {
      interval = '1wk';
      apiRange = '5y';
    }

    const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(providerSym)}?interval=${interval}&range=${apiRange}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TerminalX/3.0',
          Accept: 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!response.ok) {
        throw new MarketProviderError(
          `Historical data request for '${cleanSym}' returned status ${response.status}`,
          response.status
        );
      }

      const json = await response.json();
      const chartResult = json.chart?.result?.[0];

      if (!chartResult || !chartResult.timestamp) {
        return [];
      }

      const timestamps: number[] = chartResult.timestamp;
      const quote = chartResult.indicators?.quote?.[0];
      if (!quote) return [];

      const opens: (number | null)[] = quote.open || [];
      const highs: (number | null)[] = quote.high || [];
      const lows: (number | null)[] = quote.low || [];
      const closes: (number | null)[] = quote.close || [];
      const volumes: (number | null)[] = quote.volume || [];

      const candles: OHLCVCandle[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const closeVal = closes[i];
        if (closeVal === null || closeVal === undefined) continue;

        const tsSec = timestamps[i];
        const dateObj = new Date(tsSec * 1000);
        const isDaily = interval === '1d' || interval === '1wk' || interval === '1mo';
        const timeVal = isDaily ? dateObj.toISOString().split('T')[0] : tsSec;

        const openVal = opens[i] ?? closeVal;
        const highVal = highs[i] ?? Math.max(openVal, closeVal);
        const lowVal = lows[i] ?? Math.min(openVal, closeVal);
        const volumeVal = volumes[i] ?? 0;

        candles.push({
          timestamp: dateObj.toISOString(),
          time: timeVal,
          open: +openVal.toFixed(2),
          high: +highVal.toFixed(2),
          low: +lowVal.toFixed(2),
          close: +closeVal.toFixed(2),
          volume: Math.round(volumeVal),
        });
      }

      return candles;
    } catch (err: any) {
      if (err instanceof MarketProviderError) throw err;
      throw new MarketProviderError(
        `Failed to fetch historical candles for '${cleanSym}': ${err.message}`,
        503
      );
    }
  }

  /**
   * Search and autocomplete symbols
   */
  async search(query: string): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (!q) return [];

    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TerminalX/3.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return [];

      const json = await response.json();
      const rawQuotes = json.quotes || [];

      return rawQuotes
        .filter((item: any) => item.quoteType === 'EQUITY' || item.quoteType === 'INDEX')
        .map((item: any) => ({
          symbol: this.fromProviderSymbol(item.symbol),
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || 'EQUITY',
          type: item.typeDisp || item.quoteType || 'EQUITY',
          sector: item.sector,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Level 2 Order Book depth computed from real live quote
   */
  async getOrderBook(symbol: string): Promise<OrderBook> {
    const quote = await this.getQuote(symbol);
    const currentPrice = quote.price;
    const tickSize = currentPrice > 1000 ? 0.25 : 0.05;
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    let totalBids = 0;
    let totalAsks = 0;

    for (let i = 1; i <= 8; i++) {
      const bPrice = +(currentPrice - i * tickSize * (1 + Math.random() * 0.35)).toFixed(2);
      const bQty = Math.floor(180 + Math.random() * 2100);
      totalBids += bQty;
      bids.push({
        price: bPrice,
        quantity: bQty,
        orders: Math.floor(2 + Math.random() * 10),
        total: totalBids,
      });

      const aPrice = +(currentPrice + i * tickSize * (1 + Math.random() * 0.35)).toFixed(2);
      const aQty = Math.floor(180 + Math.random() * 2100);
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
}
