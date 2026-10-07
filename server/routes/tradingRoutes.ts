import { Router } from 'express';
import { tradingController } from '../controllers/tradingController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { tradingRateLimiter } from '../middleware/rateLimitMiddleware.ts';

const router = Router();

// Protect all trading routes
router.use(requireAuth as any);

router.get('/portfolio', tradingController.getPortfolio as any);
router.get('/holdings', tradingController.getHoldings as any);
router.get('/orders', tradingController.getOrders as any);
router.post('/order', tradingRateLimiter as any, tradingController.placeOrder as any);
router.post('/reset', tradingController.resetPortfolio as any);
router.get('/watchlists', tradingController.getWatchlists as any);
router.post('/watchlist', tradingController.updateWatchlist as any);
router.get('/transactions', tradingController.getTransactions as any);

export default router;
