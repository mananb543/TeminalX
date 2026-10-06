/**
 * TerminalX - Alert Controller
 * HTTP request handlers for alert configuration, manual evaluation, and notification feeds.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { alertService } from './alertService.ts';
import { notificationService } from './notificationService.ts';
import { AlertType, AlertOperator } from './alertTypes.ts';

const VALID_ALERT_TYPES: AlertType[] = [
  'PRICE',
  'PRICE_CHANGE',
  'PORTFOLIO_PNL',
  'PORTFOLIO_DRAWDOWN',
  'RISK',
  'WATCHLIST',
  'NEWS',
  'EVENT',
];

const VALID_OPERATORS: AlertOperator[] = [
  'GREATER_THAN',
  'LESS_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL',
  'EQUALS',
  'CROSSES_ABOVE',
  'CROSSES_BELOW',
];

export class AlertController {
  /**
   * GET /api/alerts - List all alerts for the authenticated user
   */
  public async getAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const enabledParam = req.query.enabled;
      const typeParam = req.query.type as AlertType | undefined;
      const symbolParam = req.query.symbol as string | undefined;

      const filter: { enabled?: boolean; type?: AlertType; symbol?: string } = {};
      if (enabledParam !== undefined) {
        filter.enabled = enabledParam === 'true';
      }
      if (typeParam && VALID_ALERT_TYPES.includes(typeParam)) {
        filter.type = typeParam;
      }
      if (symbolParam) {
        filter.symbol = symbolParam;
      }

      const alerts = await alertService.getAlerts(userId, filter);

      res.json({
        success: true,
        count: alerts.length,
        alerts,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alerts',
        details: err.message,
      });
    }
  }

  /**
   * POST /api/alerts - Create a new alert
   */
  public async createAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const {
        name,
        type,
        symbol,
        condition,
        operator,
        threshold,
        secondaryThreshold,
        timeframe,
        enabled,
        cooldownMinutes,
        notificationChannels,
        metadata,
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: 'Alert name is required' });
        return;
      }

      if (!type || !VALID_ALERT_TYPES.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid alert type. Allowed types: ${VALID_ALERT_TYPES.join(', ')}`,
        });
        return;
      }

      if (!operator || !VALID_OPERATORS.includes(operator)) {
        res.status(400).json({
          success: false,
          error: `Invalid operator. Allowed operators: ${VALID_OPERATORS.join(', ')}`,
        });
        return;
      }

      if (threshold === undefined || isNaN(Number(threshold))) {
        res.status(400).json({ success: false, error: 'A valid numeric threshold is required' });
        return;
      }

      if (['PRICE', 'PRICE_CHANGE'].includes(type) && (!symbol || !symbol.trim())) {
        res.status(400).json({
          success: false,
          error: 'A ticker symbol is required for Price and Price Change alerts',
        });
        return;
      }

      const alert = await alertService.createAlert(userId, {
        name: name.trim(),
        type,
        symbol,
        condition,
        operator,
        threshold: Number(threshold),
        secondaryThreshold: secondaryThreshold !== undefined ? Number(secondaryThreshold) : undefined,
        timeframe,
        enabled,
        cooldownMinutes: cooldownMinutes ? Number(cooldownMinutes) : 60,
        notificationChannels,
        metadata,
      });

      res.status(201).json({
        success: true,
        alert,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to create alert',
        details: err.message,
      });
    }
  }

  /**
   * GET /api/alerts/:id - Get single alert
   */
  public async getAlertById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const alert = await alertService.getAlertById(id, userId);
      if (!alert) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert',
        details: err.message,
      });
    }
  }

  /**
   * PUT /api/alerts/:id - Update an existing alert
   */
  public async updateAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const updates = req.body;

      if (updates.type && !VALID_ALERT_TYPES.includes(updates.type)) {
        res.status(400).json({ success: false, error: 'Invalid alert type' });
        return;
      }
      if (updates.operator && !VALID_OPERATORS.includes(updates.operator)) {
        res.status(400).json({ success: false, error: 'Invalid operator' });
        return;
      }
      if (updates.threshold !== undefined && isNaN(Number(updates.threshold))) {
        res.status(400).json({ success: false, error: 'Threshold must be a valid number' });
        return;
      }

      const updated = await alertService.updateAlert(id, userId, updates);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      res.json({ success: true, alert: updated });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to update alert',
        details: err.message,
      });
    }
  }

  /**
   * PATCH /api/alerts/:id/toggle - Toggle alert enabled/disabled
   */
  public async toggleAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { enabled } = req.body;

      const updated = await alertService.toggleAlert(id, userId, enabled);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      res.json({
        success: true,
        alert: updated,
        message: `Alert ${updated.enabled ? 'activated' : 'paused'} successfully`,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to toggle alert',
        details: err.message,
      });
    }
  }

  /**
   * DELETE /api/alerts/:id - Delete an alert
   */
  public async deleteAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const deleted = await alertService.deleteAlert(id, userId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      res.json({ success: true, message: 'Alert deleted successfully' });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert',
        details: err.message,
      });
    }
  }

  /**
   * POST /api/alerts/evaluate - Manually trigger evaluation for user's alerts
   */
  public async evaluateUserAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const outcome = await alertService.evaluateUserAlerts(userId);

      res.json({
        success: true,
        ...outcome,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate alerts',
        details: err.message,
      });
    }
  }

  /**
   * POST /api/alerts/:id/evaluate - Evaluate a single specific alert
   */
  public async evaluateSingleAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const result = await alertService.evaluateAlert(id, userId);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate alert',
        details: err.message,
      });
    }
  }

  // ---------------- NOTIFICATION / EVENT HISTORY HANDLERS ----------------

  /**
   * GET /api/alerts/notifications - Get user's triggered alert history
   */
  public async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const readParam = req.query.read;
      const limitParam = req.query.limit ? Number(req.query.limit) : 50;

      const filter: { read?: boolean; limit?: number } = { limit: limitParam };
      if (readParam !== undefined) {
        filter.read = readParam === 'true';
      }

      const [notifications, unreadCount] = await Promise.all([
        notificationService.getNotifications(userId, filter),
        notificationService.getUnreadCount(userId),
      ]);

      res.json({
        success: true,
        count: notifications.length,
        unreadCount,
        notifications,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve notifications',
        details: err.message,
      });
    }
  }

  /**
   * GET /api/alerts/notifications/unread-count
   */
  public async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const unreadCount = await notificationService.getUnreadCount(userId);

      res.json({ success: true, unreadCount });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to count unread notifications',
        details: err.message,
      });
    }
  }

  /**
   * PATCH /api/alerts/notifications/:id/read - Mark single notification as read
   */
  public async markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const success = await notificationService.markAsRead(id, userId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to update notification',
        details: err.message,
      });
    }
  }

  /**
   * POST /api/alerts/notifications/read-all - Mark all notifications as read
   */
  public async markAllNotificationsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const count = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        markedCount: count,
        message: 'All notifications marked as read',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to mark all as read',
        details: err.message,
      });
    }
  }

  /**
   * DELETE /api/alerts/notifications/:id - Delete single notification
   */
  public async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const success = await notificationService.deleteNotification(id, userId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        details: err.message,
      });
    }
  }

  /**
   * DELETE /api/alerts/notifications - Clear all notification history
   */
  public async clearNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const cleared = await notificationService.clearAllNotifications(userId);

      res.json({
        success: true,
        clearedCount: cleared,
        message: 'All notifications cleared successfully',
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to clear notifications',
        details: err.message,
      });
    }
  }
}

export const alertController = new AlertController();
