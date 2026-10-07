/**
 * TerminalX - AI Financial Intelligence Routes
 * Authenticated endpoints for conversational financial analysis and context transparency.
 */

import { Router } from 'express';
import { aiController } from './aiController.ts';
import { authenticateToken } from '../middleware/authMiddleware.ts';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.ts';

const router = Router();

// Protect all AI intelligence endpoints with token authentication
router.use(authenticateToken);

router.post('/chat', aiRateLimiter as any, aiController.chat);
router.get('/context', aiController.getContext);
router.get('/status', aiController.getStatus);
router.get('/prompts', aiController.getPrompts);

export default router;
