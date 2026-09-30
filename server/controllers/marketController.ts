/**
 * TerminalX - Market Controller
 * Request handlers for real-time quotes, charts, order book depth, and market overviews
 */

import { Request, Response } from 'express';
import { marketService } from '../services/marketService.ts';

export const marketController = {
  getQuote(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      if (!symbol) {
        return res.status(400).json({ error: 'Ticker symbol is required' });
      }
      const quote = marketService.getQuote(symbol);
      if (!quote) {
        return res.status(404).json({ error: `Quote for ${symbol} not found` });
      }
      return res.json({ success: true, data: quote });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  },

  getAllQuotes(req: Request, res: Response) {
    try {
      const quotes = marketService.getAllQuotes();
      return res.json({ success: true, count: quotes.length, data: quotes });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  getHistoricalData(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      const timeframe = (req.query.timeframe as string) || '1D';
      const candles = marketService.getHistoricalData(symbol, timeframe);
      return res.json({ success: true, symbol, timeframe, count: candles.length, data: candles });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  getOrderBook(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      const orderBook = marketService.getOrderBook(symbol);
      return res.json({ success: true, data: orderBook });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  getMarketOverview(req: Request, res: Response) {
    try {
      const overview = marketService.getMarketOverview();
      return res.json({ success: true, data: overview });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  getNews(req: Request, res: Response) {
    try {
      const symbol = req.query.symbol as string | undefined;
      const news = marketService.getNews(symbol);
      return res.json({ success: true, count: news.length, data: news });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
};
