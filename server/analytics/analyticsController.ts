/**
 * TerminalX - Analytics Controller
 * Secure request handlers for portfolio performance, equity curves,
 * risk metrics, asset allocation, trade statistics, and benchmark comparison.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { portfolioAnalyticsService } from './portfolioAnalyticsService.ts';
import { performanceAnalyticsService } from './performanceAnalyticsService.ts';
import { riskAnalyticsService } from './riskAnalyticsService.ts';

export const analyticsController = {
  /**
   * GET /api/analytics/portfolio
   * Real-time portfolio KPI summary and mark-to-market valuations
   */
  async getPortfolioAnalytics(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const summary = await portfolioAnalyticsService.getPortfolioSummary(userId);
      return res.json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      console.error('[AnalyticsController getPortfolioAnalytics error]:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'Failed to calculate portfolio analytics' });
    }
  },

  /**
   * GET /api/analytics/performance?range=1M
   * Portfolio equity curve and returns over time
   */
  async getPerformanceHistory(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const range = (req.query.range as string) || '1M';
      const history = await performanceAnalyticsService.getPerformanceHistory(userId, range);

      return res.json({
        success: true,
        range: range.toUpperCase(),
        count: history.length,
        data: history,
      });
    } catch (err: any) {
      console.error('[AnalyticsController getPerformanceHistory error]:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch performance history' });
    }
  },

  /**
   * GET /api/analytics/risk
   * Quantitative risk parameters: Volatility, Sharpe, Drawdown, Beta, Alpha, VaR
   */
  async getRiskMetrics(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const risk = await riskAnalyticsService.getRiskMetrics(userId);
      return res.json({
        success: true,
        data: risk,
      });
    } catch (err: any) {
      console.error('[AnalyticsController getRiskMetrics error]:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'Failed to calculate risk metrics' });
    }
  },

  /**
   * GET /api/analytics/allocation
   * Asset class, individual security, and sector exposure breakdown
   */
  async getAllocation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const allocation = await riskAnalyticsService.getAllocation(userId);
      return res.json({
        success: true,
        data: allocation,
      });
    } catch (err: any) {
      console.error('[AnalyticsController getAllocation error]:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'Failed to calculate portfolio allocation' });
    }
  },

  /**
   * GET /api/analytics/trades
   * Execution statistics and win/loss ratio from completed trades
   */
  async getTradeAnalytics(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const trades = await riskAnalyticsService.getTradeAnalytics(userId);
      return res.json({
        success: true,
        data: trades,
      });
    } catch (err: any) {
      console.error('[AnalyticsController getTradeAnalytics error]:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'Failed to calculate trade analytics' });
    }
  },

  /**
   * GET /api/analytics/benchmark?range=1M
   * Normalized rebased comparison against NIFTY 50 benchmark
   */
  async getBenchmarkComparison(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const range = (req.query.range as string) || '1M';
      const benchmark = await performanceAnalyticsService.getBenchmarkComparison(userId, range);

      return res.json({
        success: true,
        data: benchmark,
      });
    } catch (err: any) {
      console.error('[AnalyticsController getBenchmarkComparison error]:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'Failed to compute benchmark comparison' });
    }
  },
};
