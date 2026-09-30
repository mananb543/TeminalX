/**
 * TerminalX - Market Routes
 */

import { Router } from 'express';
import { marketController } from './marketController.ts';

const router = Router();

router.get('/overview', marketController.getOverview);
router.get('/quotes', marketController.getQuotes);
router.get('/quote/:symbol', marketController.getQuote);
router.get('/quotes/:symbol', marketController.getQuote); // backward-compatible alias
router.get('/history/:symbol', marketController.getHistoricalData);
router.get('/search', marketController.search);
router.get('/orderbook/:symbol', marketController.getOrderBook);
router.get('/news', marketController.getNews);
router.get('/provider', marketController.getProviderStatus);
router.post('/provider', marketController.setProviderMode);

export default router;
