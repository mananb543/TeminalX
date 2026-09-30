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
      if (!symbol) {
        return res.status(400).json({ success: false, error: 'Ticker symbol is required.' });
      }

      const quote = await unifiedMarketService.getQuote(symbol);
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
        ? symbolsQuery.split(',').map((s) => s.trim()).filter(Boolean)
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
      if (!symbol) {
        return res.status(400).json({ success: false, error: 'Symbol is required.' });
      }

      const timeframe = (req.query.timeframe as string) || '1D';
      const range = (req.query.range as string) || '1M';

      const candles = await unifiedMarketService.getHistoricalData(symbol, timeframe, range);
      return res.json({
        success: true,
        symbol: symbol.toUpperCase().trim(),
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
      const query = (req.query.q as string) || '';
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
      if (!symbol) {
        return res.status(400).json({ success: false, error: 'Symbol is required.' });
      }

      const orderBook = await unifiedMarketService.getOrderBook(symbol);
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
