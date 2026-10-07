import { Router } from 'express';
import { authController } from '../controllers/authController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { authRateLimiter } from '../middleware/rateLimitMiddleware.ts';

const router = Router();

router.post('/register', authRateLimiter as any, authController.register as any);
router.post('/login', authRateLimiter as any, authController.login as any);
router.post('/logout', authController.logout as any);
router.get('/me', requireAuth as any, authController.me as any);

export default router;
