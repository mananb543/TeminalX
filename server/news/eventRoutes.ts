/**
 * TerminalX - Market Event Intelligence Routes
 * Corporate actions, earnings dates, dividends, board meetings, and economic events.
 */

import { Router } from 'express';
import { newsController } from './newsController.ts';
import { authenticateToken } from '../middleware/authMiddleware.ts';

const router = Router();

// Public event calendar endpoints
router.get('/', (req, res) => newsController.getEvents(req, res));
router.get('/upcoming', (req, res) => newsController.getUpcomingEvents(req, res));

// Authenticated portfolio events endpoint (MUST be before /symbol/:symbol)
router.get('/portfolio', authenticateToken, (req, res) => newsController.getPortfolioEvents(req as any, res));

// Symbol-specific event calendar
router.get('/symbol/:symbol', (req, res) => newsController.getCompanyEvents(req, res));

export default router;
