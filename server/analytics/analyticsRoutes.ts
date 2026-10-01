/**
 * TerminalX - Analytics API Routes
 * Authenticated endpoints for quantitative portfolio and risk metrics.
 */

import { Router } from 'express';
import { analyticsController } from './analyticsController.ts';
import { authenticateToken } from '../middleware/authMiddleware.ts';

const router = Router();

// Enforce authentication on all analytics endpoints: users can only access their own analytics
router.use(authenticateToken);

router.get('/portfolio', analyticsController.getPortfolioAnalytics);
router.get('/performance', analyticsController.getPerformanceHistory);
router.get('/risk', analyticsController.getRiskMetrics);
router.get('/allocation', analyticsController.getAllocation);
router.get('/trades', analyticsController.getTradeAnalytics);
router.get('/benchmark', analyticsController.getBenchmarkComparison);

export default router;
