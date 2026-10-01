/**
 * TerminalX - AI Controller
 * Request handlers for AI financial intelligence queries, context inspection, and status.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { aiService } from './aiService.ts';

export class AIController {
  /**
   * POST /api/ai/chat
   * Generate conversational or structured financial intelligence response
   */
  public async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: missing authentication session' });
        return;
      }

      const { message, history } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ success: false, error: 'Query message is required' });
        return;
      }

      const cleanHistory = Array.isArray(history)
        ? history.filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        : [];

      const result = await aiService.chat(userId, message.trim(), cleanHistory);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[AIController.chat] error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal financial intelligence error',
      });
    }
  }

  /**
   * GET /api/ai/context
   * Retrieve the exact structured quantitative data being provided to AI
   */
  public async getContext(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: missing authentication session' });
        return;
      }

      const context = await aiService.getContext(userId);

      res.json({
        success: true,
        data: context,
      });
    } catch (error: any) {
      console.error('[AIController.getContext] error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to assemble AI context',
      });
    }
  }

  /**
   * GET /api/ai/status
   * Status and active provider capability check
   */
  public async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = aiService.getStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('[AIController.getStatus] error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check AI status',
      });
    }
  }

  /**
   * GET /api/ai/prompts
   * Retrieve curated institutional shortcut prompts
   */
  public async getPrompts(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prompts = aiService.getPromptShortcuts();
      res.json({
        success: true,
        data: prompts,
      });
    } catch (error: any) {
      console.error('[AIController.getPrompts] error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve prompt templates',
      });
    }
  }
}

export const aiController = new AIController();
