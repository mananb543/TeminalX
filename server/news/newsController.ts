/**
 * TerminalX - Financial News & Event Controller
 * Request handlers for public wire dispatches, entity search, and authenticated portfolio intelligence.
 */

import { Request, Response } from 'express';
import { newsService } from './newsService.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export class NewsController {
  /**
   * GET /api/news
   * Query params: ?limit=20&symbol=RELIANCE&category=MARKET&from=&to=
   */
  async getNews(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const symbol = req.query.symbol as string | undefined;
      const category = req.query.category as string | undefined;

      let articles = symbol
        ? await newsService.getCompanyNews(symbol, limit)
        : await newsService.getMarketNews(limit);

      if (category && category !== 'ALL') {
        const cleanCat = category.toUpperCase().trim();
        articles = articles.filter((a) =>
          a.categories.some((c) => c.toUpperCase() === cleanCat)
        );
      }

      res.json({
        success: true,
        count: articles.length,
        data: articles,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to fetch financial news',
      });
    }
  }

  /**
   * GET /api/news/market
   */
  async getMarketNews(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const articles = await newsService.getMarketNews(limit);

      res.json({
        success: true,
        count: articles.length,
        data: articles,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to fetch market news',
      });
    }
  }

  /**
   * GET /api/news/search?q=reliance
   */
  async searchNews(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.q as string) || (req.query.query as string) || '';
      const limit = Number(req.query.limit) || 20;
      const articles = await newsService.searchNews(query, limit);

      res.json({
        success: true,
        query,
        count: articles.length,
        data: articles,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to search financial news',
      });
    }
  }

  /**
   * GET /api/news/symbol/:symbol
   */
  async getCompanyNews(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const limit = Number(req.query.limit) || 15;
      const articles = await newsService.getCompanyNews(symbol, limit);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        count: articles.length,
        data: articles,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || `Failed to fetch news for ${req.params.symbol}`,
      });
    }
  }

  /**
   * GET /api/news/portfolio
   * Requires Authentication
   */
  async getPortfolioNews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const limit = Number(req.query.limit) || 20;
      const articles = await newsService.getPortfolioNews(userId, limit);

      res.json({
        success: true,
        count: articles.length,
        data: articles,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to fetch portfolio news',
      });
    }
  }

  /**
   * GET /api/news/:id
   */
  async getArticleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const article = await newsService.getArticleById(id);

      if (!article) {
        res.status(404).json({
          success: false,
          error: `News article with ID ${id} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: article,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to retrieve article details',
      });
    }
  }

  /**
   * GET /api/news/provider
   */
  getProviderStatus(_req: Request, res: Response): void {
    const provider = newsService.getActiveProvider();
    res.json({
      success: true,
      mode: newsService.getMode(),
      providerName: provider.name,
    });
  }

  /**
   * POST /api/news/provider
   */
  setProviderMode(req: Request, res: Response): void {
    const mode = req.body?.mode;
    if (mode !== 'demo' && mode !== 'real') {
      res.status(400).json({
        success: false,
        error: 'Invalid mode. Supported values: "demo", "real"',
      });
      return;
    }

    newsService.setMode(mode);
    res.json({
      success: true,
      mode,
      providerName: newsService.getActiveProvider().name,
      message: `News provider mode successfully switched to ${mode}.`,
    });
  }

  // ---------------- EVENT HANDLERS ----------------

  /**
   * GET /api/events
   */
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const symbol = req.query.symbol as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const events = await newsService.getEvents({ limit, symbol, from, to });

      res.json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to fetch market events',
      });
    }
  }

  /**
   * GET /api/events/upcoming
   */
  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const events = await newsService.getUpcomingEvents(limit);

      res.json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to fetch upcoming events',
      });
    }
  }

  /**
   * GET /api/events/symbol/:symbol
   */
  async getCompanyEvents(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const events = await newsService.getCompanyEvents(symbol);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        count: events.length,
        data: events,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || `Failed to fetch events for ${req.params.symbol}`,
      });
    }
  }

  /**
   * GET /api/events/portfolio
   * Requires Authentication
   */
  async getPortfolioEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const events = await newsService.getPortfolioEvents(userId);

      res.json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to fetch portfolio corporate events',
      });
    }
  }
}

export const newsController = new NewsController();
