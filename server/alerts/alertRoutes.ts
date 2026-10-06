/**
 * TerminalX - Alert & Automation API Routes
 * Endpoints for managing alert configurations, real-time evaluation, and notification streams.
 */

import { Router } from 'express';
import { alertController } from './alertController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

// Protect all alert routes with JWT authentication
router.use(requireAuth);

// Notifications subroutes (declared before parameterized :id routes to prevent collision)
router.get('/notifications', (req, res) => alertController.getNotifications(req, res));
router.get('/notifications/unread-count', (req, res) => alertController.getUnreadCount(req, res));
router.post('/notifications/read-all', (req, res) => alertController.markAllNotificationsRead(req, res));
router.delete('/notifications', (req, res) => alertController.clearNotifications(req, res));
router.patch('/notifications/:id/read', (req, res) => alertController.markNotificationRead(req, res));
router.delete('/notifications/:id', (req, res) => alertController.deleteNotification(req, res));

// Global evaluation
router.post('/evaluate', (req, res) => alertController.evaluateUserAlerts(req, res));

// Alert CRUD routes
router.get('/', (req, res) => alertController.getAlerts(req, res));
router.post('/', (req, res) => alertController.createAlert(req, res));
router.get('/:id', (req, res) => alertController.getAlertById(req, res));
router.put('/:id', (req, res) => alertController.updateAlert(req, res));
router.patch('/:id/toggle', (req, res) => alertController.toggleAlert(req, res));
router.delete('/:id', (req, res) => alertController.deleteAlert(req, res));
router.post('/:id/evaluate', (req, res) => alertController.evaluateSingleAlert(req, res));

export default router;
