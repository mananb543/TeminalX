import { Router } from 'express';
import { authController } from '../controllers/authController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

router.post('/register', authController.register as any);
router.post('/login', authController.login as any);
router.post('/logout', authController.logout as any);
router.get('/me', requireAuth as any, authController.me as any);

export default router;
