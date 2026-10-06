/**
 * TerminalX - Financial News Routes
 * Endpoints for broad market dispatches, keyword searches, symbol feeds, and personalized portfolio news.
 */

import { Router } from 'express';
import { newsController } from './newsController.ts';
import { authenticateToken } from '../middleware/authMiddleware.ts';

const router = Router();

// Public news endpoints
router.get('/', (req, res) => newsController.getNews(req, res));
router.get('/market', (req, res) => newsController.getMarketNews(req, res));
router.get('/search', (req, res) => newsController.searchNews(req, res));
router.get('/provider', (req, res) => newsController.getProviderStatus(req, res));
router.post('/provider', (req, res) => newsController.setProviderMode(req, res));

// Authenticated portfolio news endpoint (MUST be before /:id)
router.get('/portfolio', authenticateToken, (req, res) => newsController.getPortfolioNews(req as any, res));

// Specific symbol feed (support both /symbol/:symbol and /company/:symbol)
router.get('/symbol/:symbol', (req, res) => newsController.getCompanyNews(req, res));
router.get('/company/:symbol', (req, res) => newsController.getCompanyNews(req, res));

// Single article detail
router.get('/:id', (req, res) => newsController.getArticleById(req, res));

export default router;
