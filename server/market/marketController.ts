/**
 * TerminalX - Market API Controller
 * Provides standardized REST endpoints for quotes, charts, order book, and search.
 */

import { Request, Response } from 'express';
import { unifiedMarketService } from './marketService.ts';
import { MarketProviderError } from './providers/MarketDataProvider.ts';

export const marketController = {
  /**
   * GET /api/markets/quote/:symbol
   */
  async getQuote(req: Request, res: Response): Promise<Response> {
    try {
      const { symbol } = req.params;
      const cleanSymbol = typeof symbol === 'string' ? symbol.toUpperCase().trim() : '';
      if (!cleanSymbol || cleanSymbol.length > 25 || !/^[A-Z0-9\s.\-]+$/.test(cleanSymbol)) {
        return res.status(400).json({ success: false, error: 'Valid ticker symbol is required (max 25 characters).' });
      }

      const quote = await unifiedMarketService.getQuote(cleanSymbol);
      return res.json({
        success: true,
        data: quote,
        provider: unifiedMarketService.getMode(),
      });
    } catch (err: any) {
      const statusCode = err instanceof MarketProviderError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Market quote unavailable.',
        code: err.code || 'QUOTE_ERROR',
        provider: unifiedMarketService.getMode(),
      });
    }
  },

  /**
   * GET /api/markets/quotes?symbols=RELIANCE,TCS,INFY
   */
  async getQuotes(req: Request, res: Response): Promise<Response> {
    try {
      const symbolsQuery = req.query.symbols as string | undefined;
      const symbols = symbolsQuery
        ? symbolsQuery
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length > 0 && s.length <= 25 && /^[A-Z0-9\s.\-]+$/.test(s))
            .slice(0, 50)
        : undefined;

      const quotes = await unifiedMarketService.getQuotes(symbols);
      return res.json({
        success: true,
        count: quotes.length,
        data: quotes,
        provider: unifiedMarketService.getMode(),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to fetch quotes.',
        provider: unifiedMarketService.getMode(),
      });
    }
  },

  /**
   * GET /api/markets/history/:symbol?range=1M&timeframe=1D
   */
  async getHistoricalData(req: Request, res: Response): Promise<Response> {
    try {
      const { symbol } = req.params;
      const cleanSymbol = typeof symbol === 'string' ? symbol.toUpperCase().trim() : '';
      if (!cleanSymbol || cleanSymbol.length > 25 || !/^[A-Z0-9\s.\-]+$/.test(cleanSymbol)) {
        return res.status(400).json({ success: false, error: 'Valid ticker symbol is required.' });
      }

      const validRanges = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];
      const validTimeframes = ['1m', '5m', '15m', '30m', '1H', '1D', '1W', '1M'];

      const requestedTimeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : '1D';
      const requestedRange = typeof req.query.range === 'string' ? req.query.range : '1M';

      const timeframe = validTimeframes.includes(requestedTimeframe) ? requestedTimeframe : '1D';
      const range = validRanges.includes(requestedRange) ? requestedRange : '1M';

      const candles = await unifiedMarketService.getHistoricalData(cleanSymbol, timeframe, range);
      return res.json({
        success: true,
        symbol: cleanSymbol,
        timeframe,
        range,
        count: candles.length,
        data: candles,
        provider: unifiedMarketService.getMode(),
      });
    } catch (err: any) {
      const statusCode = err instanceof MarketProviderError ? err.statusCode : 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Historical data unavailable.',
        provider: unifiedMarketService.getMode(),
      });
    }
  },

  /**
   * GET /api/markets/search?q=reliance
   */
  async search(req: Request, res: Response): Promise<Response> {
    try {
      const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
      const query = rawQuery.trim().slice(0, 100);
      const results = await unifiedMarketService.search(query);
      return res.json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Search failed.',
      });
    }
  },

  /**
   * GET /api/markets/orderbook/:symbol
   */
  async getOrderBook(req: Request, res: Response): Promise<Response> {
    try {
      const { symbol } = req.params;
      const cleanSymbol = typeof symbol === 'string' ? symbol.toUpperCase().trim() : '';
      if (!cleanSymbol || cleanSymbol.length > 25 || !/^[A-Z0-9\s.\-]+$/.test(cleanSymbol)) {
        return res.status(400).json({ success: false, error: 'Valid ticker symbol is required.' });
      }

      const orderBook = await unifiedMarketService.getOrderBook(cleanSymbol);
      return res.json({
        success: true,
        data: orderBook,
        provider: unifiedMarketService.getMode(),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Order book depth unavailable.',
      });
    }
  },

  /**
   * GET /api/markets/overview
   */
  async getOverview(_req: Request, res: Response): Promise<Response> {
    try {
      const overview = await unifiedMarketService.getMarketOverview();
      return res.json({
        success: true,
        data: overview,
        provider: unifiedMarketService.getMode(),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Market overview unavailable.',
      });
    }
  },

  /**
   * GET /api/markets/news
   */
  getNews(req: Request, res: Response): Response {
    try {
      const symbol = req.query.symbol as string | undefined;
      const news = unifiedMarketService.getNews(symbol);
      return res.json({
        success: true,
        count: news.length,
        data: news,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'News unavailable.',
      });
    }
  },

  /**
   * GET /api/markets/provider
   */
  getProviderStatus(_req: Request, res: Response): Response {
    const mode = unifiedMarketService.getMode();
    const provider = unifiedMarketService.getActiveProvider();
    return res.json({
      success: true,
      provider: mode,
      name: provider.name,
    });
  },

  /**
   * POST /api/markets/provider
   * Body: { provider: 'demo' | 'real' }
   */
  setProviderMode(req: Request, res: Response): Response {
    const { provider } = req.body;
    if (provider !== 'demo' && provider !== 'real') {
      return res.status(400).json({
        success: false,
        error: "Provider must be either 'demo' or 'real'.",
      });
    }

    unifiedMarketService.setMode(provider);
    return res.json({
      success: true,
      message: `Market data provider switched to ${provider.toUpperCase()}.`,
      provider,
      name: unifiedMarketService.getActiveProvider().name,
    });
  },
};
