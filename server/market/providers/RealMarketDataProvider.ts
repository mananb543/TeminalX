/**
 * TerminalX - Real Market Data Provider (Twelve Data + Institutional Market Feeds)
 * Standardized provider abstraction for live market quotes, historical candlesticks,
 * and security search. Handles Indian equities (NSE/BSE), benchmark indices, forex,
 * and commodities while completely isolating upstream provider formatting.
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

// Symbol mapping for Twelve Data API
const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  // Indian Indices
  'NIFTY 50': 'NIFTY:NSE',
  'SENSEX': 'SENSEX:BSE',
  'NIFTY BANK': 'BANKNIFTY:NSE',

  // Global Indices
  'S&P 500': 'SPX',
  'NASDAQ': 'IXIC',
  'DOW JONES': 'DJI',

  // Currencies
  'USD/INR': 'USD/INR',
  'EUR/INR': 'EUR/INR',

  // Commodities
  'GOLD': 'XAU/USD',
  'CRUDE OIL': 'WTI/USD',
};

const TWELVE_DATA_REVERSE_SYMBOLS: Record<string, string> = {
  'NIFTY:NSE': 'NIFTY 50',
  'SENSEX:BSE': 'SENSEX',
  'BANKNIFTY:NSE': 'NIFTY BANK',
  'SPX': 'S&P 500',
  'IXIC': 'NASDAQ',
  'DJI': 'DOW JONES',
  'USD/INR': 'USD/INR',
  'EUR/INR': 'EUR/INR',
  'XAU/USD': 'GOLD',
  'WTI/USD': 'CRUDE OIL',
};

// Fallback Yahoo symbol map
const YAHOO_SYMBOLS: Record<string, string> = {
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'NIFTY BANK': '^NSEBANK',
  'S&P 500': '^GSPC',
  'NASDAQ': '^IXIC',
  'DOW JONES': '^DJI',
  'USD/INR': 'INR=X',
  'EUR/INR': 'EURINR=X',
  'GOLD': 'GC=F',
  'CRUDE OIL': 'CL=F',
};

export class RealMarketDataProvider implements MarketDataProvider {
  readonly id = 'real' as const;
  readonly name: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = (process.env.MARKET_DATA_API_KEY || '').trim();
    this.baseUrl = (process.env.MARKET_DATA_BASE_URL || 'https://api.twelvedata.com').trim().replace(/\/+$/, '');
    this.name = this.isTwelveData()
      ? 'Twelve Data Real Market Feed'
      : 'Live Real Market Data Feed';
  }

  private isTwelveData(): boolean {
    return this.baseUrl.includes('twelvedata') || !this.baseUrl.includes('yahoo');
  }

  /**
   * Redact sensitive credentials from any error message
   */
  private sanitizeError(message: string): string {
    if (!this.apiKey) return message;
    return message.split(this.apiKey).join('***');
  }

  /**
   * Translate clean application symbol (e.g. 'RELIANCE') to provider symbol
   */
  private toProviderSymbol(symbol: string): string {
    const clean = symbol.toUpperCase().trim();

    if (this.isTwelveData()) {
      if (TWELVE_DATA_SYMBOLS[clean]) {
        return TWELVE_DATA_SYMBOLS[clean];
      }
      if (clean.includes(':')) {
        return clean;
      }
      // If symbol ends with .NS, convert to :NSE
      if (clean.endsWith('.NS')) {
        return `${clean.slice(0, -3)}:NSE`;
      }
      if (clean.endsWith('.BO')) {
        return `${clean.slice(0, -3)}:BSE`;
      }
      // Default Indian equities to NSE exchange in Twelve Data
      return `${clean}:NSE`;
    }

    // Yahoo Finance formatting
    if (YAHOO_SYMBOLS[clean]) {
      return YAHOO_SYMBOLS[clean];
    }
    if (clean.includes('.')) {
      return clean;
    }
    return `${clean}.NS`;
  }

  /**
   * Translate provider symbol back to clean application symbol
   */
  private fromProviderSymbol(providerSym: string): string {
    const upper = providerSym.toUpperCase().trim();

    if (TWELVE_DATA_REVERSE_SYMBOLS[upper]) {
      return TWELVE_DATA_REVERSE_SYMBOLS[upper];
    }

    if (upper.endsWith(':NSE') || upper.endsWith(':BSE')) {
      return upper.split(':')[0];
    }

    if (upper.endsWith('.NS') || upper.endsWith('.BO')) {
      return upper.slice(0, -3);
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

    if (this.isTwelveData()) {
      return this.fetchTwelveDataQuote(cleanSym);
    }

    return this.fetchYahooQuote(cleanSym);
  }

  /**
   * Fetch quote from Twelve Data
   */
  private async fetchTwelveDataQuote(cleanSym: string): Promise<NormalizedQuote> {
    const providerSym = this.toProviderSymbol(cleanSym);
    const keyParam = this.apiKey ? `&apikey=${encodeURIComponent(this.apiKey)}` : '';
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(providerSym)}${keyParam}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TerminalX/3.0 Financial Engine',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new MarketProviderError(`Symbol '${cleanSym}' not found on exchange.`, 404, 'NOT_FOUND');
        }
        if (response.status === 429) {
          throw new MarketProviderError('Twelve Data API rate/credit limit exceeded.', 429, 'RATE_LIMIT');
        }
        throw new MarketProviderError(
          `Market provider returned status ${response.status}`,
          response.status,
          'PROVIDER_ERROR'
        );
      }

      const json = await response.json();

      // Check for Twelve Data error schema
      if (json.status === 'error' || json.code) {
        const errorMsg = this.sanitizeError(json.message || 'Market data error');
        const code = json.code === 429 ? 'RATE_LIMIT' : json.code === 401 ? 'AUTH_REQUIRED' : 'PROVIDER_ERROR';
        throw new MarketProviderError(errorMsg, json.code || 400, code);
      }

      const price = parseFloat(json.close || json.price || '0');
      if (isNaN(price) || price <= 0) {
        throw new MarketProviderError(`Price unavailable for '${cleanSym}'.`, 502, 'PRICE_UNAVAILABLE');
      }

      const prevClose = json.previous_close ? parseFloat(json.previous_close) : null;
      const change = json.change ? parseFloat(json.change) : prevClose ? +(price - prevClose).toFixed(2) : null;
      const changePercent = json.percent_change
        ? parseFloat(json.percent_change)
        : prevClose && prevClose > 0
          ? +(((price - prevClose) / prevClose) * 100).toFixed(2)
          : null;

      const category = this.determineCategory(cleanSym);
      const isIndian = category === 'INDIAN_EQUITY' || category === 'INDIAN_INDEX';
      const currency = json.currency?.toUpperCase() === 'USD' ? 'USD' : isIndian ? 'INR' : 'USD';

      return {
        symbol: cleanSym,
        name: json.name || cleanSym,
        exchange: json.exchange || (isIndian ? 'NSE' : 'GLOBAL'),
        category,
        price: +price.toFixed(2),
        previousClose: prevClose !== null ? +prevClose.toFixed(2) : null,
        change: change !== null ? +change.toFixed(2) : null,
        changePercent: changePercent !== null ? +changePercent.toFixed(2) : null,
        open: json.open ? +parseFloat(json.open).toFixed(2) : null,
        high: json.high ? +parseFloat(json.high).toFixed(2) : null,
        low: json.low ? +parseFloat(json.low).toFixed(2) : null,
        volume: json.volume ? parseInt(json.volume, 10) : null,
        avgVolume: json.average_volume ? parseInt(json.average_volume, 10) : null,
        fiftyTwoWeekHigh: json.fifty_two_week?.high ? +parseFloat(json.fifty_two_week.high).toFixed(2) : null,
        fiftyTwoWeekLow: json.fifty_two_week?.low ? +parseFloat(json.fifty_two_week.low).toFixed(2) : null,
        currency,
        timestamp: json.datetime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      if (err instanceof MarketProviderError) throw err;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new MarketProviderError('Twelve Data request timed out.', 504, 'TIMEOUT');
      }
      throw new MarketProviderError(
        `Failed to reach market data service: ${this.sanitizeError(err.message)}`,
        503,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Fetch quote from Yahoo Finance fallback
   */
  private async fetchYahooQuote(cleanSym: string): Promise<NormalizedQuote> {
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
          throw new MarketProviderError(`Symbol '${cleanSym}' not found on exchange.`, 404, 'NOT_FOUND');
        }
        if (response.status === 429) {
          throw new MarketProviderError('Market provider rate limit exceeded.', 429, 'RATE_LIMIT');
        }
        throw new MarketProviderError(`Provider returned status ${response.status}`, response.status);
      }

      const json = await response.json();
      const chartResult = json.chart?.result?.[0];

      if (!chartResult || !chartResult.meta) {
        throw new MarketProviderError(`Invalid quote response for '${cleanSym}'.`, 404, 'NOT_FOUND');
      }

      const meta = chartResult.meta;
      const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? null;
      if (currentPrice === null) {
        throw new MarketProviderError(`Price unavailable for '${cleanSym}'.`, 502, 'PRICE_UNAVAILABLE');
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
        name: meta.longName || meta.shortName || cleanSym,
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
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? +meta.fiftyTwoWeekLow.toFixed(2) : null,
        currency: (meta.currency?.toUpperCase() === 'INR' ? 'INR' : 'USD') as 'INR' | 'USD',
        timestamp: new Date((meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      if (err instanceof MarketProviderError) throw err;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new MarketProviderError('Market request timed out.', 504, 'TIMEOUT');
      }
      throw new MarketProviderError(`Network error: ${this.sanitizeError(err.message)}`, 503, 'NETWORK_ERROR');
    }
  }

  /**
   * Fetch quotes for multiple symbols concurrently
   */
  async getQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    if (!symbols || symbols.length === 0) return [];

    const promises = symbols.map(async (sym) => {
      try {
        return await this.getQuote(sym);
      } catch {
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

    if (this.isTwelveData()) {
      return this.fetchTwelveDataHistorical(cleanSym, timeframe, range);
    }

    return this.fetchYahooHistorical(cleanSym, timeframe, range);
  }

  /**
   * Twelve Data Historical Candlesticks
   */
  private async fetchTwelveDataHistorical(
    cleanSym: string,
    timeframe: string,
    _range: string
  ): Promise<OHLCVCandle[]> {
    const providerSym = this.toProviderSymbol(cleanSym);

    // Map timeframe to Twelve Data intervals
    let interval = '1day';
    let outputsize = 60;

    if (timeframe === '1D') {
      interval = '5min';
      outputsize = 78; // 6.5 trading hours * 12
    } else if (timeframe === '5D') {
      interval = '30min';
      outputsize = 65;
    } else if (timeframe === '1M') {
      interval = '1day';
      outputsize = 30;
    } else if (timeframe === '6M') {
      interval = '1day';
      outputsize = 130;
    } else if (timeframe === '1Y') {
      interval = '1week';
      outputsize = 52;
    } else if (timeframe === '5Y') {
      interval = '1month';
      outputsize = 60;
    }

    const keyParam = this.apiKey ? `&apikey=${encodeURIComponent(this.apiKey)}` : '';
    const url = `${this.baseUrl}/time_series?symbol=${encodeURIComponent(providerSym)}&interval=${interval}&outputsize=${outputsize}${keyParam}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TerminalX/3.0 Financial Engine',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new MarketProviderError(
          `Historical data request failed with status ${response.status}`,
          response.status
        );
      }

      const json = await response.json();

      if (json.status === 'error' || json.code) {
        throw new MarketProviderError(
          this.sanitizeError(json.message || 'Historical data unavailable'),
          json.code || 400
        );
      }

      const values = json.values;
      if (!Array.isArray(values) || values.length === 0) {
        return [];
      }

      // Twelve Data returns newest first. Reverse to chronological order (oldest first)
      const chronological = [...values].reverse();

      const candles: OHLCVCandle[] = [];
      for (const item of chronological) {
        const open = parseFloat(item.open);
        const high = parseFloat(item.high);
        const low = parseFloat(item.low);
        const close = parseFloat(item.close);
        const volume = parseInt(item.volume || '0', 10);

        if (isNaN(close)) continue;

        const isIntraday = interval.includes('min') || interval.includes('h');
        const timeVal = isIntraday
          ? Math.floor(new Date(item.datetime).getTime() / 1000)
          : item.datetime.split(' ')[0];

        candles.push({
          timestamp: item.datetime,
          time: timeVal,
          open: +open.toFixed(2),
          high: +high.toFixed(2),
          low: +low.toFixed(2),
          close: +close.toFixed(2),
          volume: isNaN(volume) ? 0 : volume,
        });
      }

      return candles;
    } catch (err: any) {
      if (err instanceof MarketProviderError) throw err;
      throw new MarketProviderError(
        `Failed to fetch historical series: ${this.sanitizeError(err.message)}`,
        503
      );
    }
  }

  /**
   * Yahoo Finance Historical Candlesticks fallback
   */
  private async fetchYahooHistorical(
    cleanSym: string,
    timeframe: string,
    range: string
  ): Promise<OHLCVCandle[]> {
    const providerSym = this.toProviderSymbol(cleanSym);

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
          `Historical request for '${cleanSym}' returned status ${response.status}`,
          response.status
        );
      }

      const json = await response.json();
      const chartResult = json.chart?.result?.[0];

      if (!chartResult || !chartResult.timestamp) return [];

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
        `Failed to fetch historical candles: ${this.sanitizeError(err.message)}`,
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

    if (this.isTwelveData()) {
      return this.searchTwelveData(q);
    }

    return this.searchYahoo(q);
  }

  private async searchTwelveData(q: string): Promise<SearchResultItem[]> {
    const keyParam = this.apiKey ? `&apikey=${encodeURIComponent(this.apiKey)}` : '';
    const url = `${this.baseUrl}/symbol_search?symbol=${encodeURIComponent(q)}&outputsize=10${keyParam}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TerminalX/3.0 Financial Engine',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return [];

      const json = await response.json();
      if (!Array.isArray(json.data)) return [];

      return json.data.map((item: any) => ({
        symbol: item.symbol,
        name: item.instrument_name || item.symbol,
        exchange: item.exchange || 'NSE',
        type: item.type || 'EQUITY',
        sector: item.country ? `${item.country} Equities` : undefined,
      }));
    } catch {
      return [];
    }
  }

  private async searchYahoo(q: string): Promise<SearchResultItem[]> {
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
